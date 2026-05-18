const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testConnection() {
    const url = process.env.DATABASE_URL;
    console.log('Testing connection to:', url);
    const client = new MongoClient(url, { 
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000 
    });

    try {
        await client.connect();
        console.log('Successfully connected to MongoDB Atlas!');
        await client.close();
    } catch (err) {
        console.error('Connection failed:', err.message);
        if (err.message.includes('ETIMEDOUT')) {
            console.log('\nDIAGNOSIS: Network Timeout.');
            console.log('1. Check if your IP is whitelisted in MongoDB Atlas.');
            console.log('2. Check if your network/firewall blocks port 27017.');
        }
    }
}

testConnection();
