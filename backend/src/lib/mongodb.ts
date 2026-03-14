import { MongoClient, Db } from 'mongodb';

const url = process.env.DATABASE_URL || 'mongodb://localhost:27017/shulecloud_db';
const client = new MongoClient(url);

let db: Db;

export const connectDB = async () => {
    try {
        await client.connect();
        db = client.db();
        console.log('Connected directly to MongoDB');
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

export const getDb = () => {
    if (!db) {
        throw new Error('Database not initialized. Call connectDB first.');
    }
    return db;
};

export default client;
