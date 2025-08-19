// utils/boundaryProcessing.js
// ------------------------------------------------------------
// Functions to detect and process overlapping boundary blocks by ID,
// using GPT batch or per-pair prompts, and apply changes back to finalBlocks.
// ------------------------------------------------------------

import pLimit from "p-limit";
import { boundaryPrompt41, boundaryPrompt4o } from "../prompts/boundaryPrompts.ts";
import { Models } from "../prompts/semanticPrompts.ts";
import { safeJsonParse } from "./safeJsonParse.ts";

/**
 * Extract boundary pairs (prev/next blocks) across chunk borders.
 * Works from blocksCountPerChunk to be robust against empty chunks.
 * @param {Array<{id:string,text:string}>} finalBlocks - flat array of blocks
 * @param {number[]} blocksCountPerChunk - number of blocks per chunk
 * @returns {Array<{ prevId:string, currId:string, prevText:string, currText:string }>}
 */
export function extractBoundaryPairsWithText(finalBlocks, blocksCountPerChunk) {
    const pairs = [];
    let offset = 0;

    for (let i = 0; i < blocksCountPerChunk.length - 1; i++) {
        const countA = blocksCountPerChunk[i];
        const countB = blocksCountPerChunk[i + 1];

        if (countA > 0 && countB > 0) {
            const prevBlock = finalBlocks[offset + countA - 1];
            const currBlock = finalBlocks[offset + countA];
            pairs.push({
                prevId: prevBlock.id,
                currId: currBlock.id,
                prevText: prevBlock.text,
                currText: currBlock.text
            });
        }
        offset += countA;
    }

    return pairs;
}

export async function processBoundaryPairs(pairs, openai, model, concurrency = 6) {
    if (!pairs.length) return [];

    const limit = pLimit(concurrency);

    const results = await Promise.all(
        pairs.map((pair, idx) =>
            limit(async () => {
                const prompt =
                    model === Models.GPT41_MINI
                        ? boundaryPrompt41({ prevText: pair.prevText, currText: pair.currText })
                        : boundaryPrompt4o({ prevText: pair.prevText, currText: pair.currText });

                try {
                    console.log(`\n[boundaryProcessing] === Pair ${idx + 1} ===`);
                    console.log(`[boundaryProcessing] prevId=${pair.prevId}`);
                    console.log(`[boundaryProcessing] currId=${pair.currId}`);
                    console.log(`[boundaryProcessing] BEFORE:`);
                    console.log(`A: ${pair.prevText}`);
                    console.log(`B: ${pair.currText}`);

                    const res = await openai.chat.completions.create({
                        model,
                        temperature: 0.2,
                        messages: [{ role: "system", content: prompt }]
                    });

                    const raw = res.choices[0].message.content;
                    const json = safeJsonParse(raw, {});

                    console.log(`[boundaryProcessing] AFTER:`);
                    console.log(`merged: ${json?.merged || "—"}`);
                    console.log(`firstClean: ${json?.firstClean || "—"}`);
                    console.log(`secondClean: ${json?.secondClean || "—"}`);

                    return {
                        prevId: pair.prevId,
                        currId: pair.currId,
                        merged: json?.merged || null,
                        firstClean: json?.firstClean || null,
                        secondClean: json?.secondClean || null,
                    };
                } catch (err) {
                    console.error(`[boundaryProcessing] Error on pair ${idx + 1}`, err);
                    return {
                        prevId: pair.prevId,
                        currId: pair.currId,
                        merged: null,
                        firstClean: null,
                        secondClean: null,
                    };
                }
            })
        )
    );

    console.log(`\n[boundaryProcessing] Total pairs processed: ${results.length}`);
    return results;
}

/**
 * Apply processed edits to finalBlocks array.
 * Preserves block metadata where possible.
 * @param {Array<object>} blocks - finalBlocks
 * @param {Array<object>} edits - result from processBoundaryPairs
 * @returns {Array<object>} updated finalBlocks
 */
export function applyBoundaryEdits(blocks, edits) {
    if (!edits || edits.length === 0) return blocks;

    // Быстрый доступ id → index
    const idToIndex = new Map(blocks.map((b, i) => [b.id, i]));

    // Применяем с конца к началу, чтобы индексы не смещались
    [...edits].reverse().forEach(edit => {
        const iPrev = idToIndex.get(edit.prevId);
        const iCurr = idToIndex.get(edit.currId);

        if (iPrev == null || iCurr == null) return;

        if (edit.merged) {
            const prevBlock = blocks[iPrev];
            const mergedBlock = { ...prevBlock, text: edit.merged };

            blocks.splice(iPrev, 2, mergedBlock);

            idToIndex.clear();
            blocks.forEach((b, idx) => idToIndex.set(b.id, idx));
        } else {
            if (edit.firstClean) {
                blocks[iPrev] = { ...blocks[iPrev], text: edit.firstClean };
            }
            if (edit.secondClean) {
                blocks[iCurr] = { ...blocks[iCurr], text: edit.secondClean };
            }
        }
    });

    return blocks;
}
