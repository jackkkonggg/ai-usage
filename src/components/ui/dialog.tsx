'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { forwardRef } from 'react'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const DialogContent = forwardRef<
  HTMLDivElement,
  DialogPrimitive.DialogContentProps & { overlayStyle?: React.CSSProperties }
>(function DialogContent({ children, overlayStyle, style, ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 50,
          ...overlayStyle,
        }}
      />
      <DialogPrimitive.Content
        ref={ref}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 51,
          outline: 'none',
          ...style,
        }}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
})

export function DialogHeader({ children, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }} {...props}>
      {children}
    </div>
  )
}

export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description
