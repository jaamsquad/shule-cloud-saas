import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './lib/mongodb';

// Force port 3000 to match Vite proxy
const PORT = 3000;

async function bootstrap() {
    try {
        // Test database connection
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Server bootstrap failed:', error);
        process.exit(1);
    }
}

bootstrap();
