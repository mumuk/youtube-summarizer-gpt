// utils/tokenCounter.js
// ------------------------------------------------------------
// Provides token counting, encoding, and decoding using tiktoken
// ------------------------------------------------------------

import { encoding_for_model } from 'tiktoken';

// Model used for token encoding/decoding
const model: string = 'gpt-3.5-turbo'; // can be changed to 'gpt-4'
const encoder = encoding_for_model(model);
const textDecoder = new TextDecoder('utf-8');
/**
 * Count number of tokens in a given text
 * @param {string} text - Text to analyze
 * @returns {number} - Token count
 */
export function countTokens(input: string | number[]): number {
    const text = Array.isArray(input)
        ? encoder.decode(input)
        : String(input);
    return encoder.encode(text).length;
}

/**
 * Trim text to ensure it does not exceed the max token limit
 * @param {string} text - Input text
 * @param {number} maxTokens - Maximum allowed tokens
 * @returns {string} - Trimmed text
 */
export function trimByTokens(text: string, maxTokens: number): string {
    const tokens = encoder.encode(text);
    if (tokens.length <= maxTokens) return text;
    const trimmedTokens = tokens.slice(0, maxTokens);
    return encoder.decode(trimmedTokens);
}

/**
 * Encode text into an array of token IDs
 * @param {string} text - Text to encode
 * @returns {number[]} - Array of token IDs
 */
export function encode(text: string): number[] {
    return encoder.encode(text);
}

/**
 * Decode an array of token IDs back into string text
 * @param {number[]} tokens - Array of token IDs
 * @returns {string} - Decoded text
 */
export function decode(tokens: number[]): string {
    // tiktoken.decode возвращает Uint8Array → нуждаем в TextDecoder
    const bytes = encoder.decode(tokens); // Uint8Array
    const text = textDecoder.decode(bytes); // string
    return text;
}
