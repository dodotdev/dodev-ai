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
    default: "DoMCP.ai - AI-Native Task & Memory Management",
    template: "%s | DoMCP.ai",
  },
  description:
    "Open-source todo and memory management for AI agents. Give Claude, Cursor, and any MCP client persistent cross-session awareness.",
  metadataBase: new URL("https://domcp.ai"),
  openGraph: {
    title: "DoMCP.ai - AI-Native Task & Memory Management",
    description:
      "Open-source todo and memory management for AI agents. Give Claude, Cursor, and any MCP client persistent cross-session awareness.",
    url: "https://domcp.ai",
    siteName: "DoMCP.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DoMCP.ai - AI-Native Task & Memory Management",
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
