// Node < 19 doesn't expose the Web Crypto API as a global, but the MongoDB
// driver calls globalThis.crypto (uuidV4) when creating sessions. Polyfill it
// as early as possible so every DB operation works on older Node runtimes.
import { webcrypto } from 'node:crypto';

const g = globalThis as any;
if (!g.crypto) {
    try {
        g.crypto = webcrypto;
    } catch {
        Object.defineProperty(g, 'crypto', { value: webcrypto, configurable: true, writable: true });
    }
}
