// Web Crypto API and encoding globals available in the Convex runtime
declare const crypto: Crypto
declare class TextEncoder {
  encode(input?: string): Uint8Array
}
