import { C } from '@/lib/design-tokens'

export function SourceBadge({ source }: { source: string }) {
  const isClaude = source === 'claude'
  const color = isClaude ? C.orange : C.emerald
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 4,
        background: `${color}18`,
        color,
        letterSpacing: '0.02em',
      }}
    >
      {isClaude ? 'Claude' : 'Codex'}
    </span>
  )
}
