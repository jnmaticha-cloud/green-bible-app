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
import aiRoutes from './src/routes/api/ai.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for easier development with external fonts/scripts
}));

// CORS — restrict to known origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:8080'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, same-origin)
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));

// Simple request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Rate limiting — tiered by route sensitivity
const defaultLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

// Live search fires on every keystroke — allow higher throughput
const searchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120, // 2 searches/sec sustained
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Search rate limit exceeded, please slow down.' },
});

// Auth endpoints — strict to prevent brute force
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts, please try again later.' },
});

app.use(defaultLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files — Force inline display for study materials to prevent downloads
app.use('/Bible_Books', (req, res, next) => {
    res.setHeader('Content-Disposition', 'inline');
    next();
}, express.static(path.join(__dirname, 'Bible_Books')));

// Serve app.js and app-*.js with no-cache so browser always gets the latest version
app.use((req, res, next) => {
    if (/^\/(app|styles)(\.[\w]+)?\.js$/.test(req.path) || req.path === '/styles.css') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

app.use(express.static(__dirname));

// Serve downloaded audio files
app.use('/audio', express.static(path.join(__dirname, 'data', 'sermons')));
// API Routes — apply tiered rate limits
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/bibles/search', searchLimiter);
app.use('/api/bibles', bibleRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/commentary', commentaryRoutes);
app.use('/api/sermons', sermonRoutes);
app.use('/api/ai', aiRoutes);

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
