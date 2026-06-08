import { MongoClient, Db } from 'mongodb';

// ─── Connection setup ─────────────────────────────────────────────────────────
// We parse the base URI (without a database name) so we can connect to
// multiple databases from a single client (one db per institution).

const rawUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/shulecloud_db';

// Strip the database name from the URI to get the base connection string
const baseUri = (() => {
    try {
        // For mongodb://host:port/dbname → mongodb://host:port
        const u = new URL(rawUri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'));
        const proto = rawUri.startsWith('mongodb+srv') ? 'mongodb+srv' : 'mongodb';
        const auth = u.username ? `${u.username}:${u.password}@` : '';
        return `${proto}://${auth}${u.host}`;
    } catch {
        // Fallback: strip everything after the last slash that contains the db name
        return rawUri.replace(/\/[^/?]+(\?.*)?$/, '');
    }
})();

// Meta database name — stores global Tenant registry, Plans, etc.
const META_DB_NAME = 'shulecloud_meta';

const client = new MongoClient(baseUri || 'mongodb://localhost:27017');

let metaDb: Db;

// Cache of open tenant databases (one per institution)
const tenantDbCache = new Map<string, Db>();

// ─── Public API ───────────────────────────────────────────────────────────────

/** Connect to MongoDB and initialise the meta database */
export const connectDB = async (): Promise<Db> => {
    try {
        await client.connect();
        metaDb = client.db(META_DB_NAME);
        console.log(`[MongoDB] Connected. Meta DB: ${META_DB_NAME}`);

        // Create required indexes on meta db
        try {
            await metaDb.collection('Tenant').createIndex({ subdomain: 1 }, { unique: true });
            await metaDb.collection('Tenant').createIndex({ databaseName: 1 }, { unique: true, sparse: true });
        } catch (_) {}

        return metaDb;
    } catch (error) {
        console.error('[MongoDB] Connection error:', error);
        process.exit(1);
    }
};

/**
 * Returns the META database — used for:
 * - Tenant registry
 * - Plans & subscriptions
 * - Global admin users
 */
export const getMetaDb = (): Db => {
    if (!metaDb) throw new Error('Database not initialised. Call connectDB first.');
    return metaDb;
};

/**
 * Returns a specific tenant's database by its database name.
 * MongoDB creates the database automatically on first write.
 * Results are cached so we reuse the same Db instance per tenant.
 *
 * @param dbName  e.g. "egertondb", "afeydevdb"
 */
export const getTenantDb = (dbName: string): Db => {
    if (!dbName) throw new Error('Tenant database name is required');
    if (!tenantDbCache.has(dbName)) {
        tenantDbCache.set(dbName, client.db(dbName));
        console.log(`[MongoDB] Opened tenant DB: ${dbName}`);
    }
    return tenantDbCache.get(dbName)!;
};

/**
 * Backward-compatible alias — returns the meta database.
 * Prefer using getTenantDb() or req.tenantDb for institutional data.
 */
export const getDb = (): Db => getMetaDb();

/**
 * Derive a safe database name from a school subdomain.
 * e.g. "egerton-uni" → "egertonunidb"
 */
export const subdomainToDbName = (subdomain: string): string => {
    return subdomain.toLowerCase().replace(/[^a-z0-9]/g, '') + 'db';
};

export default client;
