// utils/boundaryUtils.js
// ------------------------------------------------------------
// Pure utility functions for detecting and applying boundary edits
// ------------------------------------------------------------

/**
 * Extract boundary pairs (prev/next blocks) across chunk borders.
 * @param {Array<{id:string,text:string}>} finalBlocks
 * @param {number[]} blocksCountPerChunk
 * @returns {Array<{ prevId:string, currId:string, prevText:string, currText:string }>}
 */
export function extractBoundaryPairsWithText(finalBlocks: any[], blocksCountPerChunk: string | any[]) {
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
                currText: currBlock.text,
            });
        }
        offset += countA;
    }

    return pairs;
}

/**
 * Apply processed edits to finalBlocks array.
 * @param {Array<object>} blocks
 * @param {Array<object>} edits
 * @returns {Array<object>}
 */
export function applyBoundaryEdits(blocks, edits) {
    if (!edits || edits.length === 0) return blocks;

    const idToIndex = new Map(blocks.map((b, i) => [b.id, i]));

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
