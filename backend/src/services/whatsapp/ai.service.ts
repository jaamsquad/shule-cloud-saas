/**
 * AI replies for the chatbot's "Ask AI" option.
 *
 * Forwards the user's question to a local Ollama instance (configurable via
 * OLLAMA_URL / OLLAMA_MODEL). Times out and degrades gracefully so a missing or
 * slow model never hangs a WhatsApp conversation.
 */
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const AI_TIMEOUT_MS = 25_000;

const SYSTEM_PREAMBLE =
    'You are ShuleCloud School Assistant, a concise helpful assistant for parents. ' +
    'Answer briefly and politely. If asked about a specific child\'s private data ' +
    '(fees, marks, attendance), tell them to use the menu options instead.';

export async function askAI(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
        const resp = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: `${SYSTEM_PREAMBLE}\n\nParent: ${prompt}\nAssistant:`,
                stream: false,
            }),
            signal: controller.signal,
        });
        if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`);
        const data: any = await resp.json().catch(() => ({}));
        const text = String(data?.response || '').trim();
        return text || "I couldn't generate a response right now. Please try again.";
    } catch (e: any) {
        if (e?.name === 'AbortError') return 'The assistant took too long to respond. Please try again.';
        return 'The AI assistant is unavailable right now. Reply 0 to go back to the menu.';
    } finally {
        clearTimeout(timer);
    }
}
