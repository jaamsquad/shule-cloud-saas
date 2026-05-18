import { Request, Response } from 'express';
import { getDb } from '../lib/mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

export const login = async (req: Request, res: Response) => {
    const { email, password, subdomain } = req.body;
    let tenantId = req.tenantContext?.tenantId;

    const db = getDb();

    // If on localhost or missing context, allow subdomain override from body
    if (subdomain) {
        const tenant = await db.collection('Tenant').findOne({ subdomain: subdomain.toLowerCase() });
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
        const db = getDb();
        const user = await db.collection('User').findOne({ 
            email, 
            tenantId: new ObjectId(tenantId) 
        });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { sub: user._id.toString(), email: user.email, tenantId },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        );

        return res.json({
            access_token: token,
            user: { id: user._id.toString(), email: user.email }
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
        const db = getDb();
        const tenant = await db.collection('Tenant').findOne({ _id: new ObjectId(tenantId) });
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
        const db = getDb();
        const data = { ...req.body, updatedAt: new Date() };
        delete data._id;
        delete data.subdomain; // Prevent subdomain change

        const result = await db.collection('Tenant').updateOne(
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
        const db = getDb();
        
        const updateData: any = { updatedAt: new Date() };
        if (email) updateData.email = email;
        if (password) {
            updateData.passwordHash = await bcrypt.hash(password, 10);
        }

        const result = await db.collection('User').updateOne(
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
        const db = getDb();
        
        const result = await db.collection('User').deleteOne({
            _id: new ObjectId(id),
            tenantId: new ObjectId(tenantId)
        });

        if (result.deletedCount === 0) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
