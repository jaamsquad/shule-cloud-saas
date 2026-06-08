const { MongoClient } = require('mongodb');

async function test() {
    const url = 'mongodb://localhost:27017/shulecloud_db';
    const client = new MongoClient(url);
    try {
        await client.connect();
        const db = client.db();
        
        const tenant = await db.collection('Tenant').findOne({ subdomain: 'kithimani' });
        const schoolId = tenant._id.toString();
        console.log('Kithimani schoolId:', schoolId);
        
        const allInvoices = await db.collection('invoices').find({}).toArray();
        console.log(`Total invoices in DB: ${allInvoices.length}`);
        
        const kithimaniInvoices = await db.collection('invoices').find({
            $or: [{ schoolId }, { schoolId: { $exists: false } }]
        }).toArray();
        console.log(`Kithimani invoices count: ${kithimaniInvoices.length}`);
        
        for (const inv of kithimaniInvoices.slice(0, 10)) {
            console.log(`- ID: ${inv._id}, schoolId: ${inv.schoolId}, status: ${inv.status}, total_due/total: ${inv.total_due ?? inv.total}, balance: ${inv.balance}`);
        }
        
        // Let's count status matches
        const statusMap = {};
        for (const inv of kithimaniInvoices) {
            statusMap[inv.status] = (statusMap[inv.status] || 0) + 1;
        }
        console.log('Kithimani invoices status counts:', statusMap);
    } finally {
        await client.close();
    }
}

test();
