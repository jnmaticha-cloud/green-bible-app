const fs = require('fs');
const path = require('path');

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
        const response = await fetch('https://text.pollinations.ai/' + encodeURIComponent(prompt));
        const text = await response.text();
        
        // Extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in AI response");
        
        const interpretation = JSON.parse(jsonMatch[0]);

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
