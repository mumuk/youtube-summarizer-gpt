// prompts/boundaryPrompts.js
// ------------------------------------------------------------
// Boundary prompts for cleaning overlaps between chunk borders.
// Includes single-pair and batch variants.
// ------------------------------------------------------------
import { Models, ActiveModel } from "../config/models.js";

/* ──────────────────────────────────────────────
   GPT-4.1-mini batch boundary prompt
────────────────────────────────────────────── */
function batchBoundaryPrompt41(pairs) {
    const context = pairs
        .map((p, i) => `Pair ${i+1}:\nSegment A: ${p.prevText}\nSegment B: ${p.currText}`)
        .join("\n\n");

    return `Stay engaged until the task is fully complete.
If you need information—call a tool; do **not** guess.
First plan thoroughly, then execute functions.

# 🎯 Role & Goal
You are segment-merge assistant for YouTube transcripts.

# 📃 Main Rules
- Merge or trim overlapping semantic segments.
- Do **not** hallucinate or add new information.
- Preserve original wording and ordering.

## Sub-rules
- Inputs: two text segments A and B.
- If they convey the same idea → return one merged segment.
- Otherwise → remove overlap from B and return both cleaned segments.

# 🧠 Algorithm
1. Identify maximal overlap between end of A and start of B.
2. If overlap represents same semantic content → merge A+B.
3. Else → trim overlap from beginning of B.
4. Ensure outputs are complete sentences.

# 📤 Output Format
Return valid JSON array only. Example:
[
  {"pairIndex":1,"merged":"<merged segment>","firstClean":"<cleaned A>","secondClean":"<cleaned B>"},
  {"pairIndex":2,"merged":"<merged segment>","firstClean":"<cleaned A>","secondClean":"<cleaned B>"}
]

# 📚 Context
${context}`;
}

/* ──────────────────────────────────────────────
   GPT-4o-mini batch boundary prompt
────────────────────────────────────────────── */
function batchBoundaryPrompt4o(pairs) {
    const context = pairs
        .map((p, i) => `Pair ${i+1}:\nA: ${p.prevText}\nB: ${p.currText}`)
        .join("\n\n");

    return `Persist: stay engaged until the task is fully complete.
Tool-first: if you need information—call a tool; do **not** guess.
Plan: first plan thoroughly, then execute.

Task: for each pair of segments (A,B), merge or trim overlaps.
- Use only given text, add nothing.
- Ensure outputs are full sentences.
- JSON only.

Format:
[
  {"pairIndex":1,"merged":"...","firstClean":"...","secondClean":"..."},
  {"pairIndex":2,"merged":"...","firstClean":"...","secondClean":"..."}
]

Context:
${context}`;
}

/* ──────────────────────────────────────────────
   GPT-4.1-mini single boundary prompt
────────────────────────────────────────────── */
function boundaryPrompt41({ prevText, currText }) {
    return `Stay engaged until the task is fully complete.
If you need information—call a tool; do **not** guess.
First plan thoroughly, then execute functions.

# 🎯 Role & Goal
You are segment-merge assistant for YouTube transcripts.

# 📃 Main Rules
- Merge or trim overlapping semantic segments.
- Do **not** hallucinate or add new information.
- Preserve original wording and ordering.

## Sub-rules
- Inputs: two text segments A and B.
- If they convey the same idea → return one merged segment.
- Otherwise → remove overlap from B and return both cleaned segments.

# 🧠 Algorithm
1. Identify maximal overlap between end of A and start of B.
2. If overlap represents same semantic content → merge A+B.
3. Else → trim overlap from beginning of B.
4. Ensure outputs are complete sentences.

# 📤 Output Format
Return valid JSON only, e.g.: {"merged":"<merged segment>","firstClean":"<cleaned A>","secondClean":"<cleaned B>"}

# 📚 Context
Segment A: ${prevText}
---
Segment B: ${currText}`;
}

/* ──────────────────────────────────────────────
   GPT-4o-mini single boundary prompt
────────────────────────────────────────────── */
function boundaryPrompt4o({ prevText, currText }) {
    return `Persist: Stay engaged until the task is fully complete.
Tool-first: If you need information—call a tool; do **not** guess.
Plan: First plan thoroughly, then execute functions.

One topic: merge or trim overlaps between two segments.
Use only provided text; add nothing.

Format JSON: {"merged":"<merged segment>","firstClean":"<cleaned A>","secondClean":"<cleaned B>"}

A: ${prevText}
B: ${currText}`;
}

/* ──────────────────────────────────────────────
   Unified Getters
────────────────────────────────────────────── */
export function getBoundaryPrompt(pair) {
    if (ActiveModel === Models.GPT41_MINI) return boundaryPrompt41(pair);
    if (ActiveModel === Models.GPT4O_MINI) return boundaryPrompt4o(pair);
    throw new Error(`Unsupported model: ${ActiveModel}`);
}

export function getBatchBoundaryPrompt(pairs) {
    if (ActiveModel === Models.GPT41_MINI) return batchBoundaryPrompt41(pairs);
    if (ActiveModel === Models.GPT4O_MINI) return batchBoundaryPrompt4o(pairs);
    throw new Error(`Unsupported model: ${ActiveModel}`);
}
