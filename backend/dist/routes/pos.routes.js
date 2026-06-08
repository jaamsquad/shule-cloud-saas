"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const c = __importStar(require("../controllers/academics.controller"));
const mongodb_1 = require("../lib/mongodb");
const mongodb_2 = require("mongodb");
const getRequestDb = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
const router = (0, express_1.Router)();
// ─── Categories ───────────────────────────────────────────────────────────────
router.get('/pos/categories', c.getItems('pos_categories'));
router.get('/pos/categories/:id', c.getItem('pos_categories'));
router.post('/pos/categories', c.createItem('pos_categories'));
router.patch('/pos/categories/:id', c.updateItem('pos_categories'));
router.delete('/pos/categories/:id', c.deleteItem('pos_categories'));
// ─── Tax Rates ────────────────────────────────────────────────────────────────
router.get('/pos/taxes', c.getItems('pos_taxes'));
router.get('/pos/taxes/:id', c.getItem('pos_taxes'));
router.post('/pos/taxes', c.createItem('pos_taxes'));
router.patch('/pos/taxes/:id', c.updateItem('pos_taxes'));
router.delete('/pos/taxes/:id', c.deleteItem('pos_taxes'));
// ─── Products ─────────────────────────────────────────────────────────────────
router.get('/pos/products', c.getItems('pos_products'));
router.get('/pos/products/:id', c.getItem('pos_products'));
router.patch('/pos/products/:id', c.updateItem('pos_products'));
router.delete('/pos/products/:id', c.deleteItem('pos_products'));
router.post('/pos/products', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { name, sku } = req.body;
        if (!name)
            return res.status(400).json({ message: 'Product name is required' });
        if (sku) {
            const exists = await db.collection('pos_products').findOne({ sku });
            if (exists)
                return res.status(400).json({ message: `SKU "${sku}" already exists` });
        }
        const result = await db.collection('pos_products').insertOne({ ...req.body, createdAt: new Date() });
        res.status(201).json({ id: result.insertedId, ...req.body });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ─── Orders ───────────────────────────────────────────────────────────────────
router.get('/pos/orders', c.getItems('pos_orders'));
router.get('/pos/orders/:id', c.getItem('pos_orders'));
router.patch('/pos/orders/:id', c.updateItem('pos_orders'));
router.delete('/pos/orders/:id', c.deleteItem('pos_orders'));
router.post('/pos/orders', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { items, paymentMethod, paymentRef, customerName, discount = 0, notes } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Order must have at least one item' });
        }
        let subtotal = 0;
        let taxTotal = 0;
        const processedItems = items.map((item) => {
            const itemSubtotal = Number(item.unitPrice) * Number(item.qty);
            const taxRate = Number(item.taxRate) || 0;
            const itemTax = Math.round(itemSubtotal * (taxRate / 100) * 100) / 100;
            subtotal += itemSubtotal;
            taxTotal += itemTax;
            return { ...item, subtotal: itemSubtotal, taxAmount: itemTax };
        });
        const total = Math.round((subtotal + taxTotal - Number(discount)) * 100) / 100;
        const count = await db.collection('pos_orders').countDocuments();
        const orderNo = `ORD-${String(count + 1).padStart(5, '0')}`;
        const order = {
            orderNo,
            items: processedItems,
            subtotal: Math.round(subtotal * 100) / 100,
            taxTotal: Math.round(taxTotal * 100) / 100,
            discount: Number(discount),
            total,
            paymentMethod: paymentMethod || 'CASH',
            paymentRef: paymentRef || '',
            customerName: customerName || 'Walk-in',
            notes: notes || '',
            status: 'COMPLETED',
            source: 'POS',
            createdAt: new Date(),
        };
        const result = await db.collection('pos_orders').insertOne(order);
        // Decrement product stock
        for (const item of items) {
            if (item.productId) {
                try {
                    await db.collection('pos_products').updateOne({ _id: new mongodb_2.ObjectId(item.productId) }, { $inc: { stock: -Number(item.qty) }, $set: { updatedAt: new Date() } });
                }
                catch (_) { /* non-fatal */ }
            }
        }
        res.status(201).json({ id: result.insertedId, ...order });
    }
    catch (e) {
        console.error('[POS] create order error:', e);
        res.status(500).json({ message: e.message });
    }
});
// ─── Order cancel ─────────────────────────────────────────────────────────────
router.patch('/pos/orders/:id/cancel', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { id } = req.params;
        const order = await db.collection('pos_orders').findOne({ _id: new mongodb_2.ObjectId(id) });
        if (!order)
            return res.status(404).json({ message: 'Order not found' });
        if (order.status === 'CANCELLED')
            return res.status(400).json({ message: 'Already cancelled' });
        await db.collection('pos_orders').updateOne({ _id: new mongodb_2.ObjectId(id) }, { $set: { status: 'CANCELLED', updatedAt: new Date() } });
        // Restore stock
        for (const item of (order.items || [])) {
            if (item.productId) {
                try {
                    await db.collection('pos_products').updateOne({ _id: new mongodb_2.ObjectId(item.productId) }, { $inc: { stock: Number(item.qty) }, $set: { updatedAt: new Date() } });
                }
                catch (_) { /* non-fatal */ }
            }
        }
        res.json({ message: 'Order cancelled and stock restored' });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ─── Analytics ────────────────────────────────────────────────────────────────
router.get('/pos/analytics', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const days = parseInt(req.query.period) || 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const orders = await db.collection('pos_orders').find({
            createdAt: { $gte: since },
            status: { $ne: 'CANCELLED' },
        }).toArray();
        const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
        const totalOrders = orders.length;
        const totalItems = orders.reduce((s, o) => s + (o.items || []).reduce((a, i) => a + Number(i.qty), 0), 0);
        // Payment breakdown
        const paymentBreakdown = {};
        orders.forEach((o) => {
            const m = o.paymentMethod || 'CASH';
            paymentBreakdown[m] = (paymentBreakdown[m] || 0) + (o.total || 0);
        });
        // Top products
        const productMap = {};
        orders.forEach((o) => {
            (o.items || []).forEach((item) => {
                const k = item.productName || 'Unknown';
                if (!productMap[k])
                    productMap[k] = { name: k, qty: 0, revenue: 0 };
                productMap[k].qty += Number(item.qty);
                productMap[k].revenue += Number(item.subtotal || 0);
            });
        });
        const topProducts = Object.values(productMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 8);
        // Daily revenue (last 30 days)
        const dailyMap = {};
        orders.forEach((o) => {
            const day = new Date(o.createdAt).toISOString().split('T')[0];
            dailyMap[day] = (dailyMap[day] || 0) + (o.total || 0);
        });
        const daily = Object.entries(dailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, revenue]) => ({ date: date.slice(5), revenue })); // MM-DD
        // Low stock
        const lowStock = await db.collection('pos_products')
            .find({ stock: { $lte: 5 }, isActive: { $ne: false } })
            .project({ name: 1, stock: 1, sku: 1 })
            .toArray();
        // Today's stats
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayOrders = orders.filter((o) => new Date(o.createdAt) >= todayStart);
        const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
        res.json({
            totalRevenue,
            totalOrders,
            totalItems,
            todayRevenue,
            todayOrders: todayOrders.length,
            paymentBreakdown,
            topProducts,
            daily,
            lowStock,
        });
    }
    catch (e) {
        console.error('[POS] analytics error:', e);
        res.status(500).json({ message: e.message });
    }
});
exports.default = router;
