import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { tenancyMiddleware } from './middleware/tenancy';
import onboardRoutes from './routes/onboard.routes';
import authRoutes from './routes/auth.routes';
import ownerAuthRoutes from './routes/owner-auth.routes';
import ownerRoutes from './routes/owner.routes';
import academicsRoutes from './routes/academics.routes';
import attendanceRoutes from './routes/attendance.routes';
import reportsRoutes from './routes/reports.routes';

console.log('[App] Bootstrapping institutional backend system...');
const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Global Tenancy Middleware
app.use(tenancyMiddleware);

// API Routes
app.use('/api/v1', academicsRoutes);
app.use('/api/v1', attendanceRoutes);
app.use('/api/v1', reportsRoutes);
app.use('/api/v1/onboard', onboardRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/owner/auth', ownerAuthRoutes);
app.use('/api/v1/owner', ownerRoutes);

// Root path
app.get('/', (req, res) => {
    res.json({ message: 'ShuleCloud Express API v1.0.0' });
});

// 404 handler
app.use((req, res, next) => {
    console.log(`[App] Fallback 404 reached for: ${req.method} ${req.url}`);
    next();
});
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

export default app;
