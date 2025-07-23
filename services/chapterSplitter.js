// services/chapterSplitter.js

import { countTokens } from '../utils/tokenCounter.js';

/**
 * Локальное разбиение транскрипта на главы без вызова модели.
 *
 * @param {Array<{ start: number, text: string }>} transcriptItems — массив сегментов субтитров
 * @param {Array<{ title: string, start: number, end: number }>} chapters — список глав из YouTube
 * @param {number} overlapSec — перекрытие в секундах (по умолчанию 1)
 * @returns {Array<{
 *   id: string;
 *   title: string;
 *   text: string;
 *   blockTokens: number;
 * }>}
 */
export function splitTranscriptByChapters(transcriptItems, chapters, overlapSec = 1) {
    return chapters.map((ch, idx) => {
        // Расширяем границы окна
        const startTime = Math.max(0, ch.start - overlapSec);
        const endTime   = ch.end + overlapSec;

        // Собираем все текстовые сегменты в интервале [startTime, endTime)
        const texts = transcriptItems
            .filter(item => item.start >= startTime && item.start < endTime)
            .map(item => item.text.trim());

        const combinedText = texts.join(' ');
        // Формируем уникальный идентификатор
        const id = `chapter-${idx + 1}`;

        // Считаем токены для заголовка + текста
        const blockTokens = countTokens(ch.title) + countTokens(combinedText);

        return {
            id,
            title: ch.title,
            text: combinedText,
            blockTokens
        };
    });
}
