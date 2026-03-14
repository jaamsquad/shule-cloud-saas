import { Request, Response } from 'express';
import { getDb } from '../lib/mongodb';

export const getTenants = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const tenants = await db.collection('Tenant').find({}).toArray();
        
        // Enhance tenants with counts if needed, but for now just return them
        return res.json(tenants);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch tenants' });
    }
};

export const getPlans = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const plans = await db.collection('Plan').find({}).toArray();
        return res.json(plans);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch plans' });
    }
};

export const getRevenueReport = async (req: Request, res: Response) => {
    try {
        // Placeholder for revenue report
        return res.json({
            totalRevenue: 0,
            monthlyRevenue: 0,
            recentTransactions: []
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch revenue report' });
    }
};
