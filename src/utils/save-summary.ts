// utils/save-summary.js

import fs from 'fs';
import path from 'path';
import { SummaryBlock } from '../types.ts';

/**
 * Сохраняет массив блоков в формате Markdown в output/summary.md
 */
export function saveSummary(blocks: SummaryBlock[]): void {
    try {
        const outputDir = path.resolve('output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, 'summary.md');

        // Формируем контент в Markdown
        let markdown = `# Summary Report\n\n`;
        blocks.forEach((block, index) => {
            markdown += `## ${index + 1}. ${block.title}\n\n`;
            markdown += `**Summary:** ${block.summary}\n\n`;
            markdown += `**Text:**\n${block.text}\n\n`;
            markdown += `**Tokens:** ${block.tokens}\n\n`;
            markdown += `---\n\n`;
        });

        fs.writeFileSync(outputPath, markdown, 'utf-8');
        console.log(`✅ Saved summary to: ${outputPath}`);
    } catch (error) {
        if (error instanceof Error) {
            console.error('❌ Failed to save summary.md:', error.message);
        } else {
            console.error('❌ Failed to save summary.md:', error);
        }
    }
}
