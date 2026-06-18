"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMongoAuthState = useMongoAuthState;
const baileys_1 = __importDefault(require("@whiskeysockets/baileys"));
const crypto_1 = require("../../lib/crypto");
const { initAuthCreds, BufferJSON, proto } = baileys_1.default;
const COLL = 'whatsapp_auth';
const serialize = (value) => (0, crypto_1.encrypt)(JSON.stringify(value, BufferJSON.replacer));
const deserialize = (raw) => JSON.parse((0, crypto_1.decrypt)(raw), BufferJSON.reviver);
async function readDoc(db, id) {
    const doc = await db.collection(COLL).findOne({ _id: id });
    if (!doc || !doc.data)
        return null;
    try {
        return deserialize(doc.data);
    }
    catch {
        return null;
    }
}
async function writeDoc(db, id, value) {
    await db.collection(COLL).updateOne({ _id: id }, { $set: { data: serialize(value), updatedAt: new Date() } }, { upsert: true });
}
async function removeDoc(db, id) {
    await db.collection(COLL).deleteOne({ _id: id }).catch(() => { });
}
/**
 * Build a Baileys AuthenticationState persisted in the given tenant DB.
 */
async function useMongoAuthState(db) {
    const creds = (await readDoc(db, 'creds')) || initAuthCreds();
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const result = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readDoc(db, `${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        if (value)
                            result[id] = value;
                    }));
                    return result;
                },
                set: async (data) => {
                    const ops = [];
                    for (const type in data) {
                        for (const id in data[type]) {
                            const value = data[type][id];
                            const docId = `${type}-${id}`;
                            ops.push(value ? writeDoc(db, docId, value) : removeDoc(db, docId));
                        }
                    }
                    await Promise.all(ops);
                },
            },
        },
        saveCreds: async () => { await writeDoc(db, 'creds', creds); },
        clear: async () => { await db.collection(COLL).deleteMany({}).catch(() => { }); },
    };
}
