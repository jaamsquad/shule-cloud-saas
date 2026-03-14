import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { tenancyMiddleware } from './middleware/tenancy';
import onboardRoutes from './routes/onboard.routes';
import authRoutes from './routes/auth.routes';
import ownerAuthRoutes from './routes/owner-auth.routes';

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Global Tenancy Middleware
app.use(tenancyMiddleware);

// API Routes
app.use('/api/v1/onboard', onboardRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/owner/auth', ownerAuthRoutes);

// Root path
app.get('/', (req, res) => {
    res.json({ message: 'ShuleCloud Express API v1.0.0' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

export default app;
