import { Request, Response } from 'express';
import { getDb } from '../lib/mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const registerOwner = async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    try {
        const db = getDb();
        const existing = await db.collection('OwnerUser').findOne({ email });
        if (existing) return res.status(409).json({ message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.collection('OwnerUser').insertOne({
            name,
            email,
            passwordHash: hashedPassword,
            status: 'active',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const token = jwt.sign(
            { sub: result.insertedId, email: email, type: 'owner' },
            process.env.OWNER_JWT_SECRET || 'owner_secret',
            { expiresIn: '24h' }
        );

        return res.status(201).json({
            access_token: token,
            user: { id: result.insertedId, name, email }
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

export const loginOwner = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const db = getDb();
        const user = await db.collection('OwnerUser').findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { sub: user._id, email: user.email, type: 'owner' },
            process.env.OWNER_JWT_SECRET || 'owner_secret',
            { expiresIn: '24h' }
        );

        return res.json({
            access_token: token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Login failed' });
    }
};
