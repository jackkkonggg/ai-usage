'use client'

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { C } from '@/lib/design-tokens'

export function MarkdownContent({ content }: { content: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ node: _n, ...p }) => (
          <h1 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '12px 0 6px' }} {...p} />
        ),
        h2: ({ node: _n, ...p }) => (
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '10px 0 5px' }} {...p} />
        ),
        h3: ({ node: _n, ...p }) => (
          <h3 style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '8px 0 4px' }} {...p} />
        ),
        p: ({ node: _n, ...p }) => (
          <p style={{ margin: '4px 0', lineHeight: 1.6 }} {...p} />
        ),
        hr: ({ node: _n, ...p }) => (
          <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '10px 0' }} {...p} />
        ),
        strong: ({ node: _n, ...p }) => (
          <strong style={{ fontWeight: 700, color: C.text }} {...p} />
        ),
        code: ({ node: _n, className, children, ...p }) => {
          const isBlock = className?.startsWith('language-')
          if (isBlock) {
            return (
              <pre
                style={{
                  background: C.surface2,
                  borderRadius: 6,
                  padding: '10px 12px',
                  overflowX: 'auto',
                  margin: '6px 0',
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                <code style={{ fontFamily: C.mono, color: C.text }}>{children}</code>
              </pre>
            )
          }
          return (
            <code
              style={{
                fontFamily: C.mono,
                fontSize: '0.9em',
                background: C.surface2,
                borderRadius: 3,
                padding: '1px 5px',
                color: C.text,
              }}
              {...p}
            >
              {children}
            </code>
          )
        },
        table: ({ node: _n, ...p }) => (
          <div style={{ overflowX: 'auto', margin: '8px 0' }}>
            <table
              style={{
                borderCollapse: 'collapse',
                fontSize: 12,
                width: '100%',
                fontFamily: C.mono,
              }}
              {...p}
            />
          </div>
        ),
        th: ({ node: _n, ...p }) => (
          <th
            style={{
              padding: '5px 10px',
              textAlign: 'left',
              borderBottom: `1px solid ${C.border}`,
              color: C.muted,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
            {...p}
          />
        ),
        td: ({ node: _n, ...p }) => (
          <td
            style={{
              padding: '5px 10px',
              borderBottom: `1px solid ${C.border}22`,
              verticalAlign: 'top',
              color: C.text,
            }}
            {...p}
          />
        ),
        ul: ({ node: _n, ...p }) => (
          <ul style={{ paddingLeft: 18, margin: '4px 0' }} {...p} />
        ),
        ol: ({ node: _n, ...p }) => (
          <ol style={{ paddingLeft: 18, margin: '4px 0' }} {...p} />
        ),
        li: ({ node: _n, ...p }) => (
          <li style={{ margin: '2px 0', lineHeight: 1.6 }} {...p} />
        ),
        blockquote: ({ node: _n, ...p }) => (
          <blockquote
            style={{
              borderLeft: `3px solid ${C.border}`,
              paddingLeft: 12,
              margin: '6px 0',
              color: C.textDim,
            }}
            {...p}
          />
        ),
      }}
    >
      {content}
    </Markdown>
  )
}
