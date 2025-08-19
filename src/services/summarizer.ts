// services/summarizer.js

import OpenAI from 'openai';

const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

/**
 * Normalizes blocks array into a unified format.
 *
 * For chapters: keeps title as-is.
 * For semantic: concatenates title and summary.
 *
 * @param {Array} blocks
 * @param {string} source - either 'chapters' or 'semantic'
 * @returns {Array}
 */
export function normalizeBlocks(blocks, source) {
    return blocks.map(b => {
        let title = b.title;
        if (source === 'semantic' && b.summary) {
            title = `${b.title}: ${b.summary}`;
        }
        return {
            title,
            start: b.start,
            end: b.end
        };
    });
}


/**
 * Summarise a transcript given (1) the full text and (2) an ordered blocks array.
 * @param {string}   transcript    – raw cleaned transcript text
 * @param {Array<{title: string, start: number, end: number}>} blocks
 * @param {string}   language      – 'english' (default), 'ukrainian', etc.
 */
export async function summarizeText(transcript, blocks, language = 'english') {
    const model = 'gpt-4.1-mini';

    /* ───────────── 1 ▸ Build the user prompt with explicit block markers ───────────── */
    const blocksPrompt = blocks
        .map((b, i) => `### BLOCK ${i + 1}: ${b.title || 'Untitled'}\n[start:${b.start}s – end:${b.end}s]`)
        .join('\n\n');

    const userPrompt = `
# Transcript Blocks (use as skeleton – DO NOT merge)
${blocksPrompt}

# Full Transcript Text
${transcript}
`.trim();

    /* ───────────── 2 ▸ System prompt follows GPT‑4.1 playbook ───────────── */
    const systemPrompt = `
# Role & Goal
You are an expert assistant that turns video transcripts into structured Markdown summaries.

# High‑Level Instructions
- Use *one* section per input block and keep the order.
- Do NOT group or merge topics across blocks.
- No hallucinations: rely only on the transcript.

# Mandatory Reminders
1. First think step‑by‑step and outline your plan.
2. If data are missing, ask – do not invent.

# Output Format
- Start each section with '## ' followed by the block's title.
- Write 2–5 sentences per paragraph.
- Separate paragraphs with **two** blank lines.
- Place '---' after every section.

Language: ${language}
`.trim();

    /* ───────────── 3 ▸ Call GPT‑4.1‑mini ───────────── */
    const estimated = blocks.length * 140;            // ≈ tokens needed
    const response = await openai.chat.completions.create({
        model,
        temperature: 0,
        max_tokens: Math.min(2500, estimated + 200),   // allow full text
        messages: [
            {role: 'system', content: systemPrompt},
            {role: 'user', content: userPrompt}
        ]
    });

    let summary = response.choices[0].message.content.trim();

    /* ───────────── 4 ▸ Post‑processing for Obsidian / Markdown ───────────── */
    summary = summary
        .replace(/\r\n/g, '\n')          // CRLF ⇒ LF
        .replace(/\u00A0/g, ' ')         // NBSP ⇒ нормальный пробел
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[^\S\r\n]+/g, ' ')     // схлопнуть множественные пробелы
        .replace(/\n{2,}/g, '\n\n\n')    // любые 2+ \n → ровно 3 (\n\n\n)
        .replace(/^\s*/gm, '')           // убрать ведущие пробелы в каждой строке
        .trim();

    /* ───────────── 5 ▸ Optional: hard check section count ───────────── */
    const expected = blocks.length;
    const produced = (summary.match(/^## /gm) || []).length;
    if (produced !== expected) {
        console.warn(`⚠️ GPT returned ${produced} sections, expected ${expected}`);
        // throw new Error(...) or re‑try if strict compliance is required
    }

    return summary;
}