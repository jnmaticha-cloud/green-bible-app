// Bookmarks Routes
import { Router, Request, Response } from 'express';
import { SQLiteConnection } from '../database/connection.js';

const router = Router();
const db = new SQLiteConnection('./data/bible.db');

router.get('/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        await db.connect();
        const bookmarks = await db.query('SELECT * FROM bookmarks WHERE user_id = ?', [userId]);
        return res.json({ bookmarks });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to fetch bookmarks' });
    } finally {
        await db.disconnect();
    }
});

router.post('/', async (req: Request, res: Response) => {
    const { userId, version, book, chapter, verse, note } = req.body;
    const id = crypto.randomUUID();
    try {
        await db.connect();
        await db.query(
            'INSERT INTO bookmarks (id, user_id, version, book, chapter, verse, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, userId, version, book, chapter, verse, note]
        );
        return res.json({ id });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to create bookmark' });
    } finally {
        await db.disconnect();
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await db.connect();
        await db.query('DELETE FROM bookmarks WHERE id = ?', [id]);
        return res.json({ success: true });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to delete bookmark' });
    } finally {
        await db.disconnect();
    }
});

export default router;
