// Commentary Routes — Matthew Henry Bible Commentary
import { Router, Request, Response } from 'express';

const router = Router();

// ============================================================
// Book Name → 3-letter USFM code mapping
// ============================================================
const BOOK_CODE_MAP: Record<string, string> = {
    'genesis': 'GEN', 'exodus': 'EXO', 'leviticus': 'LEV', 'numbers': 'NUM',
    'deuteronomy': 'DEU', 'joshua': 'JOS', 'judges': 'JDG', 'ruth': 'RUT',
    '1 samuel': '1SA', '2 samuel': '2SA', '1 kings': '1KI', '2 kings': '2KI',
    '1 chronicles': '1CH', '2 chronicles': '2CH', 'ezra': 'EZR', 'nehemiah': 'NEH',
    'esther': 'EST', 'job': 'JOB', 'psalms': 'PSA', 'psalm': 'PSA',
    'proverbs': 'PRO', 'ecclesiastes': 'ECC', 'song of solomon': 'SNG',
    'isaiah': 'ISA', 'jeremiah': 'JER', 'lamentations': 'LAM', 'ezekiel': 'EZK',
    'daniel': 'DAN', 'hosea': 'HOS', 'joel': 'JOL', 'amos': 'AMO',
    'obadiah': 'OBA', 'jonah': 'JON', 'micah': 'MIC', 'nahum': 'NAM',
    'habakkuk': 'HAB', 'zephaniah': 'ZEP', 'haggai': 'HAG', 'zechariah': 'ZEC',
    'malachi': 'MAL',
    'matthew': 'MAT', 'mark': 'MRK', 'luke': 'LUK', 'john': 'JHN',
    'acts': 'ACT', 'romans': 'ROM', '1 corinthians': '1CO', '2 corinthians': '2CO',
    'galatians': 'GAL', 'ephesians': 'EPH', 'philippians': 'PHP',
    'colossians': 'COL', '1 thessalonians': '1TH', '2 thessalonians': '2TH',
    '1 timothy': '1TI', '2 timothy': '2TI', 'titus': 'TIT', 'philemon': 'PHM',
    'hebrews': 'HEB', 'james': 'JAS', '1 peter': '1PE', '2 peter': '2PE',
    '1 john': '1JN', '2 john': '2JN', '3 john': '3JN', 'jude': 'JUD',
    'revelation': 'REV',
};

function getBookCode(bookName: string): string | null {
    const key = bookName.toLowerCase().trim();
    return BOOK_CODE_MAP[key] || null;
}

// ============================================================
// API Route: GET /:passage — Fetch Commentary
// ============================================================
router.get('/:passage', async (req: Request, res: Response) => {
    const { passage } = req.params;
    
    // Parse passage (e.g., "John 3", "Genesis 1:1")
    const match = passage.match(/^([\w\s]+)\s+(\d+)/i);
    if (!match) {
        return res.status(400).json({ error: 'Invalid passage format' });
    }

    const bookName = match[1].trim();
    const chapter = match[2];
    const bookCode = getBookCode(bookName);

    if (!bookCode) {
        return res.status(404).json({ error: `Book and chapter ${bookName} ${chapter} not found in commentary` });
    }

    try {
        const url = `https://bible.helloao.org/api/c/matthew-henry/${bookCode}/${chapter}.json`;
        console.log(`[commentary] Fetching Matthew Henry: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Commentary not available for this passage' });
        }

        const data = await response.json();
        
        // Flatten the commentary content for the frontend
        const chapterData = data.chapter || {};
        const content = chapterData.content || data.content || [];
        
        const flattenedContent = content.map((item: any) => {
            if (item.type === 'heading') {
                const headingText = Array.isArray(item.content) ? item.content.join(' ') : item.content;
                return `### ${headingText}`;
            }
            if (item.type === 'paragraph' || item.type === 'verse') {
                const prefix = item.type === 'verse' ? `**Verse ${item.number}:** ` : '';
                const bodyText = Array.isArray(item.content) 
                    ? item.content.map((c: any) => {
                        if (typeof c === 'string') return c;
                        if (c && c.text) return c.text;
                        return '';
                    }).join('').trim()
                    : (item.content || '').trim();
                
                return prefix + bodyText;
            }
            return '';
        }).filter(Boolean);


        return res.json({
            source: 'Matthew Henry Bible Commentary',
            reference: `${bookName} ${chapter}`,
            commentary: flattenedContent,
            fullData: data
        });
    } catch (error: any) {
        console.error('Commentary error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch commentary' });
    }
});

export default router;
