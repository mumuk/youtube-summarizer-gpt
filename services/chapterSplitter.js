// services/chapterSplitter.js

import OpenAI from 'openai';
import { countTokens, trimByTokens } from './tokenCounter.js';

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

    // Составляем системный промт согласно GPT‑4.1 Prompting.md
    const systemPrompt = `Respond only with valid JSON in the format {"textLanguage": string, "chapters": [ ... ]}. No backticks, no markdown, no extra text.
Persist: Stay engaged until the task is fully complete.
Tool-first: If you need information—call a tool; do not guess.
Plan: First plan thoroughly, then execute functions.

# 🎯 Role & Goal
You are a Prompt Engineer that splits a video transcript into semantic blocks based on provided YouTube chapters, detects original language, and optionally translates output.

# 📃 Main Rules
- Do not merge content between chapters.
- Do not hallucinate or add fields beyond the specification.

## └─ Sub-rules
- title: use the chapter title; after detection, if transcriptLanguage is provided and different, translate title (up to 7 words).
- text: use full original transcript sentences for the chapter; after detection, if transcriptLanguage is provided and different, translate the text fully.
- tokens: accurate token count for the final text.// services/chapterSplitter.js

import OpenAI from 'openai';
import { countTokens, trimByTokens } from './tokenCounter.js';

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

  // Truncate text if too long
  let inputTokens = countTokens(rawText);
  if (inputTokens > MAX_INPUT_TOKENS) {
    console.warn(
      \`[chapterSplitter] Input tokens ${inputTokens} exceed max ${MAX_INPUT_TOKENS}, trimming.\`
    );
    rawText = trimByTokens(rawText, MAX_INPUT_TOKENS);
    inputTokens = countTokens(rawText);
  }

  // Prepare system prompt: strict JSON, no trailing commas
  const systemPrompt = \`Ensure output is strictly valid JSON without trailing commas. Respond only with a JSON object in the format {"textLanguage": string, "chapters": [...]}. No backticks, markdown, or extra text.
Persist: Stay engaged until the task is fully complete.
Tool-first: If you need information—call a tool; do not guess.
Plan: First plan thoroughly, then execute functions.

# 🎯 Role & Goal
You are a Prompt Engineer that splits a video transcript into semantic blocks based on provided YouTube chapters, detects original language, and optionally translates output.

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
{
  "textLanguage": string,
  "chapters": [
    { "title": string, "text": string, "tokens": number },
    ...
  ]
}

# 📚 External Context
Chapters: ${JSON.stringify(chapters)}

Transcript text (${inputTokens} tokens):
${rawText}\`;

  console.log(
    \`[chapterSplitter] Calling model ${model} (system tokens: ${countTokens(systemPrompt)}, transcript tokens: ${inputTokens})\`
  );

  try {
    const response = await openai.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [{ role: 'system', content: systemPrompt }]
    });

    const raw = response.choices[0].message.content.trim();
    const match = raw.match(/\\{[\\s\\S]*\\}/);
    if (!match) {
      console.error('[chapterSplitter] No JSON found in response:', raw);
      return { textLanguage: '', chapters: [] };
    }

    // Remove trailing commas before parse
    let jsonString = match[0]
      .replace(/,\\s*]/g, ']')
      .replace(/,\\s*}/g, '}');

    const parsed = JSON.parse(jsonString);
    return parsed;
  } catch (error) {
    console.error('[chapterSplitter] OpenAI request failed:', error);
    return { textLanguage: '', chapters: [] };
  }
}


# 🎨 Language Handling
1. Detect the transcript's original language and assign it to variable "textLanguage".
2. Segment using the original text language.
3. If transcriptLanguage is provided AND differs from textLanguage, translate each block's title and text into transcriptLanguage; otherwise leave in original.

# 🧠 Algorithm
1. Detect and set textLanguage.
2. Iterate over each chapter in order.
3. Extract transcript sentences between chapter.start and chapter.end timestamps.
4. Build blocks with title, text, tokens.
5. Apply translation rules from Language Handling.
6. Return JSON object { textLanguage, chapters: [ ...blocks ] }.

# 📤 Output Format
{
  "textLanguage": string,
  "chapters": [
    { "title": string, "text": string, "tokens": number },
    ...
  ]
}

# 📚 External Context
Chapters JSON:
${JSON.stringify(chapters)}

Transcript text (${inputTokens} tokens):
${rawText}
`;

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
        // Извлекаем JSON-объект
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) {
            console.error('[chapterSplitter] No JSON object found in response:', raw);
            return { textLanguage: '', chapters: [] };
        }
        return JSON.parse(match[0]);
    } catch (error) {
        console.error('[chapterSplitter] OpenAI request failed:', error);
        return { textLanguage: '', chapters: [] };
    }
}
