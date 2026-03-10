import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'AI Usage Analytics',
    template: '%s | AI Usage Analytics',
  },
  description:
    'Track and visualize Claude Code and OpenAI Codex token usage. Monitor API costs, session activity, and model usage patterns across projects.',
  keywords: ['AI usage', 'Claude Code', 'OpenAI Codex', 'token analytics', 'LLM cost tracking', 'API usage dashboard'],
  openGraph: {
    type: 'website',
    title: 'AI Usage Analytics',
    description: 'Track and visualize Claude Code and OpenAI Codex token usage.',
    siteName: 'AI Usage Analytics',
  },
  twitter: {
    card: 'summary',
    title: 'AI Usage Analytics',
    description: 'Track and visualize Claude Code and OpenAI Codex token usage.',
  },
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
