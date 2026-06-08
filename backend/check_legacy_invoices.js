const { MongoClient } = require('mongodb');

async function test() {
    const url = 'mongodb://localhost:27017/shulecloud_db';
    const client = new MongoClient(url);
    try {
        await client.connect();
        const db = client.db();
        
        const invoices = await db.collection('invoices').find({ status: 'UNPAID' }).toArray();
        console.log(`Found ${invoices.length} unpaid invoices.`);
        
        for (const doc of invoices) {
            console.log(`Invoice ID: ${doc._id}`);
            console.log(`  Keys:`, Object.keys(doc).join(', '));
            console.log(`  studentName: ${doc.studentName}`);
            console.log(`  name: ${doc.name}`);
            console.log(`  admission_no: ${doc.admission_no}`);
            console.log(`  registrationNo: ${doc.registrationNo}`);
            console.log(`  class: ${doc.class}`);
            console.log(`  className: ${doc.className}`);
        }
    } finally {
        await client.close();
    }
}

test();
