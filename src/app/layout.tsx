import type { Metadata } from 'next'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

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
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
