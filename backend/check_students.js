const { MongoClient, ObjectId } = require('mongodb');

async function test() {
    const url = 'mongodb://localhost:27017/shulecloud_db';
    const client = new MongoClient(url);
    try {
        await client.connect();
        const db = client.db();
        
        const student = await db.collection('students').findOne({ _id: new ObjectId('6a072bf77ca2b45b891b5edc') });
        console.log('Querying student by new ObjectId:', student ? student.studentName || student.firstName : null);

        const studentStr = await db.collection('students').findOne({ _id: '6a072bf77ca2b45b891b5edc' });
        console.log('Querying student by string _id:', studentStr ? studentStr.studentName || studentStr.firstName : null);
        
        const allStudents = await db.collection('students').find({}).toArray();
        console.log('Total students:', allStudents.length);
        if (allStudents.length > 0) {
            console.log('First student ID type:', typeof allStudents[0]._id, allStudents[0]._id.constructor.name);
            console.log('First student ID:', allStudents[0]._id);
        }
    } finally {
        await client.close();
    }
}

test();
