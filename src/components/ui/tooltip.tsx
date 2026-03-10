'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'

export const TooltipProvider = TooltipPrimitive.Provider
export const TooltipRoot = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export function TooltipContent({
  children,
  side = 'top',
}: {
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side={side}
        sideOffset={6}
        style={{
          maxWidth: 320,
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: 12,
          lineHeight: 1.5,
          background: 'var(--color-surface-tooltip, #1a1a1a)',
          color: 'var(--color-text, #e5e5e5)',
          border: '1px solid var(--color-border, #2e2e2e)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          wordBreak: 'break-word',
          zIndex: 50,
        }}
      >
        {children}
        <TooltipPrimitive.Arrow
          style={{ fill: 'var(--color-surface-tooltip, #1a1a1a)' }}
          width={10}
          height={5}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}
