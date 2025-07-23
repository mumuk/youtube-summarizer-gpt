import { encoding_for_model } from 'tiktoken';

// Модель используемая для подсчёта токенов
const model = 'gpt-3.5-turbo'; // можно заменить на 'gpt-4'
const encoder = encoding_for_model(model);

/**
 * Подсчитывает количество токенов в тексте.
 *
 * @param {string} text - Текст для анализа.
 * @returns {number} - Число токенов.
 */
export function countTokens(text) {
    return encoder.encode(text).length;
}

/**
 * Обрезает текст так, чтобы он не превышал заданное число токенов.
 *
 * @param {string} text - Входной текст для обрезки.
 * @param {number} maxTokens - Максимально допустимое число токенов.
 * @returns {string} - Обрезанный текст, не превышающий лимит.
 */
export function trimByTokens(text, maxTokens) {
    const words = text.split(/\s+/);
    let trimmed = '';

    for (const word of words) {
        const candidate = trimmed ? `${trimmed} ${word}` : word;
        if (countTokens(candidate) > maxTokens) {
            break;
        }
        trimmed = candidate;
    }

    return trimmed;
}