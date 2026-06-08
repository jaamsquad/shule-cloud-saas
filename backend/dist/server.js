"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const mongodb_1 = require("./lib/mongodb");
// Force port 3000 to match Vite proxy
const PORT = 3000;
async function bootstrap() {
    try {
        // Test database connection
        await (0, mongodb_1.connectDB)();
        app_1.default.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Server bootstrap failed:', error);
        process.exit(1);
    }
}
bootstrap();
