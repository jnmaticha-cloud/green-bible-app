/**
 * Pollinations text generation via OpenAI-compatible chat completions.
 *
 * - Create API keys (and optional Pollen balance) at https://enter.pollinations.ai
 * - Inference base URL per official docs: https://gen.pollinations.ai (enter.* is the console, not the API host)
 *
 * Env:
 *   POLLINATIONS_API_KEY — Bearer token (recommended for generation)
 *   POLLINATIONS_API_BASE — optional override, default https://gen.pollinations.ai
 *   POLLINATIONS_MODEL — optional model id, default "openai"
 */

export function getPollinationsConfig(): { baseUrl: string; apiKey: string; model: string } {
    const baseUrl = (process.env.POLLINATIONS_API_BASE || 'https://gen.pollinations.ai').replace(/\/$/, '');
    const apiKey = process.env.POLLINATIONS_API_KEY || '';
    const model = process.env.POLLINATIONS_MODEL || 'mistral';
    console.log(`[Pollinations] Config: model=${model}, hasKey=${!!apiKey}`);
    return { baseUrl, apiKey, model };
}

export type PollinationsChatOptions = {
    model?: string;
    /** Maps to response_format type json_object (include the word "JSON" in prompts per OpenAI-style APIs). */
    jsonObject?: boolean;
    signal?: AbortSignal;
};

export async function pollinationsChatText(
    systemPrompt: string,
    userContent: string,
    options?: PollinationsChatOptions
): Promise<string> {
    const { baseUrl, apiKey, model } = getPollinationsConfig();
    
    const timeout = 50000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const signal = options?.signal || controller.signal;

    try {
        // Fallback to free text API if no key is present
        if (!apiKey) {
            console.log(`[Pollinations] Using free fallback API (text.pollinations.ai)`);
            const prompt = systemPrompt ? `${systemPrompt}\n\n${userContent}` : userContent;
            const fallbackUrl = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
            
            const res = await fetch(fallbackUrl, { signal });
            if (!res.ok) {
                const errText = await res.text().catch(() => '');
                throw new Error(`Pollinations Free API ${res.status}: ${errText.slice(0, 400)}`);
            }
            return await res.text();
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        headers.Authorization = `Bearer ${apiKey}`;

        const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: userContent });

        const body: Record<string, unknown> = {
            model: options?.model || model,
            messages,
        };
        if (options?.jsonObject) {
            body.response_format = { type: 'json_object' };
        }

        const res = await fetch(`${baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal,
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`Pollinations API ${res.status}: ${errText.slice(0, 400)}`);
        }

        const data = (await res.json()) as {
            choices?: Array<{ message?: { content?: string | null } }>;
        };
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || !content.length) {
            throw new Error('Pollinations: empty or unexpected chat completion');
        }
        return content;
    } finally {
        clearTimeout(timeoutId);
    }
}
