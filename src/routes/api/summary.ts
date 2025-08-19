import express, { Request, Response } from 'express';
import OpenAI from 'openai';
import { countTokens } from '../../utils/tokenCounter.ts';
import { saveSummary } from '../../utils/save-summary.ts';
import { SummaryRequestBody, SummaryResponse, SummaryBlock, ErrorResponse } from '../../types.ts';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MIN_TEXT_TOKEN_LIMIT = 300;

/**
 * Генерирует краткое резюме для блока текста на указанном языке.
 */
async function summarizeBlock(text: string, language: string): Promise<string> {
    console.log('summary route');
    const systemPrompt = `Respond only with valid JSON {"summary": string}. No markdown, no backticks, no extra text.
Persist: Stay engaged until the task is fully complete.
Tool-first: If you need information—call a tool; do not guess.
Plan: First plan thoroughly, then execute functions.

# 🎯 Role & Goal
You are a Prompt Engineer that generates a concise summary (2–3 sentences).

# 🎨 Language
Summarize the following text in the "${language}" language.

# 📃 Main Rules
- If the block token count > ${MIN_TEXT_TOKEN_LIMIT}, summarize in 2–3 sentences.
- Otherwise, return the original text unchanged.

# 📤 Output Format
{"summary": string}

# 📚 Block Text
${text}`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        temperature: 0.4,
        messages: [{ role: 'system', content: systemPrompt }]
    });

    const raw = response.choices[0].message.content.trim();
    const match = raw.match(/\{"summary":\s*"([\s\S]*)"\}/);
    if (!match) return text;
    try {
        const result = JSON.parse(match[0]);
        return result.summary;
    } catch {
        return text;
    }
}

/**
 * Переводит объект блока (title, summary, text) на целевой язык.
 */
async function translateBlock(blockObj: {title: string; summary: string; text: string}, targetLanguage: string): Promise<{title: string; summary: string; text: string}> {
    const payload = JSON.stringify(blockObj);
    const systemPrompt = `Respond only with valid JSON in the same structure as input: {"title": string, "summary": string, "text": string}. No extra text.
Persist: Stay engaged until the task is fully complete.
Tool-first: If you need information—call a tool; do not guess.
Plan: First plan thoroughly, then execute functions.

# 🎯 Role & Goal
You are a Prompt Engineer that translates given JSON values into ${targetLanguage}, preserving keys.

# 📤 Input JSON
${payload}`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        temperature: 0.3,
        messages: [{ role: 'system', content: systemPrompt }]
    });

    const raw = response.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return blockObj;
    try {
        return JSON.parse(match[0]);
    } catch {
        return blockObj;
    }
}

router.post('/', async (req: Request<{}, any, SummaryRequestBody>, res: Response<SummaryResponse | ErrorResponse>) => {
    const { blocks, textLanguage, transcriptLanguage } = req.body;

    if (!Array.isArray(blocks)) {
        return res.status(400).json({ error: 'Missing or invalid "blocks" array' });
    }

    const targetLanguage = (transcriptLanguage && transcriptLanguage !== textLanguage)
        ? transcriptLanguage
        : textLanguage;

    try {
        const results: SummaryBlock[] = await Promise.all(
            blocks.map(async (block): Promise<SummaryBlock> => {
                const { title, text } = block;

                const summary = await summarizeBlock(text, targetLanguage);

                let finalTitle = title;
                let finalText = text;
                let finalSummary = summary;

                if (targetLanguage && targetLanguage !== textLanguage) {
                    const translated = await translateBlock({
                        title: finalTitle,
                        summary: finalSummary,
                        text: finalText
                    }, targetLanguage);
                    finalTitle = translated.title;
                    finalSummary = translated.summary;
                    finalText = translated.text;
                }

                const combined = `${finalTitle} ${finalSummary} ${finalText}`;
                const combinedTokens = countTokens(combined);

                return {
                    title: finalTitle,
                    summary: finalSummary,
                    text: finalText,
                    tokens: combinedTokens
                };
            })
        );

        saveSummary(results);

        return res.json({
            textLanguage,
            transcriptLanguage: targetLanguage,
            blocks: results
        });
    } catch (error) {
        console.error('[Summary Route Error]', error);
        return res.status(500).json({ error: 'Failed to generate block summaries' });
    }
});

export default router;
