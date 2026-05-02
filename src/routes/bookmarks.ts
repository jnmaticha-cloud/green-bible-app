// Bookmarks Routes
import { Router } from 'express';

const router = Router();

router.get('/:userId', async (req: any, res: any) => {
    res.json({ bookmarks: [] });
});

router.post('/', async (req: any, res: any) => {
    res.json({ id: 'new-bookmark-id' });
});

router.delete('/:id', async (req: any, res: any) => {
    res.json({ success: true });
});

export default router;
