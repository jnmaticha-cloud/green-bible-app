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
        
        ### Executive Summary
        (One sentence capturing the essence)
        
        ### Historical & Literary Context
        (Explain the background, authorship, and setting)
        
        ### Theological Classification
        (Categorize the primary themes e.g. Covenant, Grace, Justice)
        
        ### Spiritual Significance
        (Explain the core eternal truths)
        
        ### Devotional Application
        (Practical steps for today's believer)
        
        Use clean markdown. No emojis. Keep it under 400 words.`;

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
        // Step 1: Use the AI as a "Theological Art Director" to design a specific scene
        const artDirectorPrompt = `You are a world-class religious artist and theologian. Design a highly detailed, cinematic art prompt for a digital masterpiece that captures the deep spiritual meaning of the Bible verse: ${reference}.
        
        The scene should describe:
        - A powerful central symbolic image (e.g., a cross, divine light, a scriptural scene).
        - Atmosphere and lighting (e.g., ethereal, golden hour, divine radiance, dramatic shadows).
        - Artistic style (e.g., hyper-realistic, oil painting, cinematic digital art).
        - IMPORTANT: Explicitly state that there should be NO TEXT, letters, words, or watermarks in the image.
        
        Output ONLY the descriptive art prompt text. No introduction, no conversational filler.`;
        
        const systemPrompt = 'You are a theological art director. You design sacred, symbolic, and text-free art prompts.';
        
        let artPrompt: string;
        try {
            artPrompt = await pollinationsChatText(systemPrompt, artDirectorPrompt);
        } catch (promptErr) {
            console.warn('[AI Art] Failed to generate designer prompt:', promptErr);
            artPrompt = `Reverent, sacred biblical illustration of ${reference}. Ethereal lighting, cinematic digital art, divine atmosphere, strictly no text.`;
        }

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
