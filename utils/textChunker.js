// utils/textChunker.js
// ------------------------------------------------------------
// Provides functions to compute chunk configuration and split text into chunks
// based on QPS/min-size rules.
// Contains two functions: computeChunkConfig and splitByTokenCount.
// ------------------------------------------------------------

import { countTokens, trimByTokens } from "./tokenCounter.js";

/**
 * Compute how many chunks to split the text into, overlap ratio, concurrency,
 * and total token count.
 *
 * @param {string} text
 * @param {object} options
 * @param {number} options.defaultChunks   - default number of chunks (e.g., 6)
 * @param {number} options.maxConcurrency - maximum parallel calls / QPS limit (e.g., 8)
 * @param {number} options.defaultOverlap - overlap ratio (e.g., 0.05 for 5%)
 * @returns {{ totalTokens: number, numberOfChunks: number, overlapTokens: number, concurrency: number }}
 */
export function computeChunkConfig(text, { defaultChunks = 6, maxConcurrency = 8, defaultOverlap = 0.05 } = {}) {
    const totalTokens = countTokens(text);
    const minChunkSize = 1000;

    // Initial number of chunks based on minimum chunk size
    let numberOfChunks = Math.ceil(totalTokens / minChunkSize);
    numberOfChunks = Math.max(1, Math.min(numberOfChunks, maxConcurrency));

    // Enforce defaultChunks for larger texts
    if (totalTokens > defaultChunks * minChunkSize && numberOfChunks < defaultChunks) {
        numberOfChunks = defaultChunks;
    }

    // Tail merging logic: if last chunk is too small, merge it
    const idealSize = totalTokens / numberOfChunks;
    const tailSize = totalTokens - idealSize * (numberOfChunks - 1);
    if (tailSize < 1.5 * idealSize && numberOfChunks > 1) {
        numberOfChunks -= 1;
    }
    numberOfChunks = Math.max(1, Math.min(numberOfChunks, maxConcurrency));

    // Compute overlap in tokens
    const overlapTokens = Math.floor((totalTokens / numberOfChunks) * defaultOverlap);

    return { totalTokens, numberOfChunks, overlapTokens, concurrency: numberOfChunks };
}

/**
 * Splits text into semantic chunks using computeChunkConfig.
 *
 * @param {string} text
 * @param {object} options
 * @param {number} options.defaultChunks   - default number of chunks (e.g., 6)
 * @param {number} options.maxConcurrency - QPS limit (e.g., 8)
 * @param {number} options.defaultOverlap - overlap ratio (e.g., 0.05)
 * @returns {{ text: string, blockTokens: number }[]} Array of chunk objects
 */
export function splitByTokenCount(text, options = {}) {
    const { totalTokens, numberOfChunks, overlapTokens } = computeChunkConfig(text, options);
    const chunks = [];
    let startIndex = 0;

    // Calculate base size including distribution of overlap
    const baseSize = Math.floor((totalTokens + overlapTokens * (numberOfChunks - 1)) / numberOfChunks);

    for (let i = 0; i < numberOfChunks; i++) {
        const isLast = i === numberOfChunks - 1;
        const size = isLast ? totalTokens - startIndex : baseSize;

        // For all but first chunk, include overlap
        const sliceSize = size + (i > 0 ? overlapTokens : 0);
        const chunkText = trimByTokens(text.slice(startIndex), sliceSize);
        const blockTokens = countTokens(chunkText);
        chunks.push({ text: chunkText, blockTokens });

        startIndex += size;
    }

    return chunks;
}
