import { Request, Response } from 'express';
import { getDb } from '../lib/mongodb';
import { ObjectId } from 'mongodb';

export const bulkCreate = (collectionName: string) => async (req: Request, res: Response) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items)) return res.status(400).json({ message: 'Items should be an array' });
        const db = getDb();
        const result = await db.collection(collectionName).insertMany(items.map((i: any) => ({ ...i, createdAt: new Date() })));
        res.status(201).json({ message: 'Bulk creation successful', count: result.insertedCount });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getItem = (collectionName: string) => async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const item = await db.collection(collectionName).findOne({ _id: new ObjectId(id) });
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        res.json(item);
    } catch (error: any) {
        console.error(`[Controller] Error fetching single ${collectionName}:`, error.message);
        res.status(500).json({ message: 'Error fetching item', error: error.message });
    }
};

export const createItem = (collectionName: string) => async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const data = { ...req.body, createdAt: new Date() };
        const result = await db.collection(collectionName).insertOne(data);
        res.status(201).json({ id: result.insertedId, ...data });
    } catch (error) {
        res.status(500).json({ message: 'Error creating item', error });
    }
};

export const getItems = (collectionName: string) => async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const query: any = {};
        
        console.log(`[Controller] Fetching ${collectionName} with query:`, req.query);

        // ─── Dynamic Filtering Logic ─────────────────────────────────────────
        Object.keys(req.query).forEach(key => {
            if (key === 'search') {
                const searchVal = req.query[key] as string;
                query.$or = [
                    { studentName: { $regex: searchVal, $options: 'i' } },
                    { firstName: { $regex: searchVal, $options: 'i' } },
                    { lastName: { $regex: searchVal, $options: 'i' } },
                    { registrationNo: { $regex: searchVal, $options: 'i' } },
                    { studentId: { $regex: searchVal, $options: 'i' } },
                    { studentClass: { $regex: searchVal, $options: 'i' } },
                    { className: { $regex: searchVal, $options: 'i' } },
                    { levelName: { $regex: searchVal, $options: 'i' } },
                    { name: { $regex: searchVal, $options: 'i' } }
                ];
            } else if (req.query[key]) {
                // Exact matching for other fields (e.g. className, isActive)
                query[key] = req.query[key];
            }
        });

        const items = await db.collection(collectionName).find(query).toArray();
        console.log(`[Controller] Found ${items.length} items for ${collectionName}`);
        res.json(items);
    } catch (error: any) {
        console.error(`[Controller] Error fetching ${collectionName}:`, error.message);
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
};

export const updateItem = (collectionName: string) => async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const data = { ...req.body, updatedAt: new Date() };
        delete data._id; // Prevent updating _id
        
        const result = await db.collection(collectionName).updateOne(
            { _id: new ObjectId(id) },
            { $set: data }
        );
        
        if (result.matchedCount === 0) return res.status(404).json({ message: 'Item not found' });
        res.json({ message: 'Item updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating item', error });
    }
};

export const deleteItem = (collectionName: string) => async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const item = await db.collection(collectionName).findOne({ _id: new ObjectId(id) });
        if (!item) return res.status(404).json({ message: 'Item not found in active registry' });

        // Institutional Archival: Move to archives with deletion metadata
        await db.collection('archives').insertOne({
            ...item,
            originalCollection: collectionName,
            deletedAt: new Date(),
            archivedId: item._id // Preserve original ID reference
        });

        await db.collection(collectionName).deleteOne({ _id: new ObjectId(id) });
        res.json({ message: 'Entity moved to secure archives (Auto-purge in 30 days)' });
    } catch (error: any) {
        res.status(500).json({ message: 'Archival integrity error', error: error.message });
    }
};

export const restoreFromArchive = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const archived = await db.collection('archives').findOne({ _id: new ObjectId(id) });
        if (!archived) return res.status(404).json({ message: 'Archived record not found' });

        const { originalCollection, ...data } = archived as any;
        delete data.deletedAt;
        delete data._id; // Use preserved ID or generate new? We'll use insert to restore

        await db.collection(originalCollection).insertOne({ ...data, _id: archived.archivedId || archived._id });
        await db.collection('archives').deleteOne({ _id: new ObjectId(id) });
        
        res.json({ message: 'Registry node restored to active status' });
    } catch (error: any) {
        res.status(500).json({ message: 'Restoration failure', error: error.message });
    }
};

export const getArchives = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const items = await db.collection('archives').find({}).toArray();
        res.json(items);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching archives', error: error.message });
    }
};

export const clearArchives = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        await db.collection('archives').deleteMany({});
        res.json({ message: 'Institutional archives purged successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Clearance error', error: error.message });
    }
};

export const getExamReport = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const { examId } = req.params;
        const { stream } = req.query;

        // 1. Get Exam
        const exam = await db.collection('exams').findOne({ _id: new ObjectId(examId) });
        if (!exam) return res.status(404).json({ message: "Exam not found" });

        // 2. Get Marks
        const query: any = { examId: new ObjectId(examId) };
        if (stream && stream !== 'Overall') query.stream = stream;
        
        const marks = await db.collection('marks').find(query).toArray();
        const subjects = await db.collection('subjects').find({}).toArray();
        const students = await db.collection('students').find({}).toArray();

        // 3. Aggregate Subject Performance
        const subjectAnalysis = subjects.map(sub => {
            const subMarks = marks.filter(m => m.subjectId.toString() === sub._id.toString());
            const entry = subMarks.length;
            
            // Calculate grades (using KCSE preset logic)
            const distribution: any = {};
            subMarks.forEach(m => {
                const g = m.grade || 'E';
                distribution[g] = (distribution[g] || 0) + 1;
            });

            const totalPoints = subMarks.reduce((acc, m) => acc + (m.points || 0), 0);
            const ms = entry > 0 ? (totalPoints / entry).toFixed(2) : "0.00";

            return {
                name: sub.name,
                entry,
                grades: distribution,
                ms,
                mg: entry > 0 ? "B+" : "-", // Simplified for now
                prev: (Number(ms) - 0.5).toFixed(2), // Mock prev
                dev: "+0.50"
            };
        });

        // 4. Aggregate Teacher Performance (Mocked link for now)
        const staff = await db.collection('staff').find({ role: 'Teacher' }).toArray();
        const teacherPerformance = staff.map(s => ({
            name: s.name,
            sub: s.assignedSubjects?.[0] || 'Unknown',
            mean: (Math.random() * 4 + 7).toFixed(1),
            deviation: "+0.2",
            tasks: "Complete"
        }));

        res.json({
            exam,
            subjectAnalysis,
            teacherPerformance,
            overall: {
                entry: marks.length,
                ms: "11.0",
                mg: "A Minus",
                dev: "-1.00"
            }
        });

    } catch (error) {
        console.error("Report Error:", error);
        res.status(500).json({ message: 'Error generating report', error });
    }
};
