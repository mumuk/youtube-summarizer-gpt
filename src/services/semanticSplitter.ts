// services/semanticSplitter.js
// ------------------------------------------------------------
// Splits a cleaned YouTube transcript into coherent semantic
// blocks by chunking and calling GPT in parallel, then merging.
// Adds boundary post-processing step.
// ------------------------------------------------------------

import OpenAI from "openai";
import pLimit from "p-limit";
import { splitByTokenCount, computeChunkConfig } from "../utils/textChunker.ts";
import { countTokens } from "../utils/tokenCounter.ts";
import { extractBoundaryPairsWithText, applyBoundaryEdits } from "../utils/boundaryUtils.ts";
import { processBoundaryPairs } from "./boundaryService.ts";
import { safeJsonParse } from "../utils/safeJsonParse.ts";
import { getSemanticPrompt } from "../prompts/semanticPrompts.ts";
import { ActiveModel } from "../config/models.ts";

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

export async function splitTranscriptWithGPT(
    text,
    transcriptLanguage,
    { model = ActiveModel, defaultChunks = 6, maxConcurrency = 8, defaultOverlap = 0.05 } = {}
) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { totalTokens, numberOfChunks, overlapTokens, concurrency } =
        computeChunkConfig(text, { defaultChunks, maxConcurrency, defaultOverlap });

    console.log(`[semanticSplitter] CONFIG → totalTokens=${totalTokens}, numberOfChunks=${numberOfChunks}, overlapTokens=${overlapTokens}, concurrency=${concurrency}`);

    const chunks = splitByTokenCount(text, { defaultChunks, maxConcurrency, defaultOverlap });

    const limit = pLimit(concurrency);
    let sentRequests = 0;
    const allResponses = [];

    for (const [idx, chunk] of chunks.entries()) {
        allResponses.push(
            limit(async () => {
                sentRequests++;
                console.log(`[semanticSplitter] Sending request #${sentRequests} for chunk ${idx+1} with ${chunk.blockTokens} tokens`);

                const prompt = getSemanticPrompt({
                    inputTokens: chunk.blockTokens,
                    text: chunk.text,
                    transcriptLanguage
                });
                const res = await openai.chat.completions.create({
                    model,
                    temperature: 0.4,
                    messages: [{ role: "system", content: prompt }]
                });

                const raw = res.choices[0].message.content;
                const jsonMatch = raw.match(/\{[\s\S]*}/);

                if (!jsonMatch) {
                    console.error(`[semanticSplitter] No JSON found in chunk ${idx+1} response`);
                    return [];
                }

                const parsed = safeJsonParse(jsonMatch[0], {});
                return parsed?.blocks || [];
            })
        );
    }

    const responsesArrays = await Promise.all(allResponses);
    console.log(`[semanticSplitter] Total GPT requests sent: ${sentRequests}`);

    const merged = mergeBlocks(responsesArrays);

    const finalBlocks = merged.map((blk, i) => ({
        id: `semantic-${i+1}`,
        title: blk.title,
        text: blk.text,
        blockTokens: countTokens(`${blk.title}\n${blk.text}`)
    }));

    console.log(`[semanticSplitter] Final blocks count before boundary clean: ${finalBlocks.length}`);

    // Boundary cleaning
    const blocksCountPerChunk = chunks.map(c => c.blockTokens > 0 ? Math.ceil(c.blockTokens / c.blockTokens) : 0); // placeholder
    const pairs = extractBoundaryPairsWithText(finalBlocks, chunks.map(c => c.blocksCount || c.blockTokens ? 1 : 0));

    console.log(`[semanticSplitter] Found ${pairs.length} boundary pairs`);

    const edits = await processBoundaryPairs(pairs, openai, model);
    const cleanedBlocks = applyBoundaryEdits(finalBlocks, edits);

    console.log(`[semanticSplitter] Final blocks count after boundary clean: ${cleanedBlocks.length}`);

    return { textLanguage: transcriptLanguage || "", blocks: cleanedBlocks };
}


