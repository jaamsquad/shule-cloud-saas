import { Request, Response } from 'express';
import { getMetaDb } from '../lib/mongodb';
import { Db, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// User and Tenant always live in the meta database.
// Staff/students live in the institution's isolated database.
const getInstDb = (req: Request): Db => (req as any).tenantDb || getMetaDb();

export const login = async (req: Request, res: Response) => {
    const { email, password, subdomain } = req.body;
    const metaDb = getMetaDb();
    const instDb = getInstDb(req);

    let tenantId = req.tenantContext?.tenantId;

    if (subdomain) {
        const tenant = await metaDb.collection('Tenant').findOne({ subdomain: subdomain.toLowerCase() });
        if (tenant) {
            tenantId = tenant._id.toString();
        } else {
            return res.status(404).json({ message: 'School not found' });
        }
    }

    if (!tenantId) {
        return res.status(400).json({ message: 'Tenant context missing. Please access via your school subdomain.' });
    }

    try {
        let user: any = null;
        user = await metaDb.collection('User').findOne({ email, tenantId: new ObjectId(tenantId) })
            || await metaDb.collection('User').findOne({ email, tenantId });
        if (!user) user = await metaDb.collection('User').findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        let role = (user.role || user.designation || 'school_admin').toLowerCase();
        let staffInfo: any = null;
        try {
            staffInfo = await instDb.collection('staff').findOne({ email: user.email });
            if (staffInfo) {
                const designation = (staffInfo.designation || '').toLowerCase();
                if (designation.includes('teacher') || staffInfo.isTeachingStaff) role = 'teacher';
            }
        } catch (_) {}

        const userName = (user.name || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null)
            || staffInfo?.employeeName || user.email.split('@')[0]);

        const token = jwt.sign(
            { sub: user._id.toString(), email: user.email, tenantId, role, name: userName },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        return res.json({
            access_token: token,
            user: { id: user._id.toString(), email: user.email, name: userName, role, staffId: staffInfo?._id?.toString() || null }
        });
    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ message: 'Login failed' });
    }
};

export const getTenantProfile = async (req: Request, res: Response) => {
    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant context missing' });
    try {
        const tenant = await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(tenantId) });
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
        res.json(tenant);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateTenantProfile = async (req: Request, res: Response) => {
    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant context missing' });
    try {
        const data = { ...req.body, updatedAt: new Date() };
        delete data._id;
        delete data.subdomain;
        const result = await getMetaDb().collection('Tenant').updateOne(
            { _id: new ObjectId(tenantId) },
            { $set: data }
        );
        if (result.matchedCount === 0) return res.status(404).json({ message: 'Tenant not found' });
        res.json({ message: 'Profile updated successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant context missing' });
    try {
        const { id } = req.params;
        const { email, password } = req.body;
        const updateData: any = { updatedAt: new Date() };
        if (email) updateData.email = email;
        if (password) updateData.passwordHash = await bcrypt.hash(password, 10);
        const result = await getMetaDb().collection('User').updateOne(
            { _id: new ObjectId(id), tenantId: new ObjectId(tenantId) },
            { $set: updateData }
        );
        if (result.matchedCount === 0) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User updated successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant context missing' });
    try {
        const { id } = req.params;
        const result = await getMetaDb().collection('User').deleteOne({
            _id: new ObjectId(id),
            tenantId: new ObjectId(tenantId)
        });
        if (result.deletedCount === 0) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
