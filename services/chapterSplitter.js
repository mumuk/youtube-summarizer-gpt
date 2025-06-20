// services/chapterSplitter.js

import OpenAI from 'openai';
import { countTokens, trimByTokens } from './tokenCounter.js';
import dotenv from 'dotenv';


dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
/**
 * Разбивает транскрипт по главам YouTube, определяет язык текста и при необходимости переводит результаты.
 *
 * @param {Array<{title: string, start: number, end?: number}>} chapters - Массив глав из YouTube API.
 * @param {string} rawText - Полный очищенный текст транскрипта.
 * @param {string} [transcriptLanguage] - Желаемый язык вывода (для заголовков и текста). Если не указан или совпадает с исходным, выводят на языке транскрипта.
 * @returns {Promise<{textLanguage: string, chapters: Array<{title: string, text: string, tokens: number}>}>}
 */
export async function splitTranscriptByChapters(chapters, rawText, transcriptLanguage) {
    const model = 'gpt-4.1-mini';
    const MAX_INPUT_TOKENS = 5000;

    // Обрезка текста по токенам при необходимости
    let inputTokens = countTokens(rawText);
    if (inputTokens > MAX_INPUT_TOKENS) {
        console.warn(
            `[chapterSplitter] Input tokens ${inputTokens} exceed max ${MAX_INPUT_TOKENS}, trimming by tokens.`
        );
        rawText = trimByTokens(rawText, MAX_INPUT_TOKENS);
        inputTokens = countTokens(rawText);
    }

    // Системное сообщение согласно GPT-4.1 Prompting.md
    const systemPrompt = `Ensure output is strictly valid JSON without trailing commas. Respond only with a JSON object in the format {"textLanguage": string, "chapters": [...]}. No backticks, markdown, or extra text.
Persist: Stay engaged until the task is fully complete.
Tool-first: If you need information—call a tool; do not guess.
Plan: First plan thoroughly, then execute functions.

# 🎯 Role & Goal
You are a Prompt Engineer that splits a video transcript into semantic blocks based on provided YouTube chapters, detects the original language, and optionally translates output.

# 📃 Main Rules
- Do not merge content between chapters.
- Do not hallucinate or add fields beyond the specification.

## └─ Sub-rules
- title: use chapter.title; up to 7 words; if transcriptLanguage differs, translate.
- text: full original transcript sentences; if transcriptLanguage differs, translate.
- tokens: accurate token count for final text.

# 🎨 Language Handling
1. Detect the transcript's original language and assign to "textLanguage".
2. Segment using that original language.
3. If transcriptLanguage provided AND differs, translate title and text to that language.

# 🧠 Algorithm
1. Detect and set textLanguage.
2. Iterate chapters in order; extract sentences by timestamps.
3. Build blocks with title, text, tokens.
4. Apply translation rules.

# 📤 Output Format
{  "textLanguage": string,  "blocks": [    { "title": string, "text": string, "tokens": number },    ...  ]}

# 📚 External Context
Chapters: ${JSON.stringify(chapters)}

Transcript text (${inputTokens} tokens):
${rawText}`;

    console.log(
        `[chapterSplitter] Calling model ${model} (system tokens: ${countTokens(systemPrompt)}, transcript tokens: ${inputTokens})`
    );

    try {
        const response = await openai.chat.completions.create({
            model,
            temperature: 0.4,
            messages: [{ role: 'system', content: systemPrompt }]
        });

        const raw = response.choices[0].message.content.trim();
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) {
            console.error('[chapterSplitter] No JSON found in response:', raw);
            return { textLanguage: '', chapters: [] };
        }

        // Убираем возможные trailing commas
        let jsonString = match[0]
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');

        const parsed = JSON.parse(jsonString);
        return parsed;
    } catch (error) {
        console.error('[chapterSplitter] OpenAI request failed:', error);
        return { textLanguage: '', chapters: [] };
    }
}
