'use client'

import { Hatch } from 'ldrs/react'
import 'ldrs/react/Hatch.css'
import { C } from '@/lib/design-tokens'

export function FullPageLoader({ message }: { message?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <Hatch size={28} stroke={4} speed={3.5} color={C.textDim} />
        {message && (
          <div style={{ color: C.muted, fontFamily: C.mono, fontSize: 13, marginTop: 16 }}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
