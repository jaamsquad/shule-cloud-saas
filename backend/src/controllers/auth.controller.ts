import { Request, Response } from 'express';
import { getDb } from '../lib/mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const tenantId = req.tenantContext?.tenantId;

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
