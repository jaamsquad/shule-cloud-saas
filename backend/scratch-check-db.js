const { MongoClient } = require('mongodb');

async function run() {
    const client = new MongoClient('mongodb://127.0.0.1:27017');
    try {
        await client.connect();
        const db = client.db('shulecloud_db');
        const students = await db.collection('students').find({}).toArray();
        console.log('--- STUDENTS ---');
        console.log(JSON.stringify(students.slice(0, 5), null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}
run();
