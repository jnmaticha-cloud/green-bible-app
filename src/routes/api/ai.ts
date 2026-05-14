import { Router, Request, Response } from 'express';
import { pollinationsChatText } from '../../lib/pollinationsClient.js';

const router = Router();

// API Route: GET /interpret — AI-powered verse interpretation
router.get('/interpret', async (req: Request, res: Response) => {
    const { reference } = req.query;
    console.log(`[AI Interpret] Request for reference: ${reference}`);
    if (!reference) {
        return res.status(400).json({ error: 'Reference is required' });
    }

    try {
        const userPrompt = `You are a world-class Bible scholar. Provide a deep, inspiring, and classified interpretation of the Bible verse: ${reference}. 
        
        Format your response with these EXACT sections:
        
        ### 📖 Executive Summary
        (One sentence capturing the essence)
        
        ### 🏛️ Historical & Literary Context
        (Explain the background, authorship, and setting)
        
        ### 🛡️ Theological Classification
        (Categorize the primary themes e.g. Covenant, Grace, Justice)
        
        ### 💎 Spiritual Significance
        (Explain the core eternal truths)
        
        ### 🕊️ Devotional Application
        (Practical steps for today's believer)
        
        Use markdown for formatting. Keep it under 400 words.`;

        const systemPrompt = 'You are a wise and encouraging Bible scholar. Provide structured, accurate, and faith-building interpretations.';
        
        let interpretation = '';
        try {
            interpretation = await pollinationsChatText(systemPrompt, userPrompt);
        } catch (aiError) {
            console.warn(`[AI Interpret] AI fetch failed, using fallback notice:`, aiError);
            interpretation = `### Wisdom Temporarily Veiled\n\nThe celestial insights for **${reference}** are currently being gathered. Please try again in a few moments.\n\n*Tip: The free AI service may be experiencing high demand.*`;
        }
        
        return res.json({ 
            reference: String(reference), 
            interpretation 
        });
    } catch (error: any) {
        console.error('Interpretation route critical error:', error.message);
        return res.status(500).json({ error: 'Failed to generate celestial interpretation' });
    }
});

// API Route: GET /art — Generate sacred art prompt/meta (enhanced)
router.get('/art', async (req: Request, res: Response) => {
    const { reference } = req.query;
    if (!reference) {
        return res.status(400).json({ error: 'Reference is required' });
    }

    try {
        // First, ask the AI for a concise summary of the verse's core message.
        const summaryPrompt = `Provide a one‑sentence, theologically accurate summary of the biblical passage ${reference}. Do not include any extra commentary.`;
        const systemPrompt = 'You are a concise biblical scholar. Output only the summary text, no markdown.';
        let verseSummary: string;
        try {
            verseSummary = await pollinationsChatText(systemPrompt, summaryPrompt);
        } catch (summaryErr) {
            console.warn('[AI Art] Failed to get verse summary:', summaryErr);
            // Fallback: use the reference itself as a vague descriptor.
            verseSummary = `${reference}`;
        }

        const artPrompt = `Create a reverent, sacred artwork that visually captures the core message of this verse: "${verseSummary}". Emphasize symbolic elements (e.g., a cross for salvation, a heart for love) and use a divine, ethereal atmosphere.`;
        return res.json({ reference: String(reference), artPrompt });
    } catch (error: any) {
        console.error('[AI Art] Unexpected error:', error);
        return res.status(500).json({ error: 'Failed to generate art meta' });
    }
});

// API Route: GET /search — AI-powered theological search/question answering
router.get('/search', async (req: Request, res: Response) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query is required' });

    try {
        const userPrompt = `A user has asked a deep spiritual or theological question: "${q}". 
        1. Provide a concise, profound, and encouraging answer (2-3 sentences).
        2. List 5-7 most relevant Bible verses that address this question.
        
        Output ONLY a JSON object:
        {
            "answer": "Your spiritual insight here",
            "verses": ["Book Chapter:Verse", "Book Chapter:Verse"]
        }`;

        const systemPrompt = 'You are a wise biblical scholar. Help users find scripture and meaning. Output ONLY JSON.';
        
        const raw = await pollinationsChatText(systemPrompt, userPrompt, { jsonObject: true });
        const data = JSON.parse(raw);
        
        return res.json({ 
            query: String(q), 
            answer: data.answer,
            verses: data.verses || []
        });
    } catch (error: any) {
        console.error('AI search error:', error.message);
        return res.status(500).json({ error: 'The Divine Insight AI is currently reflecting. Please try again later.' });
    }
});

export default router;
