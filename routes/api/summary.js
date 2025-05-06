import express from 'express';
import OpenAI from 'openai';
import { countTokens } from '../../services/tokenCounter.js';
import { saveSummary } from '../../utils/save-summary.js';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MIN_TEXT_TOKEN_LIMIT = 300;

/**
 * Генерирует краткое резюме для блока текста на указанном языке.
 * @param {string} text - Текст блока.
 * @param {string} language - Целевой язык для саммари.
 * @returns {Promise<string>} - Сгенерированное резюме или оригинальный текст.
 */
async function summarizeBlock(text, language) {
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
 * @param {{title: string, summary: string, text: string}} blockObj
 * @param {string} targetLanguage
 * @returns {Promise<{title: string, summary: string, text: string}>}
 */
async function translateBlock(blockObj, targetLanguage) {
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

router.post('/', async (req, res) => {
    const { blocks, textLanguage, transcriptLanguage } = req.body;

    if (!Array.isArray(blocks)) {
        return res.status(400).json({ error: 'Missing or invalid "blocks" array' });
    }

    // Определяем целевой язык вывода
    const targetLanguage = (transcriptLanguage && transcriptLanguage !== textLanguage)
        ? transcriptLanguage
        : textLanguage;

    try {
        // Генерируем summary и переводим при необходимости для каждого блока параллельно
        const results = await Promise.all(
            blocks.map(async (block) => {
                const { title, text, tokens } = block;

                // Генерируем summary на targetLanguage, встроенная проверка MIN_TEXT_TOKEN_LIMIT
                const summary = await summarizeBlock(text, targetLanguage);

                let finalTitle = title;
                let finalText = text;
                let finalSummary = summary;

                // Перевод title и text, если targetLanguage отличается от оригинального
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

                // Подсчёт токенов для всего объекта
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

        // Сохраняем результат в Markdown
        saveSummary(results);

        // Отправляем ответ
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
