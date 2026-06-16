"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncParentToStudents = syncParentToStudents;
exports.syncStudentToParents = syncStudentToParents;
const mongodb_1 = require("mongodb");
// Treat empty / "NA" placeholders as missing so we never overwrite real data with blanks.
const ne = (v) => v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim().toUpperCase() !== 'NA';
const parentName = (p) => (p?.fullName || `${p?.firstName || ''} ${p?.lastName || ''}`.trim() || p?.name || '').trim();
/**
 * Push a Parents-module record's details onto every linked student's inline
 * father/mother/guardian fields (and the general parentEmail used for receipts).
 */
async function syncParentToStudents(db, parent) {
    const links = Array.isArray(parent?.linkedStudents) ? parent.linkedStudents : [];
    const pname = parentName(parent);
    for (const l of links) {
        const sid = l?.studentId;
        if (!sid)
            continue;
        const rel = String(l.relationship || parent.relationship || 'guardian').toLowerCase();
        const set = {};
        const put = (k, v) => { if (ne(v))
            set[k] = v; };
        if (rel.includes('father')) {
            put('fatherName', pname);
            put('fatherNationalId', parent.nationalId);
            put('fatherPhone', parent.primaryPhone);
            put('fatherOccupation', parent.occupation);
            put('fatherEmail', parent.email);
        }
        else if (rel.includes('mother')) {
            put('motherName', pname);
            put('motherNationalId', parent.nationalId);
            put('motherPhone', parent.primaryPhone);
            put('motherOccupation', parent.occupation);
            put('motherEmail', parent.email);
        }
        else {
            put('guardianName', pname);
            put('guardianPhone', parent.primaryPhone);
            put('guardianEmail', parent.email);
        }
        put('parentEmail', parent.email);
        if (l.isPrimary) {
            put('parentPhone', parent.primaryPhone);
            put('parentName', pname);
        }
        if (Object.keys(set).length) {
            try {
                await db.collection('students').updateOne({ _id: new mongodb_1.ObjectId(String(sid)) }, { $set: { ...set, updatedAt: new Date() } });
            }
            catch { /* ignore */ }
        }
    }
}
/**
 * Upsert Parents-module records from a student's inline father/mother fields and
 * link the student — so editing the student keeps the parent record in sync.
 */
async function syncStudentToParents(db, studentId, st) {
    const ensure = async (rel, name, f) => {
        if (!ne(name))
            return;
        let parent = await db.collection('parents').findOne({ 'linkedStudents.studentId': String(studentId), relationship: new RegExp(`^${rel}$`, 'i') }).catch(() => null);
        if (!parent && ne(f.nationalId))
            parent = await db.collection('parents').findOne({ nationalId: f.nationalId }).catch(() => null);
        const setF = {};
        const put = (k, v) => { if (ne(v))
            setF[k] = v; };
        put('fullName', name);
        put('name', name);
        put('nationalId', f.nationalId);
        put('primaryPhone', f.phone);
        put('occupation', f.occupation);
        put('email', f.email);
        put('relationship', rel);
        const link = { studentId: String(studentId), studentName: st.studentName, admissionNo: st.registrationNo || st.admNo, relationship: rel, isPrimary: true };
        if (parent) {
            const links = parent.linkedStudents || [];
            const linkedStudents = links.some((l) => String(l.studentId) === String(studentId)) ? links : [...links, { ...link, isPrimary: links.length === 0 }];
            await db.collection('parents').updateOne({ _id: parent._id }, { $set: { ...setF, linkedStudents, updatedAt: new Date() } });
        }
        else if (Object.keys(setF).length) {
            const parentId = `PRNT-${Math.floor(100000 + Math.random() * 900000)}`; // matches the Parents module format
            await db.collection('parents').insertOne({ ...setF, parentId, status: 'Active', linkedStudents: [link], createdAt: new Date() });
        }
    };
    await ensure('Father', st.fatherName, { nationalId: st.fatherNationalId, phone: st.fatherPhone, occupation: st.fatherOccupation, email: st.fatherEmail });
    await ensure('Mother', st.motherName, { nationalId: st.motherNationalId, phone: st.motherPhone, occupation: st.motherOccupation, email: st.motherEmail });
}
