// utils/transcriptPreparer.js

import { countTokens } from "./tokenCounter.ts";

export interface TranscriptItem {
    text: string;
    start: number;
    duration?: number;
}

/**
 * Подготавливает транскрипт: очищает текст, объединяет фразы и считает токены.
 *
 * @param {TranscriptItem[]} transcript - Исходный массив субтитров
 * @param {Object} [options={}] - Опции очистки
 * @param {boolean} [options.removeSpeakers=false] - Удалять ли "Speaker X:" из текста
 * @returns {{ transcript: string, totalTokens: number }} - Объединённый текст и число токенов
 */
export function prepareTranscript(
    transcript: TranscriptItem[],
    { removeSpeakers = false }: { removeSpeakers?: boolean } = {}
): { transcript: string; totalTokens: number } {
    // Шаг 1: очищаем каждую запись

    const cleaned = transcript
        .map(entry => ({
            ...entry,
            text: cleanText(entry.text, removeSpeakers)
        }))
        .filter(entry => entry.text.trim().length > 0);

    // Шаг 2: объединяем весь текст в одну строку
    const rawText = cleaned.map(t => t.text).join(' ');

    // Шаг 3: считаем общее число токенов
    const totalTokens = countTokens(rawText);
    console.log(`[prepareTranscript] total tokens: ${totalTokens}`);

    // Шаг 4: возвращаем результат
    return { transcript: rawText, totalTokens };
}

/**
 * Очищает строку текста от мусора:
 * - [теги в скобках]
 * - музыкальные символы ♪
 * - inline timestamps (00:00)
 * - префиксы типа Speaker 1: (если включено)
 * - лишние тире в начале строки
 *
 * @param {string} text - Исходная строка субтитра
 * @param {boolean} removeSpeakers - Удалять ли Speaker X:
 * @returns {string} - Очищенный текст
 */
function cleanText(text: string, removeSpeakers: boolean): string {
    let cleaned = text
        .replace(/\[.*?\]/g, '')                  // удаляем [Music], [Applause] и т.п.
        .replace(/[♪♫]+/g, '')                    // удаляем ♪ и ♫
        .replace(/\d{1,2}:\d{2}(:\d{2})?/g, '')    // удаляем inline timestamps
        .replace(/^\s*[-–—]\s*/, '')              // удаляем тире и пробелы в начале строки
        .trim();                                  // удаляем пробелы по краям

    if (removeSpeakers) {
        cleaned = cleaned.replace(/^\s*Speaker \d+:?/i, '').trim(); // удаляем "Speaker 1:"
    }

    return cleaned;
}
