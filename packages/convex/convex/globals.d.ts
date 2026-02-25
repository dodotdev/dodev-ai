// Web Crypto API and encoding globals available in the Convex runtime
declare const crypto: Crypto
declare class TextEncoder {
  encode(input?: string): Uint8Array
}

// Response is available in Convex httpAction handlers at runtime
interface ResponseInit {
  status?: number
  headers?: Record<string, string>
}

declare class Response {
  constructor(body?: string | null, init?: ResponseInit)
  readonly status: number
  readonly ok: boolean
  readonly headers: Headers
  readonly redirected: boolean
  readonly statusText: string
  readonly url: string
  readonly body: ReadableStream | null
  readonly bodyUsed: boolean
  text(): Promise<string>
  json(): Promise<unknown>
  arrayBuffer(): Promise<ArrayBuffer>
  clone(): Response
  static redirect(url: string, status?: number): Response
}
