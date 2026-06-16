"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Node < 19 doesn't expose the Web Crypto API as a global, but the MongoDB
// driver calls globalThis.crypto (uuidV4) when creating sessions. Polyfill it
// as early as possible so every DB operation works on older Node runtimes.
const node_crypto_1 = require("node:crypto");
const g = globalThis;
if (!g.crypto) {
    try {
        g.crypto = node_crypto_1.webcrypto;
    }
    catch {
        Object.defineProperty(g, 'crypto', { value: node_crypto_1.webcrypto, configurable: true, writable: true });
    }
}
