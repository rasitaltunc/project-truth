/// <reference types="vitest/globals" />

// Global setup for all tests
// This file runs before each test file

// Polyfill crypto for Node.js test environment (needed by Shamir, crypto tests)
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  // Node.js webcrypto is compatible with Web Crypto API
  (globalThis as Record<string, unknown>).crypto = webcrypto;
}

// Polyfill TextEncoder/TextDecoder (needed by some libraries)
import { TextEncoder, TextDecoder } from 'node:util';

if (!globalThis.TextEncoder) {
  (globalThis as Record<string, unknown>).TextEncoder = TextEncoder;
}
if (!globalThis.TextDecoder) {
  (globalThis as Record<string, unknown>).TextDecoder = TextDecoder;
}
