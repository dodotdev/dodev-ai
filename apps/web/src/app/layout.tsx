import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/providers/theme-provider"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "dodev.ai - AI-Native Task & Memory Management",
    template: "%s | dodev.ai",
  },
  description:
    "Open-source todo and memory management for AI agents. Give Claude, Cursor, and any MCP client persistent cross-session awareness.",
  metadataBase: new URL("https://dodev.ai"),
  openGraph: {
    title: "dodev.ai - AI-Native Task & Memory Management",
    description:
      "Open-source todo and memory management for AI agents. Give Claude, Cursor, and any MCP client persistent cross-session awareness.",
    url: "https://dodev.ai",
    siteName: "dodev.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "dodev.ai - AI-Native Task & Memory Management",
    description:
      "Open-source todo and memory management for AI agents. Give Claude, Cursor, and any MCP client persistent cross-session awareness.",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
