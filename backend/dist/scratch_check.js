"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
async function main() {
    const client = await mongodb_1.MongoClient.connect('mongodb://localhost:27017/');
    const db = client.db('shulecloud_db');
    const targetIds = ['6a074bd87ca2b45b891b5edd', '6a072bf77ca2b45b891b5edc'];
    for (const id of targetIds) {
        // Try as ObjectId
        const byOid = await db.collection('students').findOne({ _id: new mongodb_1.ObjectId(id) });
        // Try as string
        const byStr = await db.collection('students').findOne({ _id: id });
        console.log(`Student ${id}:`, {
            foundByObjectId: !!byOid,
            foundByString: !!byStr
        });
    }
    // Let's count total students
    const total = await db.collection('students').countDocuments();
    console.log('Total students in DB:', total);
    // Print first 5 students' _ids
    const sample = await db.collection('students').find().limit(5).toArray();
    console.log('Sample student IDs:', sample.map(s => s._id));
    client.close();
}
main().catch(console.error);
