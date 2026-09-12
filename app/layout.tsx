import type { Metadata } from 'next'
import './globals.css'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'itask.ge',
  description: 'Task management for DGTL, JOY & Nomio',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
