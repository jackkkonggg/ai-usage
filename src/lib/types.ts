// ─── Dashboard Types ──────────────────────────────────────────────────────────

export interface Summary {
  totalCost: number
  todayCost: number
  weekCost: number
  monthCost: number
  totalTokens: number
  claudeTurns: number
  codexTurns: number
  totalSessions: number
  claudeFound: boolean
  codexFound: boolean
  totalMessages: number | null
  timeSavedMs: number
  firstSessionDate: string | null
  cacheHitRate: number | null
}

export interface DailyEntry {
  date: string
  claude: { cost: number; tokens: number }
  codex: { cost: number; tokens: number }
}

export interface Session {
  sessionId: string
  source: 'claude' | 'codex'
  date: string
  lastTimestamp?: number
  model: string
  cost: number
  tokens: number
  turns: number
}

export interface ModelStat {
  model: string
  source: string
  cost: number
  tokens: number
  turns: number
}

export interface HourlyEntry {
  hour: number
  label: string
  count: number
}

export interface ProjectStat {
  project: string
  displayName: string
  sessionCount: number
  messageCount: number
  lastActive: string
}

export interface ActivityEntry {
  date: string
  messages: number
  sessions: number
  toolCalls: number
}

// ─── Day Detail Types ─────────────────────────────────────────────────────────

export interface DaySummary {
  totalCost: number
  totalTokens: number
  totalTurns: number
  sessionCount: number
  cacheHitRate: number | null
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

export interface SourceSplit {
  source: string
  cost: number
  tokens: number
  turns: number
}

export interface DayDetail {
  date: string
  summary: DaySummary
  models: ModelStat[]
  sessions: Session[]
  hourly: HourlyEntry[]
  sources: SourceSplit[]
}

// ─── Session Detail Types ────────────────────────────────────────────────────

export interface ToolCall {
  name: string
  summary: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  tools?: ToolCall[]
  kind?: 'command'
}

export interface SessionDetail extends Session {
  filePath: string | null
  project: string | null
  messages: ConversationMessage[]
}

// ─── Project Detail Types ────────────────────────────────────────────────────

export interface ProjectDailyEntry {
  date: string
  claude: number
  codex: number
}

export interface ProjectDetail {
  project: string
  displayName: string
  summary: DaySummary
  models: ModelStat[]
  sessions: Session[]
  daily: ProjectDailyEntry[]
  sources: SourceSplit[]
}
