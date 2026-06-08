import { Router } from 'express';
import * as c from '../controllers/academics.controller';
import { getMetaDb } from '../lib/mongodb';
import { ObjectId } from 'mongodb';
const getRequestDb = (req: any) => req.tenantDb || getMetaDb();

const router = Router();

// ─── Categories ───────────────────────────────────────────────────────────────
router.get('/pos/categories',           c.getItems('pos_categories'));
router.get('/pos/categories/:id',       c.getItem('pos_categories'));
router.post('/pos/categories',          c.createItem('pos_categories'));
router.patch('/pos/categories/:id',     c.updateItem('pos_categories'));
router.delete('/pos/categories/:id',    c.deleteItem('pos_categories'));

// ─── Tax Rates ────────────────────────────────────────────────────────────────
router.get('/pos/taxes',                c.getItems('pos_taxes'));
router.get('/pos/taxes/:id',            c.getItem('pos_taxes'));
router.post('/pos/taxes',               c.createItem('pos_taxes'));
router.patch('/pos/taxes/:id',          c.updateItem('pos_taxes'));
router.delete('/pos/taxes/:id',         c.deleteItem('pos_taxes'));

// ─── Products ─────────────────────────────────────────────────────────────────
router.get('/pos/products',             c.getItems('pos_products'));
router.get('/pos/products/:id',         c.getItem('pos_products'));
router.patch('/pos/products/:id',       c.updateItem('pos_products'));
router.delete('/pos/products/:id',      c.deleteItem('pos_products'));

router.post('/pos/products', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { name, sku } = req.body;
        if (!name) return res.status(400).json({ message: 'Product name is required' });
        if (sku) {
            const exists = await db.collection('pos_products').findOne({ sku });
            if (exists) return res.status(400).json({ message: `SKU "${sku}" already exists` });
        }
        const result = await db.collection('pos_products').insertOne({ ...req.body, createdAt: new Date() });
        res.status(201).json({ id: result.insertedId, ...req.body });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

// ─── Orders ───────────────────────────────────────────────────────────────────
router.get('/pos/orders',               c.getItems('pos_orders'));
router.get('/pos/orders/:id',           c.getItem('pos_orders'));
router.patch('/pos/orders/:id',         c.updateItem('pos_orders'));
router.delete('/pos/orders/:id',        c.deleteItem('pos_orders'));

router.post('/pos/orders', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { items, paymentMethod, paymentRef, customerName, discount = 0, notes } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Order must have at least one item' });
        }

        let subtotal = 0;
        let taxTotal = 0;

        const processedItems = items.map((item: any) => {
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
                    await db.collection('pos_products').updateOne(
                        { _id: new ObjectId(item.productId) },
                        { $inc: { stock: -Number(item.qty) }, $set: { updatedAt: new Date() } }
                    );
                } catch (_) { /* non-fatal */ }
            }
        }

        res.status(201).json({ id: result.insertedId, ...order });
    } catch (e: any) {
        console.error('[POS] create order error:', e);
        res.status(500).json({ message: e.message });
    }
});

// ─── Order cancel ─────────────────────────────────────────────────────────────
router.patch('/pos/orders/:id/cancel', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { id } = req.params;
        const order: any = await db.collection('pos_orders').findOne({ _id: new ObjectId(id) });
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.status === 'CANCELLED') return res.status(400).json({ message: 'Already cancelled' });

        await db.collection('pos_orders').updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: 'CANCELLED', updatedAt: new Date() } }
        );

        // Restore stock
        for (const item of (order.items || [])) {
            if (item.productId) {
                try {
                    await db.collection('pos_products').updateOne(
                        { _id: new ObjectId(item.productId) },
                        { $inc: { stock: Number(item.qty) }, $set: { updatedAt: new Date() } }
                    );
                } catch (_) { /* non-fatal */ }
            }
        }

        res.json({ message: 'Order cancelled and stock restored' });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

// ─── Analytics ────────────────────────────────────────────────────────────────
router.get('/pos/analytics', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const days = parseInt(req.query.period as string) || 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const orders = await db.collection('pos_orders').find({
            createdAt: { $gte: since },
            status: { $ne: 'CANCELLED' },
        }).toArray();

        const totalRevenue = orders.reduce((s: number, o: any) => s + (o.total || 0), 0);
        const totalOrders = orders.length;
        const totalItems = orders.reduce((s: number, o: any) =>
            s + (o.items || []).reduce((a: number, i: any) => a + Number(i.qty), 0), 0);

        // Payment breakdown
        const paymentBreakdown: Record<string, number> = {};
        orders.forEach((o: any) => {
            const m = o.paymentMethod || 'CASH';
            paymentBreakdown[m] = (paymentBreakdown[m] || 0) + (o.total || 0);
        });

        // Top products
        const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
        orders.forEach((o: any) => {
            (o.items || []).forEach((item: any) => {
                const k = item.productName || 'Unknown';
                if (!productMap[k]) productMap[k] = { name: k, qty: 0, revenue: 0 };
                productMap[k].qty += Number(item.qty);
                productMap[k].revenue += Number(item.subtotal || 0);
            });
        });
        const topProducts = Object.values(productMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 8);

        // Daily revenue (last 30 days)
        const dailyMap: Record<string, number> = {};
        orders.forEach((o: any) => {
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
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayOrders = orders.filter((o: any) => new Date(o.createdAt) >= todayStart);
        const todayRevenue = todayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);

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
    } catch (e: any) {
        console.error('[POS] analytics error:', e);
        res.status(500).json({ message: e.message });
    }
});

export default router;