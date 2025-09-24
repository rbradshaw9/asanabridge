"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const auth_1 = require("../services/auth");
const logger_1 = require("../config/logger");
const database_1 = require("../config/database");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Validation schemas
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    name: zod_1.z.string().min(1, 'Name is required').optional()
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required')
});
// User registration
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = registerSchema.parse(req.body);
        // Check if user already exists
        const existingUser = await database_1.prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        // Hash password
        const hashedPassword = await bcrypt_1.default.hash(password, 12);
        // Create user
        const user = await database_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name || null
            },
            select: {
                id: true,
                email: true,
                name: true,
                plan: true,
                createdAt: true
            }
        });
        // Generate JWT token
        const token = (0, auth_1.generateToken)(user.id);
        logger_1.logger.info('User registered successfully', { userId: user.id, email: user.email });
        res.status(201).json({
            message: 'User registered successfully',
            user,
            token
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
        }
        logger_1.logger.error('Registration error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// User login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        // Find user by email
        const user = await database_1.prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Check password
        const isValidPassword = await bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Generate JWT token
        const token = (0, auth_1.generateToken)(user.id);
        logger_1.logger.info('User logged in successfully', { userId: user.id, email: user.email });
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                plan: user.plan,
                createdAt: user.createdAt
            },
            token
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
        }
        logger_1.logger.error('Login error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get current user profile
router.get('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = await database_1.prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                email: true,
                name: true,
                plan: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        logger_1.logger.error('Profile fetch error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update user profile
router.patch('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const user = await database_1.prisma.user.update({
            where: { id: req.user.userId },
            data: { name },
            select: {
                id: true,
                email: true,
                name: true,
                plan: true,
                createdAt: true,
                updatedAt: true
            }
        });
        logger_1.logger.info('User profile updated', { userId: user.id });
        res.json({
            message: 'Profile updated successfully',
            user
        });
    }
    catch (error) {
        logger_1.logger.error('Profile update error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
