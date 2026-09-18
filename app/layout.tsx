import type { Metadata } from 'next'
import { Noto_Sans_Georgian } from 'next/font/google'
import './globals.css'

const notoGeorgian = Noto_Sans_Georgian({
  subsets: ['georgian'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-noto-geo',
})

export const metadata: Metadata = {
  title: 'itask.ge',
  description: 'Task management for DGTL, JOY & Nomio',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" className={notoGeorgian.variable}>
      <body>{children}</body>
    </html>
  )
}
