// utils/textChunker.js
// ------------------------------------------------------------
// Provides functions to compute chunk configuration and split text into chunks
// based on QPS/min-size rules with true token-based slicing and detailed logging.
// ------------------------------------------------------------

import { countTokens, encode, decode } from "./tokenCounter.js";

/**
 * Compute number of chunks, overlap, and total tokens.
 */
export function computeChunkConfig(
    text,
    { defaultChunks = 6, maxConcurrency = 8, defaultOverlap = 0.05 } = {}
) {
    const totalTokens = countTokens(text);
    const minChunkSize = 1000;
    let numberOfChunks = Math.ceil(totalTokens / minChunkSize);
    numberOfChunks = Math.max(1, Math.min(numberOfChunks, maxConcurrency));
    if (totalTokens > defaultChunks * minChunkSize && numberOfChunks < defaultChunks) {
        numberOfChunks = defaultChunks;
    }
    const idealSize = totalTokens / numberOfChunks;
    const tailSize = totalTokens - idealSize * (numberOfChunks - 1);
    if (tailSize < 1.5 * idealSize && numberOfChunks > 1) {
        numberOfChunks -= 1;
    }
    numberOfChunks = Math.max(1, Math.min(numberOfChunks, maxConcurrency));
    const overlapTokens = Math.floor((totalTokens / numberOfChunks) * defaultOverlap);
    return { totalTokens, numberOfChunks, overlapTokens, concurrency: numberOfChunks };
}

/**
 * Splits text into semantic chunks with logging at each step.
 */
export function splitByTokenCount(text, options = {}) {
    const { totalTokens, numberOfChunks, overlapTokens } = computeChunkConfig(text, options);
    console.log(`
[textChunker] CONFIG → totalTokens=${totalTokens}, numberOfChunks=${numberOfChunks}, overlapTokens=${overlapTokens}`);

    console.log(`[textChunker] Input text snippet: "${text.slice(0,100).replace(/\n/g,' ')}..."`);
    const tokens = encode(text);
    console.log(`[textChunker] Tokens sample: first10=${tokens.slice(0,10)}, last10=${tokens.slice(-10)}`);

    const chunks = [];
    let startToken = 0;
    const baseSize = Math.floor((totalTokens + overlapTokens * (numberOfChunks - 1)) / numberOfChunks);

    for (let i = 0; i < numberOfChunks; i++) {
        const isLast = i === numberOfChunks - 1;
        const sizeTokens = isLast ? totalTokens - startToken : baseSize;
        const sliceCount = sizeTokens + (i > 0 ? overlapTokens : 0);
        console.log(`[textChunker] chunk ${i+1}: startToken=${startToken}, sizeTokens=${sizeTokens}, overlapTokens=${overlapTokens}`);

        const chunkTokens = tokens.slice(startToken, startToken + sliceCount);
        console.log(`[textChunker] raw chunkTokens: first5=${chunkTokens.slice(0,5)}, last5=${chunkTokens.slice(-5)}`);

        const chunkTextRaw = decode(chunkTokens);
        const chunkText = typeof chunkTextRaw === 'string' ? chunkTextRaw : String(chunkTextRaw);
        console.log(`[textChunker] decoded chunk text snippet: "${chunkText.slice(0,100).replace(/\n/g,' ')}..."`);
        console.log(`[textChunker] → blockTokens=${chunkTokens.length}`);

        chunks.push({ text: chunkText, blockTokens: chunkTokens.length });
        startToken += sizeTokens;
    }
    return chunks;
}
