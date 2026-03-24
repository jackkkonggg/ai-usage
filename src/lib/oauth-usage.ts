import { readFileSync, existsSync } from 'fs'
import { execFileSync } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { getDb } from '@/lib/db'
import type { RateLimits, RateLimitBucket } from '@/lib/types'

// ─── Constants ──────────────────────────────────────────────────────────────

const API_URL = 'https://api.anthropic.com/api/oauth/usage'
const BETA_HEADER = 'oauth-2025-04-20'
const CACHE_TTL_MS = 60_000
const CREDENTIALS_PATH = join(homedir(), '.claude', '.credentials.json')

// ─── Schema (managed independently from SCHEMA_VERSION — safe to lose) ──────

let tableCreated = false

export function ensureRateLimitTable(): void {
  if (tableCreated) return
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS rate_limit_cache (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      data_json   TEXT NOT NULL,
      fetched_at  INTEGER NOT NULL
    );
  `)
  tableCreated = true
}

// ─── OAuth Token Resolution ─────────────────────────────────────────────────

function resolveOAuthToken(): string | null {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return process.env.CLAUDE_CODE_OAUTH_TOKEN
  }

  // macOS Keychain
  if (process.platform === 'darwin') {
    try {
      const blob = execFileSync(
        '/usr/bin/security',
        ['find-generic-password', '-s', 'Claude Code-credentials', '-w'],
        { encoding: 'utf-8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] },
      ).trim()
      const parsed = JSON.parse(blob) as { claudeAiOauth?: { accessToken?: string } }
      if (parsed.claudeAiOauth?.accessToken) return parsed.claudeAiOauth.accessToken
    } catch {
      /* not found */
    }
  }

  // Credentials file fallback
  if (existsSync(CREDENTIALS_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8')) as {
        claudeAiOauth?: { accessToken?: string }
      }
      if (parsed.claudeAiOauth?.accessToken) return parsed.claudeAiOauth.accessToken
    } catch {
      /* parse error */
    }
  }

  return null
}

// ─── Raw API Types ──────────────────────────────────────────────────────────

interface RawBucket {
  utilization: number
  resets_at: string
}

interface RawExtraUsage {
  is_enabled: boolean
  monthly_limit: number | null
  used_credits: number | null
  utilization: number | null
}

interface RawUsageResponse {
  five_hour: RawBucket | null
  seven_day: RawBucket | null
  seven_day_sonnet: RawBucket | null
  seven_day_opus: RawBucket | null
  extra_usage: RawExtraUsage | null
}

// ─── Mapping ────────────────────────────────────────────────────────────────

function mapBucket(raw: RawBucket | null): RateLimitBucket | null {
  return raw ? { utilization: raw.utilization, resetsAt: raw.resets_at } : null
}

function mapResponse(raw: RawUsageResponse): RateLimits {
  return {
    fiveHour: mapBucket(raw.five_hour),
    sevenDay: mapBucket(raw.seven_day),
    sevenDaySonnet: mapBucket(raw.seven_day_sonnet),
    sevenDayOpus: mapBucket(raw.seven_day_opus),
    extraUsage: raw.extra_usage
      ? {
          isEnabled: raw.extra_usage.is_enabled,
          monthlyLimit: raw.extra_usage.monthly_limit,
          usedCredits: raw.extra_usage.used_credits,
          utilization: raw.extra_usage.utilization,
        }
      : null,
  }
}

// ─── Fetch + Cache ──────────────────────────────────────────────────────────

function getCachedRateLimits(): RateLimits | null {
  ensureRateLimitTable()
  const db = getDb()
  const row = db
    .prepare('SELECT data_json, fetched_at FROM rate_limit_cache WHERE id = 1')
    .get() as { data_json: string; fetched_at: number } | undefined

  if (!row) return null
  if (Date.now() - row.fetched_at > CACHE_TTL_MS) return null
  try {
    return JSON.parse(row.data_json) as RateLimits
  } catch {
    return null
  }
}

function setCachedRateLimits(data: RateLimits): void {
  ensureRateLimitTable()
  const db = getDb()
  db.prepare(
    `INSERT INTO rate_limit_cache (id, data_json, fetched_at)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, fetched_at = excluded.fetched_at`,
  ).run(JSON.stringify(data), Date.now())
}

async function fetchFromApi(): Promise<RateLimits | null> {
  const token = resolveOAuthToken()
  if (!token) return null

  try {
    const res = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'ai-usage-dashboard/1.0',
        Authorization: `Bearer ${token}`,
        'anthropic-beta': BETA_HEADER,
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.warn(`[oauth-usage] API returned ${res.status}`)
      return null
    }
    const raw = (await res.json()) as RawUsageResponse
    if (!raw.five_hour && !raw.seven_day) return null
    return mapResponse(raw)
  } catch {
    // Do not log the error object — it may contain request headers with the Bearer token
    return null
  }
}

let inflightFetch: Promise<RateLimits | null> | null = null

export async function getRateLimits(): Promise<RateLimits | null> {
  const cached = getCachedRateLimits()
  if (cached) return cached

  if (!inflightFetch) {
    inflightFetch = fetchFromApi().finally(() => {
      inflightFetch = null
    })
  }
  const fresh = await inflightFetch
  if (fresh) setCachedRateLimits(fresh)
  return fresh
}
