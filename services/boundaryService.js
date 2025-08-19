// services/boundaryService.js
// ------------------------------------------------------------
// Service for processing boundary pairs using OpenAI
// ------------------------------------------------------------
import pLimit from "p-limit";
import { getBoundaryPrompt } from "../prompts/boundaryPrompts.js";
import { safeJsonParse } from "../utils/safeJsonParse.js";

/**
 * Process boundary pairs with GPT
 * @param {Array} pairs
 * @param {OpenAI} openai
 * @param {string} model
 * @param {number} concurrency
 * @returns {Promise<Array>}
 */
export async function processBoundaryPairs(pairs, openai, model, concurrency = 6) {
    if (!pairs.length) return [];

    const limit = pLimit(concurrency);

    const results = await Promise.all(
        pairs.map((pair, idx) =>
            limit(async () => {
                const prompt = getBoundaryPrompt({ prevText: pair.prevText, currText: pair.currText });

                try {
                    console.log(`\n[boundaryService] === Pair ${idx + 1} ===`);
                    console.log(`[boundaryService] prevId=${pair.prevId}`);
                    console.log(`[boundaryService] currId=${pair.currId}`);

                    const res = await openai.chat.completions.create({
                        model,
                        temperature: 0.2,
                        messages: [{ role: "system", content: prompt }],
                    });

                    const raw = res.choices[0].message.content;
                    const json = safeJsonParse(raw, {});

                    console.log(`[boundaryService] AFTER:`);
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
                    console.error(`[boundaryService] Error on pair ${idx + 1}`, err);
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

    console.log(`\n[boundaryService] Total pairs processed: ${results.length}`);
    return results;
}
