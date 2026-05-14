// Authentication Routes
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SQLiteConnection } from '../database/connection.js';

const router = Router();
const db = new SQLiteConnection('./data/bible.db');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        await db.connect();
        const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, user: { id: user.id, email: user.email } });
    } catch (error: any) {
        return res.status(500).json({ error: 'Login failed' });
    } finally {
        await db.disconnect();
    }
});

router.post('/register', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    try {
        await db.connect();
        const id = crypto.randomUUID();
        const passwordHash = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [id, email, passwordHash]);
        
        const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, user: { id, email } });
    } catch (error: any) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        return res.status(500).json({ error: 'Registration failed' });
    } finally {
        await db.disconnect();
    }
});

router.get('/validate', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        await db.connect();
        const users = await db.query('SELECT id, email FROM users WHERE id = ?', [decoded.userId]);
        if (!users[0]) return res.status(401).json({ error: 'User not found' });
        return res.json({ valid: true, user: users[0] });
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    } finally {
        await db.disconnect();
    }
});

export default router;
