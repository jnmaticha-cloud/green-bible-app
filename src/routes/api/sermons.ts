import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { YoutubeTranscript } from 'youtube-transcript';

function formatTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `[${minutes}:${seconds.toString().padStart(2, '0')}]`;
}

const router = Router();
console.log('📂 Sermons Router Loaded');
const SERMONS_DATA_DIR = path.join(process.cwd(), 'data', 'sermons');
const METADATA_FILE = path.join(SERMONS_DATA_DIR, 'metadata.json');

// GET /sermons
router.get('/', async (req: Request, res: Response) => {
    try {
        const metadataRaw = await fs.readFile(METADATA_FILE, 'utf-8');
        let allSermons = JSON.parse(metadataRaw);
        
        // Enrich metadata with summary and date from individual files if missing
        const enrichedSermons = await Promise.all(allSermons.map(async (s: any) => {
            if (s.summary && s.date) return s;
            try {
                const detailPath = path.join(SERMONS_DATA_DIR, `${s.id}.json`);
                const detailRaw = await fs.readFile(detailPath, 'utf-8');
                const detail = JSON.parse(detailRaw);
                return { 
                    ...s, 
                    summary: detail.summary || detail.interpretation?.summary || "", 
                    date: detail.date 
                };
            } catch {
                return s;
            }
        }));

        return res.json({
            totalItems: enrichedSermons.length,
            sermons: enrichedSermons
        });
    } catch (error: any) {
        console.error('Sermons API error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch sermons' });
    }
});

// POST /sermons/ingest
router.post('/ingest', async (req: Request, res: Response) => {
    let { url, title, transcript } = req.body;
    if (!url || !title) {
        return res.status(400).json({ error: 'Missing required fields: url, title' });
    }

    if (title.toUpperCase().includes('ROAR')) {
        return res.status(400).json({ error: 'Sermons containing "ROAR" are restricted and cannot be captured.' });
    }

    const youtubeIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v\/|.*u\/\w\/|embed\/|watch\?v=))([^#\&\?]*)/);
    const youtubeId = youtubeIdMatch ? youtubeIdMatch[1] : null;

    if (!youtubeId || youtubeId.length !== 11) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        // Auto-fetch verbatim transcript if missing
        if (!transcript) {
            console.log(`[Ingest] Fetching verbatim transcript for ${youtubeId}...`);
            try {
                const rawTranscript = await YoutubeTranscript.fetchTranscript(youtubeId);
                let currentBlock = [];
                let lastTimestamp = -1;
                let finalLines = [];

                for (let i = 0; i < rawTranscript.length; i++) {
                    const item = rawTranscript[i];
                    const currentSecs = Math.floor(item.offset / 1000);
                    if (lastTimestamp === -1 || currentSecs - lastTimestamp >= 20 || i === rawTranscript.length - 1) {
                        if (currentBlock.length > 0) {
                            finalLines.push(`${formatTime(lastTimestamp * 1000)} ${currentBlock.join(' ')}`);
                        }
                        currentBlock = [item.text];
                        lastTimestamp = currentSecs;
                    } else {
                        currentBlock.push(item.text);
                    }
                }
                transcript = finalLines.join('\n\n');
            } catch (err) {
                console.error('Verbatim fetch failed, falling back to manual or summary:', err);
            }
        }

        if (!transcript) {
             return res.status(400).json({ error: 'No transcript provided and auto-fetch failed.' });
        }

        // 1. Call AI for interpretation
        const prompt = `You are a biblical scholar. Analyze this sermon transcript and provide a structured interpretation.
Title: ${title}
Transcript: ${transcript.substring(0, 4000)}

Output ONLY a JSON object:
{
  "summary": "Brief 2-3 sentence overview",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "biblical_themes": ["Theme A", "Theme B"],
  "scriptures": ["Book Chapter:Verse", "Book Chapter:Verse"]
}`;

        const aiResponse = await fetch('https://text.pollinations.ai/' + encodeURIComponent(prompt));
        const aiText = await aiResponse.text();
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI failed to return JSON interpretation");
        const interpretation = JSON.parse(jsonMatch[0]);

        const sermonData = {
            id: youtubeId,
            title,
            url,
            speaker: "Pastor John Anosike",
            date: req.body.date || new Date().toISOString().split('T')[0],
            transcript,
            summary: interpretation.summary,
            interpretation
        };

        // 2. Save individual JSON
        const filePath = path.join(SERMONS_DATA_DIR, `${youtubeId}.json`);
        await fs.writeFile(filePath, JSON.stringify(sermonData, null, 2));

        // 3. Update metadata.json
        const metadataRaw = await fs.readFile(METADATA_FILE, 'utf-8');
        let metadata = JSON.parse(metadataRaw);
        metadata = metadata.filter((m: any) => m.id !== youtubeId);
        metadata.unshift({ id: youtubeId, title, url, summary: sermonData.summary, date: sermonData.date, status: "processed" });
        await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));

        return res.json({ success: true, id: youtubeId });
    } catch (error: any) {
        console.error('Ingestion error:', error.message);
        return res.status(500).json({ error: 'Failed to process sermon', details: error.message });
    }
});

// GET /sermons/search?q=...
router.get('/search', async (req: Request, res: Response) => {
    console.log(`🔍 Sermon Search Query: ${req.query.q}`);
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        return res.json({ sermons: [] });
    }

    try {
        const query = q.toLowerCase().trim();
        // Split into keywords, filtering common stop words
        const stopWords = new Set(['the', 'a', 'an', 'of', 'in', 'to', 'and', 'or', 'by', 'for', 'is', 'it', 'on', 'at', 'be', 'as', 'with', 'that', 'this', 'from']);
        const rawKeywords = query.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
        
        // Simple stemmer: strip common English suffixes to broaden matching
        const stem = (word: string): string => {
            return word
                .replace(/(?:tion|sion|ment|ness|ence|ance)$/i, '')
                .replace(/(?:ful|less|able|ible|ous|ive|ity)$/i, '')
                .replace(/(?:ing|ings|ed|er|est|ly|al|es|s)$/i, '')
                || word;
        };
        
        // Build search terms: original keywords + their stems (deduplicated)
        const keywords = [...new Set(rawKeywords.flatMap(kw => {
            const stemmed = stem(kw);
            return stemmed.length >= 3 ? [kw, stemmed] : [kw];
        }))];
        
        const files = await fs.readdir(SERMONS_DATA_DIR);
        const sermonFiles = files.filter(f => f.endsWith('.json') && f !== 'metadata.json');
        
        const results: any[] = [];
        
        for (const file of sermonFiles) {
            try {
                const contentRaw = await fs.readFile(path.join(SERMONS_DATA_DIR, file), 'utf-8');
                const s = JSON.parse(contentRaw);
                
                const titleLower = (s.title || '').toLowerCase();
                const summaryText = (s.summary || s.interpretation?.summary || '').toLowerCase();
                const transcriptLower = (s.transcript || '').toLowerCase();
                const themesLower = (s.interpretation?.biblical_themes || []).join(' ').toLowerCase();
                const keyPointsLower = (s.interpretation?.key_points || []).join(' ').toLowerCase();
                const allText = `${titleLower} ${summaryText} ${transcriptLower} ${themesLower} ${keyPointsLower}`;
                
                // Check exact phrase first (highest priority)
                const exactMatch = allText.includes(query);
                
                // Then check individual keywords
                let matchedKeywords = 0;
                let titleMatches = 0;
                for (const kw of keywords) {
                    if (allText.includes(kw)) matchedKeywords++;
                    if (titleLower.includes(kw)) titleMatches++;
                }
                
                // Require at least 1 keyword (or its stem) to match
                const threshold = Math.max(1, Math.ceil(rawKeywords.length * 0.3));
                
                if (exactMatch || matchedKeywords >= threshold) {
                    // Score: exact match = 100, then keyword ratio + title bonus
                    const score = exactMatch ? 100 : (matchedKeywords / keywords.length * 50) + (titleMatches * 10);
                    
                    let matchType = 'transcript';
                    if (titleLower.includes(query) || titleMatches > 0) matchType = 'title';
                    else if (summaryText.includes(query) || (summaryText && keywords.some(kw => summaryText.includes(kw)))) matchType = 'summary';
                    
                    results.push({
                        id: s.id,
                        title: s.title,
                        summary: s.summary || s.interpretation?.summary || '',
                        date: s.date,
                        speaker: s.speaker,
                        url: s.url,
                        matchType,
                        score,
                        matchedKeywords
                    });
                }
            } catch (err) {
                console.error(`Error reading sermon file ${file}:`, err);
            }
        }
        
        // Sort by score descending, then by date
        results.sort((a, b) => b.score - a.score || new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return res.json({ 
            totalItems: results.length,
            query: q,
            keywords,
            sermons: results
        });
    } catch (error: any) {
        console.error('Sermon search error:', error.message);
        return res.status(500).json({ error: 'Failed to search sermons' });
    }

});

// GET /sermons/:id
router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const filePath = path.join(SERMONS_DATA_DIR, `${id}.json`);
        const sermonDataRaw = await fs.readFile(filePath, 'utf-8');
        const sermonData = JSON.parse(sermonDataRaw);

        return res.json(sermonData);
    } catch (error: any) {
        console.error(`Sermon detail error [id=${id}]:`, error.message);
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Sermon not found or not yet processed' });
        }
        return res.status(500).json({ error: 'Failed to fetch sermon details' });
    }
});

// GET /sermons/mentions/:book/:chapter/:verse
router.get('/mentions/:book/:chapter/:verse', async (req: Request, res: Response) => {
    const { book, chapter, verse } = req.params;
    const targetRef = `${book} ${chapter}:${verse}`.toLowerCase();
    const targetRefShort = `${book} ${chapter}`.toLowerCase(); // To match chapter-level mentions

    try {
        const files = await fs.readdir(SERMONS_DATA_DIR);
        const sermonFiles = files.filter(f => f.endsWith('.json') && f !== 'metadata.json');
        
        const mentions: any[] = [];
        
        for (const file of sermonFiles) {
            try {
                const contentRaw = await fs.readFile(path.join(SERMONS_DATA_DIR, file), 'utf-8');
                const s = JSON.parse(contentRaw);
                
                const scriptures = s.interpretation?.scriptures || [];
                const isMentioned = scriptures.some((ref: string) => {
                    const r = ref.toLowerCase();
                    return r.includes(targetRef) || (verse === 'null' && r.includes(targetRefShort));
                });

                if (isMentioned) {
                    mentions.push({
                        id: s.id,
                        title: s.title,
                        summary: s.summary || s.interpretation?.summary || '',
                        date: s.date,
                        speaker: s.speaker,
                        url: s.url,
                        timestamp: scriptures.find((ref: string) => ref.toLowerCase().includes(targetRef)) || null
                    });
                }
            } catch (err) {
                // Skip corrupted files
            }
        }

        return res.json({ 
            reference: `${book} ${chapter}:${verse}`,
            totalMentions: mentions.length,
            sermons: mentions 
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to search sermon mentions' });
    }
});

export default router;

