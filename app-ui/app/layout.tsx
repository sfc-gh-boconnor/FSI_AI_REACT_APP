import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "FSI AI Intelligence",
  description: "Financial Services AI — Earnings Intelligence, Market Analysis, NRNT Signals",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
