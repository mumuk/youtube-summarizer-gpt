// services/semanticSplitter.js
// ------------------------------------------------------------
// Splits a cleaned YouTube transcript into coherent semantic
// blocks by chunking and calling GPT in parallel, then merging.
// Uses utils/textChunker for chunk configuration and splitting.
// ------------------------------------------------------------

import OpenAI from "openai";
import { computeChunkConfig, splitByTokenCount } from "../utils/textChunker.js";
import { prompt41, prompt4o, Models } from "../prompts/semanticPrompts.js";
import pLimit from "p-limit";
import { countTokens } from "../utils/tokenCounter.js";

/**
 * Splits transcript text into semantic blocks via GPT using optimized chunking.
 * Logs number of requests and tokens per chunk.
 *
 * @param {string} text - cleaned transcript text
 * @param {string} [transcriptLanguage] - target language; if omitted, model detects
 * @param {object} [options]
 * @param {('gpt-4.1-mini'|'gpt-4o-mini')} [options.model] - model identifier
 * @param {number} [options.defaultChunks]   - default number of chunks (e.g., 6)
 * @param {number} [options.maxConcurrency]  - QPS limit (e.g., 8)
 * @param {number} [options.defaultOverlap]  - overlap ratio (e.g., 0.05)
 * @returns {Promise<{ textLanguage: string, blocks: Array }>} parsed blocks
 */
export async function splitTranscriptWithGPT(
    text,
    transcriptLanguage,
    { model = Models.GPT41_MINI, defaultChunks = 6, maxConcurrency = 8, defaultOverlap = 0.05 } = {}
) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Compute chunk configuration
    const { totalTokens, numberOfChunks, concurrency } = computeChunkConfig(text, { defaultChunks, maxConcurrency, defaultOverlap });

    // Split text into chunks
    const chunks = splitByTokenCount(text, { defaultChunks, maxConcurrency, defaultOverlap });
    console.log(`[semanticSplitter] Total tokens: ${totalTokens}, Chunks: ${numberOfChunks}, Concurrency: ${concurrency}`);
    chunks.forEach((c, i) => console.log(`[semanticSplitter] Chunk ${i + 1}: ${c.blockTokens} tokens`));

    // Parallel GPT calls with p-limit
    const limit = pLimit(concurrency);
    let requestCount = 0;
    const results = await Promise.all(
        chunks.map((chunk, idx) =>
            limit(async () => {
                requestCount++;
                console.log(`[semanticSplitter] Sending request #${requestCount} for chunk ${idx + 1} (${chunk.blockTokens} tokens)`);
                const prompt = model === Models.GPT41_MINI
                    ? prompt41({ inputTokens: chunk.blockTokens, text: chunk.text, transcriptLanguage })
                    : prompt4o({ inputTokens: chunk.blockTokens, text: chunk.text, transcriptLanguage });
                const response = await openai.chat.completions.create({
                    model,
                    temperature: 0.4,
                    messages: [{ role: "system", content: prompt }]
                });
                const raw = response.choices[0].message.content.trim();
                const jsonMatch = raw.match(/\{[\s\S]*}/);
                if (!jsonMatch) {
                    console.error("[semanticSplitter] No JSON in chunk response", raw);
                    return [];
                }
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    console.log(`[semanticSplitter] Received blocks: ${parsed.blocks.length} for chunk ${idx + 1}`);
                    return parsed.blocks || [];
                } catch (e) {
                    console.error("[semanticSplitter] JSON.parse failed on chunk response", e);
                    return [];
                }
            })
        )
    );

    console.log(`[semanticSplitter] Total GPT requests sent: ${requestCount}`);

    // Merge blocks and add identifiers
    const merged = [];
    results.flat().forEach((blk, idx) => {
        const id = `semantic-${idx + 1}`;
        const blkTokens = countTokens(`${blk.title}\n${blk.text}`);
        merged.push({ id, title: blk.title, text: blk.text, blockTokens: blkTokens });
    });

    return {
        textLanguage: transcriptLanguage || "",
        blocks: merged
    };
}

export { Models };
