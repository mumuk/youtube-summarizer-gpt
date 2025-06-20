// services/semanticSplitter.js

import OpenAI from 'openai';
import {countTokens, trimByTokens} from './tokenCounter.js';
import dotenv from 'dotenv';

dotenv.config();
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

/**
 * Разбивает текст транскрипта на смысловые блоки, определяет язык текста и при необходимости переводит результаты.
 *
 * @param {string} text - Полный очищенный текст транскрипта.
 * @param {string} [transcriptLanguage] - Желаемый язык вывода (для заголовков и текста). Если не указан или совпадает с исходным, выводят на языке транскрипта.
 * @returns {Promise<{textLanguage: string, blocks: Array<{title: string, text: string, tokens: number}>}>}
 */
export async function splitTranscriptWithGPT(text, transcriptLanguage) {
    const model = 'gpt-4.1-mini';
    const MAX_INPUT_TOKENS = 5000;

    // Шаг 1: обрезка текста по токенам
    let inputTokens = countTokens(text);
    if (inputTokens > MAX_INPUT_TOKENS) {
        console.warn(`[splitGPT] Input tokens ${inputTokens} exceed max ${MAX_INPUT_TOKENS}, trimming by tokens.`);
        text = trimByTokens(text, MAX_INPUT_TOKENS);
        inputTokens = countTokens(text);
    }

    // Составляем системный промт согласно GPT-4.1 Prompting.md
    const systemPrompt = `Respond only with valid JSON in the format {"textLanguage": string, "blocks": [ ... ]}. No backticks, no markdown, no extra text.
Persist: Stay engaged until the task is fully complete.
Tool-first: If you need information—call a tool; do not guess.
Plan: First plan thoroughly, then execute functions.

# 🎯 Role & Goal
You are a Prompt Engineer that segments a video transcript into semantic blocks, detects original language, and optionally translates output.

# 📃 Main Rules
- Do not merge topics across blocks.
- Do not hallucinate or add fields beyond the specification.

## └─ Sub-rules
- title: up to 7 words reflecting block essence; after detection, if transcriptLanguage is provided and different, translate title.
- text: full original transcript sentences for each block (no summarization); after detection, if transcriptLanguage is provided and different, translate the text fully.
- tokens: accurate token count for the final text.

# 🎨 Language Handling
1. Detect the transcript's original language and assign it to variable "textLanguage".
2. Segment using the original text language.
3. If transcriptLanguage is provided AND differs from textLanguage, translate each block's title and text into transcriptLanguage; otherwise leave in original.

# 🧠 Algorithm
1. Detect and set textLanguage.
2. Identify semantic boundaries in the transcript.
3. Extract full sentences for each block.
4. Apply translation rules from Language Handling.
5. Count tokens for each block's final text.

# 📤 Output Format
{
  "textLanguage": string,
  "blocks": [
    { "title": string, "text": string, "tokens": number },
    ...
  ]
}

# 📚 Transcript Context
Transcript text (${inputTokens} tokens):
${text}`;

    console.log(`[splitGPT] Calling model ${model} (system tokens: ${countTokens(systemPrompt)}, transcript tokens: ${inputTokens})`);

    try {
        const response = await openai.chat.completions.create({
            model, temperature: 0.4, messages: [{role: 'system', content: systemPrompt}]
        });

        const raw = response.choices[0].message.content.trim();
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) {
            console.error('[splitGPT] No JSON object found in response:', raw);
            return {textLanguage: '', blocks: []};
        }
        return JSON.parse(match[0]);
    } catch (error) {
        console.error('[splitGPT] OpenAI request failed:', error);
        return {textLanguage: '', blocks: []};
    }
}
