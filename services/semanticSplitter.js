// services/semanticSplitter.js
// ------------------------------------------------------------
// Splits a cleaned YouTube transcript into coherent semantic
// blocks by chunking and calling GPT in parallel, then merging.
// Uses token-based splitting and extensive logging to trace progress and debug issues.
// ------------------------------------------------------------

import OpenAI from "openai";
import pLimit from "p-limit";
import { splitByTokenCount, computeChunkConfig } from "../utils/textChunker.js";
import { prompt41, prompt4o, Models } from "../prompts/semanticPrompts.js";
import { countTokens } from "../utils/tokenCounter.js";

/**
 * Deduplicate parsed blocks, preserving order
 */
function mergeBlocks(blocksArrays) {
    const seen = new Set();
    const merged = [];
    for (const blkArr of blocksArrays) {
        for (const blk of blkArr) {
            const key = `${blk.title}:::${blk.text}`;
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(blk);
            }
        }
    }
    return merged;
}

/**
 * Splits transcript text into semantic blocks via GPT using optimized chunking.
 * Logs key data: chunk boundaries, prompts, full GPT responses, and debug info.
 *
 * @param {string} text - cleaned transcript text
 * @param {string} [transcriptLanguage] - target language
 * @param {object} [options]
 * @param {'gpt-4.1-mini'|'gpt-4o-mini'} [options.model]
 * @param {number} [options.defaultChunks]
 * @param {number} [options.maxConcurrency]
 * @param {number} [options.defaultOverlap]
 * @returns {Promise<{ textLanguage: string, blocks: Array }>} result
 */
export async function splitTranscriptWithGPT(
    text,
    transcriptLanguage,
    { model = Models.GPT41_MINI, defaultChunks = 6, maxConcurrency = 8, defaultOverlap = 0.05 } = {}
) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Compute and log configuration
    const { totalTokens, numberOfChunks, overlapTokens, concurrency } = computeChunkConfig(text, { defaultChunks, maxConcurrency, defaultOverlap });
    console.log(`[semanticSplitter] CONFIG → totalTokens=${totalTokens}, numberOfChunks=${numberOfChunks}, overlapTokens=${overlapTokens}, concurrency=${concurrency}`);

    // Log transcript end snippet
    console.log(`[semanticSplitter] Transcript end snippet: "${String(text).slice(-100).replace(/\n/g, ' ')}"`);

    // Split into chunks and log each
    const chunks = splitByTokenCount(text, { defaultChunks, maxConcurrency, defaultOverlap });
    chunks.forEach((chunk, i) => {
        console.log(`[semanticSplitter] Chunk ${i+1}: blockTokens=${chunk.blockTokens}`);
    });

    // Debug: log full content of the last chunk
    if (chunks.length > 0) {
        const lastChunk = chunks[chunks.length - 1];
        console.log(`[semanticSplitter] Last chunk full text:
${lastChunk.text}`);
    }

    // Prepare to send GPT requests
    const limit = pLimit(concurrency);
    let sentRequests = 0;
    const allResponses = [];

    for (const [idx, chunk] of chunks.entries()) {
        allResponses.push(
            limit(async () => {
                sentRequests++;
                console.log(`[semanticSplitter] Sending request #${sentRequests} for chunk ${idx+1} with ${chunk.blockTokens} tokens`);

                // Prepare and log prompt
                const promptObj = model === Models.GPT41_MINI
                    ? prompt41({ inputTokens: chunk.blockTokens, text: chunk.text, transcriptLanguage })
                    : prompt4o({ inputTokens: chunk.blockTokens, text: chunk.text, transcriptLanguage });
                console.log(`[semanticSplitter] Prompt for chunk ${idx+1}:
${promptObj}`);

                const res = await openai.chat.completions.create({
                    model,
                    temperature: 0.4,
                    messages: [{ role: "system", content: promptObj }]
                });

                const raw = res.choices[0].message.content;
                console.log(`[semanticSplitter] Full GPT raw response for chunk ${idx+1}:
${raw}`);

                // Extract JSON
                const jsonMatch = raw.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    console.error(`[semanticSplitter] No JSON found in chunk ${idx+1} response`);
                    return [];
                }
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    console.log(`[semanticSplitter] Parsed ${parsed.blocks?.length || 0} blocks from chunk ${idx+1}`);
                    return parsed.blocks || [];
                } catch (e) {
                    console.error(`[semanticSplitter] JSON.parse error on chunk ${idx+1}:`, e);
                    return [];
                }
            })
        );
    }

    const responsesArrays = await Promise.all(allResponses);
    console.log(`[semanticSplitter] Total GPT requests sent: ${sentRequests}`);

    // Merge and dedupe
    const merged = mergeBlocks(responsesArrays);
    console.log(`[semanticSplitter] Blocks after dedupe: ${merged.length}`);

    // Build final blocks with IDs and token counts
    const finalBlocks = merged.map((blk, i) => ({
        id: `semantic-${i+1}`,
        title: blk.title,
        text: blk.text,
        blockTokens: countTokens(`${blk.title}\n${blk.text}`)
    }));
    console.log(`[semanticSplitter] Final blocks count: ${finalBlocks.length}`);

    // Log semantic end snippet
    const lastText = finalBlocks.length > 0 ? finalBlocks[finalBlocks.length-1].text : '';
    console.log(`[semanticSplitter] Semantic end snippet: "${String(lastText).slice(-100).replace(/\n/g, ' ')}"`);

    return { textLanguage: transcriptLanguage || "", blocks: finalBlocks };
}

// Named export
export { Models };


export function splitTranscriptWithoutGPT(
    text,
    transcriptLanguage,
    { defaultChunks = 6, maxConcurrency = 8, defaultOverlap = 0.05 } = {}
) {
    // Compute and log configuration
    const { totalTokens, numberOfChunks, overlapTokens, concurrency } = computeChunkConfig(text, { defaultChunks, maxConcurrency, defaultOverlap });
    console.log(`[splitWithoutGPT] CONFIG → totalTokens=${totalTokens}, numberOfChunks=${numberOfChunks}, overlapTokens=${overlapTokens}, concurrency=${concurrency}`);

    // Split into chunks
    const chunks = splitByTokenCount(text, { defaultChunks, maxConcurrency, defaultOverlap });
    console.log(`[splitWithoutGPT] Generated ${chunks.length} chunks`);

    // Build debug blocks
    const debugBlocks = chunks.map((chunk, idx) => {
        const id = `debug-${idx+1}`;
        return {
            id,
            title: `Chunk ${idx+1}`,
            text: chunk.text,
            blockTokens: chunk.blockTokens
        };
    });

    return {
        textLanguage: transcriptLanguage || "",
        blocks: debugBlocks
    };
}
