"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRevenueReport = exports.getPlans = exports.getTenants = void 0;
const mongodb_1 = require("../lib/mongodb");
const getTenants = async (req, res) => {
    try {
        const db = (0, mongodb_1.getDb)();
        const tenants = await db.collection('Tenant').find({}).toArray();
        // Enhance tenants with counts if needed, but for now just return them
        return res.json(tenants);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to fetch tenants' });
    }
};
exports.getTenants = getTenants;
const getPlans = async (req, res) => {
    try {
        const db = (0, mongodb_1.getDb)();
        const plans = await db.collection('Plan').find({}).toArray();
        return res.json(plans);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to fetch plans' });
    }
};
exports.getPlans = getPlans;
const getRevenueReport = async (req, res) => {
    try {
        // Placeholder for revenue report
        return res.json({
            totalRevenue: 0,
            monthlyRevenue: 0,
            recentTransactions: []
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to fetch revenue report' });
    }
};
exports.getRevenueReport = getRevenueReport;
