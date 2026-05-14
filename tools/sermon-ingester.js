const fs = require('fs');
const path = require('path');

/** Pollinations chat (keys: https://enter.pollinations.ai; API host: gen.pollinations.ai) */
async function pollinationsChatText(systemPrompt, userContent, options = {}) {
    const base = (process.env.POLLINATIONS_API_BASE || 'https://gen.pollinations.ai').replace(/\/$/, '');
    const key = process.env.POLLINATIONS_API_KEY || '';
    const model = process.env.POLLINATIONS_MODEL || 'openai';
    const headers = { 'Content-Type': 'application/json' };
    if (key) headers.Authorization = `Bearer ${key}`;
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userContent });
    const body = { model, messages };
    if (options.jsonObject) body.response_format = { type: 'json_object' };
    const res = await fetch(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Pollinations ${res.status}: ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    const c = data.choices?.[0]?.message?.content;
    if (typeof c !== 'string') throw new Error('Invalid Pollinations response');
    return c;
}

const SERMONS_DATA_DIR = path.join(__dirname, '..', 'data', 'sermons');
const METADATA_FILE = path.join(SERMONS_DATA_DIR, 'metadata.json');

async function processSermon(url, title, transcript) {
    const youtubeId = extractYoutubeId(url);
    if (!youtubeId) {
        console.error("Invalid YouTube URL");
        return;
    }

    console.log(`[Ingester] Processing sermon: ${title} (${youtubeId})`);

    const prompt = `You are a biblical scholar. Analyze this sermon transcript and provide a structured interpretation.
Title: ${title}
Transcript: ${transcript.substring(0, 4000)}

Output ONLY a JSON object with this structure:
{
  "summary": "Brief 2-3 sentence overview",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "biblical_themes": ["Theme A", "Theme B"],
  "scriptures": ["Book Chapter:Verse", "Book Chapter:Verse"]
}`;

    try {
        console.log("[Ingester] Calling AI for interpretation...");
        const systemPrompt =
            'You are a biblical scholar. Output ONLY valid JSON matching the structure requested. No markdown.';
        const text = await pollinationsChatText(systemPrompt, prompt, { jsonObject: true });
        const interpretation = JSON.parse(text);

        let publishDate = new Date().toISOString().split('T')[0];
        try {
            const ytResponse = await fetch(url);
            const html = await ytResponse.text();
            const dateMatch = html.match(/<meta itemprop="datePublished" content="([^"]+)">/);
            if (dateMatch) publishDate = dateMatch[1];
        } catch (e) {
            console.warn("[Ingester] Could not fetch YT date, using current date.");
        }

        const sermonData = {
            id: youtubeId,
            title: title,
            url: url,
            speaker: "Pastor John Anosike",
            date: publishDate,
            transcript: transcript,
            summary: interpretation.summary,
            interpretation: interpretation
        };

        // Save individual JSON
        const filePath = path.join(SERMONS_DATA_DIR, `${youtubeId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(sermonData, null, 2));
        console.log(`[Ingester] Saved sermon data to ${filePath}`);

        // Update metadata
        let metadata = [];
        if (fs.existsSync(METADATA_FILE)) {
            metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
        }
        
        // Remove existing if same ID
        metadata = metadata.filter(m => m.id !== youtubeId);
        metadata.unshift({
            id: youtubeId,
            title: title,
            url: url,
            status: "processed"
        });

        fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
        console.log(`[Ingester] Updated metadata.json`);

    } catch (error) {
        console.error("[Ingester] Error:", error.message);
    }
}

function extractYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length == 11) ? match[2] : null;
}

// CLI Support
const args = process.argv.slice(2);
if (args.length >= 3) {
    processSermon(args[0], args[1], args[2]);
} else {
    console.log("Usage: node tools/sermon-ingester.js <URL> <TITLE> <TRANSCRIPT>");
}
