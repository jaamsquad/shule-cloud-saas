/**
 * Mongo-backed Baileys auth store (replaces useMultiFileAuthState).
 *
 * Every school keeps its WhatsApp credentials inside ITS OWN tenant database, so
 * sessions are fully isolated and survive backend restarts / horizontal scaling
 * (no files on disk). Credentials are AES-encrypted at rest.
 *
 * Collection: `whatsapp_auth`
 *   { _id: "creds" | "<keyType>-<id>", data: <encrypted-json>, updatedAt }
 */
import { Db } from 'mongodb';
import baileys from '@whiskeysockets/baileys';
import type { AuthenticationState, SignalDataTypeMap } from '@whiskeysockets/baileys';
import { encrypt, decrypt } from '../../lib/crypto';

const { initAuthCreds, BufferJSON, proto } = baileys as any;

const COLL = 'whatsapp_auth';

const serialize = (value: any): string => encrypt(JSON.stringify(value, BufferJSON.replacer));
const deserialize = (raw: string): any => JSON.parse(decrypt(raw), BufferJSON.reviver);

async function readDoc(db: Db, id: string): Promise<any | null> {
    const doc = await db.collection(COLL).findOne({ _id: id as any });
    if (!doc || !doc.data) return null;
    try { return deserialize(doc.data); } catch { return null; }
}

async function writeDoc(db: Db, id: string, value: any): Promise<void> {
    await db.collection(COLL).updateOne(
        { _id: id as any },
        { $set: { data: serialize(value), updatedAt: new Date() } },
        { upsert: true },
    );
}

async function removeDoc(db: Db, id: string): Promise<void> {
    await db.collection(COLL).deleteOne({ _id: id as any }).catch(() => {});
}

export interface MongoAuthState {
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
    /** Wipe every auth document for this tenant (full logout / delete session). */
    clear: () => Promise<void>;
}

/**
 * Build a Baileys AuthenticationState persisted in the given tenant DB.
 */
export async function useMongoAuthState(db: Db): Promise<MongoAuthState> {
    const creds = (await readDoc(db, 'creds')) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const result: { [id: string]: SignalDataTypeMap[typeof type] } = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readDoc(db, `${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        if (value) result[id] = value;
                    }));
                    return result;
                },
                set: async (data) => {
                    const ops: Promise<void>[] = [];
                    for (const type in data) {
                        for (const id in (data as any)[type]) {
                            const value = (data as any)[type][id];
                            const docId = `${type}-${id}`;
                            ops.push(value ? writeDoc(db, docId, value) : removeDoc(db, docId));
                        }
                    }
                    await Promise.all(ops);
                },
            },
        },
        saveCreds: async () => { await writeDoc(db, 'creds', creds); },
        clear: async () => { await db.collection(COLL).deleteMany({}).catch(() => {}); },
    };
}
