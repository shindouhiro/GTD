import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import db from '../db.js';
import { generateToken, authMiddleware, type AuthRequest } from '../auth.js';
import type { User, UserResponse } from '../types.js';
import Logger from '../logger.js';

const router = Router();
const logger = new Logger('AuthController');
const SALT_ROUNDS = 10;

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const userId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(
      'INSERT INTO users (id, email, password, name, createdAt) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, email, hashedPassword, name, createdAt);

    // Create default categories for new user
    const defaultCategories = [
      { id: `${userId}-work`, name: '工作', icon: 'Briefcase', color: '#3b82f6', userId },
      { id: `${userId}-personal`, name: '个人', icon: 'User', color: '#10b981', userId },
      { id: `${userId}-shopping`, name: '购物', icon: 'ShoppingCart', color: '#f59e0b', userId },
      { id: `${userId}-health`, name: '健康', icon: 'Heart', color: '#ef4444', userId },
      { id: `${userId}-study`, name: '学习', icon: 'BookOpen', color: '#8b5cf6', userId },
      { id: `${userId}-home`, name: '生活', icon: 'Home', color: '#ec4899', userId },
    ];

    const insertCategory = db.prepare(
      'INSERT INTO categories (id, name, icon, color, userId) VALUES (?, ?, ?, ?, ?)'
    );

    const insertCategories = db.transaction((categories: typeof defaultCategories) => {
      for (const cat of categories) {
        insertCategory.run(cat.id, cat.name, cat.icon, cat.color, cat.userId);
      }
    });

    insertCategories(defaultCategories);

    // Generate token
    const token = generateToken({ userId, email });

    const userResponse: UserResponse = {
      id: userId,
      email,
      name,
      createdAt,
    };

    logger.info('User registered successfully', { userId, email });

    res.status(201).json({
      user: userResponse,
      token,
    });
  } catch (error) {
    logger.error('Registration error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };

    logger.info('User logged in successfully', { userId: user.id, email });

    res.json({
      user: userResponse,
      token,
    });
  } catch (error) {
    logger.error('Login error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = db.prepare('SELECT id, email, name, createdAt FROM users WHERE id = ?').get(userId) as UserResponse | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    logger.error('Get user error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
