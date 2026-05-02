// Green Bible App - Server Entry Point (TypeScript)
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import routes
import bibleRoutes from './src/routes/api/bibles.js';
import authRoutes from './src/routes/auth.js';
import bookmarkRoutes from './src/routes/bookmarks.js';
import commentaryRoutes from './src/routes/commentary.js';
import sermonRoutes from './src/routes/api/sermons.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for easier development with external fonts/scripts
}));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000 // Increased from 100 to 5000 to accommodate live search typing
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files — Force inline display for study materials to prevent downloads
app.use('/Bible_Books', (req, res, next) => {
    res.setHeader('Content-Disposition', 'inline');
    next();
}, express.static(path.join(__dirname, 'Bible_Books')));

app.use(express.static(__dirname));

// API Routes
app.use('/api/bibles', bibleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/commentary', commentaryRoutes);
app.use('/api/sermons', sermonRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Materials endpoint to list local PDFs and DOCs
app.get('/api/materials', (req: Request, res: Response) => {
    try {
        const booksPath = path.join(__dirname, 'Bible_Books');
        const otherPath = path.join(booksPath, 'Other Materials');
        
        const materials: any[] = [];
        
        const scanDir = (dirPath: string, category: string) => {
            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath);
                for (const file of files) {
                    if (file.endsWith('.pdf') || file.endsWith('.docx') || file.endsWith('.json')) {
                        const stats = fs.statSync(path.join(dirPath, file));
                        const isJson = file.endsWith('.json');
                        materials.push({
                            id: Buffer.from(file).toString('base64'),
                            name: file.replace(/\.(pdf|docx|json)$/, ''),
                            filename: file,
                            path: category === 'Other Materials' ? `/Bible_Books/Other Materials/${encodeURIComponent(file)}` : `/Bible_Books/${encodeURIComponent(file)}`,
                            category: isJson ? 'Complete Bible' : category,
                            size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
                            type: isJson ? 'JSON' : (file.endsWith('.pdf') ? 'PDF' : 'DOCX')
                        });
                    }
                }
            }
        };

        scanDir(booksPath, 'Local Bibles');
        scanDir(otherPath, 'Other Materials');

        res.json({ materials });
    } catch (error: any) {
        console.error('Error scanning materials:', error);
        res.status(500).json({ error: 'Failed to scan materials' });
    }
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Green Bible App server running on port ${PORT}`);
    console.log(`📖 Visit: http://localhost:${PORT}`);
});

export default app;
