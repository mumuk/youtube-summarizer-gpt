// prompts/semanticPrompts.js
/* eslint-disable max-len */

import { Models, ActiveModel } from "../config/models.js";

/* ──────────────────────────────────────────────
   GPT-4.1-mini
────────────────────────────────────────────── */
function prompt41({ inputTokens, text, transcriptLanguage }) {
    const langRule = transcriptLanguage
        ? `Write titles & text **in ${transcriptLanguage}**.`
        : 'Detect the original language and set it as **textLanguage**.';

    return `
Persist: Stay engaged until the task is fully complete.

Tool-first: If you need information—call a tool; do **not** guess.

Plan: First plan thoroughly, then execute functions.

Respond only with valid JSON. No backticks, no markdown, no extra text.

# 🎯 Role & Goal
You segment a YouTube transcript into coherent **semantic blocks**.

# 📃 Main Rules
- Exactly **one topic per block** – never merge or split topics across blocks.
- Rely **only** on the provided transcript; add nothing.
- ${langRule}

## └─ Sub-rules (format)
- \`title\`: ≤ 7 words, concise essence of the block.  
- \`text\`: full sentences from the transcript that belong to the block.  
- Keep original wording; no paraphrasing.

# 🧠 Algorithm
1. If \`transcriptLanguage\` is provided → set \`textLanguage = "${transcriptLanguage || '<detected>'}"\`.  
   Else detect the language and set \`textLanguage\`.
2. Identify topic boundaries (semantic changes).  
3. For each block: collect sentences, create \`title\`, keep original order.  
4. If needed, translate titles & text so they match \`textLanguage\`.  
5. Count tokens for each block’s final text.

# 📤 Output Format
{
  "textLanguage": "<lang-code>",
  "blocks": [
    { "title": "<string>", "text": "<string>" }
  ]
}

# 📚 Transcript Context (${inputTokens} tokens)
${text}

# 🔁 REMINDER
Return **valid JSON only**. One topic per block. No markdown, no backticks, no extra text.

Think step-by-step and outline your plan before answering.
`.trim();
}

/* ──────────────────────────────────────────────
   GPT-4o-mini
────────────────────────────────────────────── */
function prompt4o({ inputTokens, text, transcriptLanguage }) {
    const langLine = transcriptLanguage
        ? `Use **${transcriptLanguage}** for titles & text.`
        : 'Detect language and set **textLanguage**.';

    return `
Persist: Stay engaged until the task is fully complete.

Tool-first: If you need information—call a tool; do **not** guess.

Plan: First plan thoroughly, then execute functions.

Return JSON only. No markdown, no backticks, no extra text.

— One topic per block, keep original order.  
— Use only the transcript, add nothing.  
— ${langLine}

Format:
{
  "textLanguage": "<lang-code>",
  "blocks": [
    { "title": "<≤7 words>", "text": "<sentences>" }
  ]
}

Transcript (${inputTokens} tokens):
${text}
`.trim();
}

/* ──────────────────────────────────────────────
   Unified Getter
────────────────────────────────────────────── */
export function getSemanticPrompt(params) {
    if (ActiveModel === Models.GPT41_MINI) {
        return prompt41(params);
    }
    if (ActiveModel === Models.GPT4O_MINI) {
        return prompt4o(params);
    }
    throw new Error(`Unsupported model: ${ActiveModel}`);
}
