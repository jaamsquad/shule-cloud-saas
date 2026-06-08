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
const getRequestDb = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
const router = (0, express_1.Router)();
// ─── Salary Components (Allowance / Deduction / Bonus types catalog) ─────────
router.get('/salary/components', c.getItems('salary_components'));
router.get('/salary/components/:id', c.getItem('salary_components'));
router.post('/salary/components', c.createItem('salary_components'));
router.patch('/salary/components/:id', c.updateItem('salary_components'));
router.delete('/salary/components/:id', c.deleteItem('salary_components'));
// ─── Standard Payroll Run CRUD ────────────────────────────────────────────────
router.get('/salary/payroll-runs', c.getItems('payroll_runs'));
router.get('/salary/payroll-runs/:id', c.getItem('payroll_runs'));
router.post('/salary/payroll-runs', c.createItem('payroll_runs'));
router.patch('/salary/payroll-runs/:id', c.updateItem('payroll_runs'));
router.delete('/salary/payroll-runs/:id', c.deleteItem('payroll_runs'));
// ─── Salary Sheet: all payroll runs for a given month ────────────────────────
router.get('/salary/sheet', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { month } = req.query;
        const query = {};
        if (month)
            query.month = month;
        const runs = await db.collection('payroll_runs').find(query).toArray();
        if (runs.length === 0 && month) {
            const staff = await db.collection('staff').find({}).toArray();
            return res.json({ runs: [], staff, generated: false });
        }
        res.json({ runs, generated: runs.length > 0 });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ─── Process Month: auto-generate payroll for all staff ──────────────────────
router.post('/salary/process-month', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { month } = req.body;
        if (!month)
            return res.status(400).json({ message: 'Month is required (YYYY-MM format)' });
        const existing = await db.collection('payroll_runs').countDocuments({ month });
        if (existing > 0) {
            return res.status(400).json({
                message: `Payroll for ${month} has already been processed (${existing} records found)`
            });
        }
        const staff = await db.collection('staff').find({}).toArray();
        if (staff.length === 0) {
            return res.status(400).json({ message: 'No staff records found in the system' });
        }
        const runs = staff.map((s) => {
            const basic = Number(s.salary) || 0;
            const nhif = calcNHIF(basic);
            const nssf = calcNSSF(basic);
            const paye = calcPAYE(basic, nhif);
            const deductions = [
                { name: 'NSSF', amount: nssf },
                { name: 'NHIF', amount: nhif },
                { name: 'PAYE', amount: paye },
            ];
            const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
            return {
                month,
                staffId: s._id.toString(),
                staffName: s.employeeName || s.name || 'Unknown',
                designation: s.designation || '',
                department: s.department || '',
                basicSalary: basic,
                allowances: [],
                deductions,
                grossSalary: basic,
                totalDeductions,
                netSalary: Math.max(0, basic - totalDeductions),
                status: 'Pending',
                createdAt: new Date(),
            };
        });
        await db.collection('payroll_runs').insertMany(runs);
        res.status(201).json({
            message: `Payroll processed for ${runs.length} staff member(s)`,
            count: runs.length
        });
    }
    catch (e) {
        console.error('[Salary] process-month error:', e);
        res.status(500).json({ message: e?.message || 'Internal error processing payroll' });
    }
});
// ─── Salary Report: aggregated analytics by year ─────────────────────────────
router.get('/salary/report', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { year } = req.query;
        const match = {};
        if (year)
            match.month = { $regex: `^${year}` };
        const runs = await db.collection('payroll_runs').find(match).toArray();
        const byMonth = {};
        runs.forEach((r) => {
            if (!byMonth[r.month]) {
                byMonth[r.month] = { month: r.month, count: 0, gross: 0, deductions: 0, net: 0, paid: 0 };
            }
            byMonth[r.month].count++;
            byMonth[r.month].gross += r.grossSalary || 0;
            byMonth[r.month].deductions += r.totalDeductions || 0;
            byMonth[r.month].net += r.netSalary || 0;
            if (r.status === 'Paid')
                byMonth[r.month].paid++;
        });
        const monthly = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
        const totalGross = runs.reduce((s, r) => s + (r.grossSalary || 0), 0);
        const totalNet = runs.reduce((s, r) => s + (r.netSalary || 0), 0);
        const totalPaid = runs.filter((r) => r.status === 'Paid').length;
        res.json({ monthly, totalGross, totalNet, totalPaid, total: runs.length });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ─── Statutory Deduction Calculators (Kenya) ─────────────────────────────────
function calcNHIF(gross) {
    if (gross <= 5999)
        return 150;
    if (gross <= 7999)
        return 300;
    if (gross <= 11999)
        return 400;
    if (gross <= 14999)
        return 500;
    if (gross <= 19999)
        return 600;
    if (gross <= 24999)
        return 750;
    if (gross <= 29999)
        return 850;
    if (gross <= 34999)
        return 900;
    if (gross <= 39999)
        return 950;
    if (gross <= 44999)
        return 1000;
    if (gross <= 49999)
        return 1100;
    if (gross <= 59999)
        return 1200;
    if (gross <= 69999)
        return 1300;
    if (gross <= 79999)
        return 1400;
    if (gross <= 89999)
        return 1500;
    if (gross <= 99999)
        return 1600;
    return 1700;
}
function calcNSSF(gross) {
    // New NSSF Act 2013: Tier I (up to KSh 6,000) + Tier II (KSh 6,001–18,000), employee rate 6%
    const tierI = Math.min(gross, 6000) * 0.06;
    const tierII = Math.min(Math.max(gross - 6000, 0), 12000) * 0.06;
    return Math.round(tierI + tierII);
}
function calcPAYE(gross, nhif) {
    // KRA Kenya PAYE bands (monthly)
    const taxable = Math.max(0, gross - nhif);
    let tax = 0;
    if (taxable <= 24000) {
        tax = taxable * 0.10;
    }
    else if (taxable <= 32333) {
        tax = 2400 + (taxable - 24000) * 0.25;
    }
    else if (taxable <= 500000) {
        tax = 4483 + (taxable - 32333) * 0.30;
    }
    else if (taxable <= 800000) {
        tax = 144784 + (taxable - 500000) * 0.325;
    }
    else {
        tax = 242284 + (taxable - 800000) * 0.35;
    }
    const personalRelief = 2400;
    return Math.max(0, Math.round(tax - personalRelief));
}
exports.default = router;
