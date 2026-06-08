const { MongoClient } = require('mongodb');

async function test() {
    const url = 'mongodb://localhost:27017/shulecloud_db';
    const client = new MongoClient(url);
    try {
        await client.connect();
        const db = client.db();
        
        const tenant = await db.collection('Tenant').findOne({ subdomain: 'kithimani' });
        console.log('Tenant contact/address properties:');
        console.log('address:', tenant.address);
        console.log('country:', tenant.country);
        console.log('phone:', tenant.phone);
        console.log('contactPhone:', tenant.contactPhone);
        console.log('email:', tenant.email);
        console.log('contactEmail:', tenant.contactEmail);
        console.log('website:', tenant.website);
    } finally {
        await client.close();
    }
}

test();
