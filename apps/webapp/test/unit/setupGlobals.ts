/**
 * Jest global setup - runs before the test framework is installed.
 * Polyfills globals that jsdom does not provide but dependencies (e.g. jose) require.
 */
import { TextEncoder, TextDecoder } from 'util';

if (typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, { TextEncoder, TextDecoder });
}
