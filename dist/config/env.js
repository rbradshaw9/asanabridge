"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.loadEnv = loadEnv;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().transform(Number).default('3000'),
    DATABASE_URL: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    ASANA_CLIENT_ID: zod_1.z.string().optional(),
    ASANA_CLIENT_SECRET: zod_1.z.string().optional(),
    ASANA_REDIRECT_URI: zod_1.z.string().optional(),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:3000'),
});
let env;
function loadEnv() {
    if (env)
        return env;
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Invalid environment variables:', result.error.format());
        process.exit(1);
    }
    exports.env = env = result.data;
    return env;
}
