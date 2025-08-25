// utils/safeJsonParse.js
// ------------------------------------------------------------
// Safe JSON parser for GPT responses.
// Extracts the first valid JSON object or array from a string,
// trims markdown wrappers, and parses safely.
// ------------------------------------------------------------

/**
 * Attempts to safely extract and parse JSON from GPT output.
 */
export function safeJsonParse<T = unknown>(
    raw: string,
    { expectArray = false }: { expectArray?: boolean } = {}
): T | null {
    if (!raw || typeof raw !== "string") return null;

    let cleaned: string = raw.trim();

    // Убираем Markdown-код блоки: ```json ... ```
    cleaned = cleaned.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();

    // Выбираем регулярку для поиска JSON
    const regex = expectArray ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
    const match = cleaned.match(regex);
    if (!match) {
        console.error("[safeJsonParse] No JSON detected in:", cleaned.slice(0, 200));
        return null;
    }

    try {
        return JSON.parse(match[0]);
    } catch (e) {
        console.error("[safeJsonParse] JSON.parse failed:", e, "raw:", cleaned.slice(0, 200));
        return null;
    }
}
