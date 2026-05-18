const { MongoClient } = require('mongodb');

async function seed() {
    const url = "mongodb://127.0.0.1:27017/shulecloud_db";
    const client = new MongoClient(url);

    try {
        await client.connect();
        const db = client.db();

        // Create a default tenant
        const tenant = {
            name: "muzamila fey",
            subdomain: "muzamila", 
            status: "active",
            email: "muzamilinc@gmail.com",
            phone: "0726151104",
            address: "The Green Court",
            country: "Kenya",
            createdAt: new Date()
        };

        const res = await db.collection('Tenant').updateOne(
            { subdomain: 'muzamila' },
            { $set: tenant },
            { upsert: true }
        );
        console.log('Seed: Updated/Created default tenant "muzamila"');
        
        const tenantDoc = await db.collection('Tenant').findOne({ subdomain: 'muzamila' });

        // Create a default user for this tenant
        await db.collection('User').updateOne(
            { email: "admin@muzamila.com" },
            { 
                $set: {
                    name: "Admin User",
                    email: "admin@muzamila.com",
                    passwordHash: "$2a$10$LBYk8M4D8X/e8lB5kG7P/un8K7E/V.p1mGvYxSjLwQ.nZ6vB.yV1i", // 'password' hashed
                    role: "admin",
                    tenantId: tenantDoc._id,
                    status: "active"
                }
            },
            { upsert: true }
        );

        await client.close();
    } catch (err) {
        console.error('Seed failed:', err);
    }
}

seed();
