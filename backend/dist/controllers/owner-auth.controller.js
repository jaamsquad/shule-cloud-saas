"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginOwner = exports.registerOwner = void 0;
const mongodb_1 = require("../lib/mongodb");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const registerOwner = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const db = (0, mongodb_1.getDb)();
        const existing = await db.collection('OwnerUser').findOne({ email });
        if (existing)
            return res.status(409).json({ message: 'Email already registered' });
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const result = await db.collection('OwnerUser').insertOne({
            name,
            email,
            passwordHash: hashedPassword,
            status: 'active',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const token = jsonwebtoken_1.default.sign({ sub: result.insertedId, email: email, type: 'owner' }, process.env.OWNER_JWT_SECRET || 'owner_secret', { expiresIn: '24h' });
        return res.status(201).json({
            access_token: token,
            user: { id: result.insertedId, name, email }
        });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
exports.registerOwner = registerOwner;
const loginOwner = async (req, res) => {
    const { email, password } = req.body;
    try {
        const db = (0, mongodb_1.getDb)();
        const user = await db.collection('OwnerUser').findOne({ email });
        if (!user || !(await bcrypt_1.default.compare(password, user.passwordHash))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ sub: user._id, email: user.email, type: 'owner' }, process.env.OWNER_JWT_SECRET || 'owner_secret', { expiresIn: '24h' });
        return res.json({
            access_token: token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Login failed' });
    }
};
exports.loginOwner = loginOwner;
