
// utils/captionParser.js

import { parseStringPromise } from 'xml2js';
import { CaptionItem } from './captionParser.types.ts';

/**
 * Парсит XML субтитров YouTube (TTML или публичный timedtext) в массив { start, text }.
 * Поддерживает форматы:
 * - TTML: <tt><body><div><p begin="...">...</p></div></body></tt>
 * - Public timedtext: <transcript><text start="..." dur="...">...</text></transcript>
 */
export async function parseCaptionsXml(xml: string): Promise<CaptionItem[]> {
    if (!xml || !xml.trim()) {
        throw new Error('Empty XML received — no captions payload');
    }
    const json: any = await parseStringPromise(xml);
    if (!json) {
        console.error('[parseCaptionsXml] parseStringPromise returned null for XML:', xml.slice(0, 200));
        throw new Error('Failed to parse XML — invalid format');
    }

    // TTML (Data API)
    console.log("json is - ", json)
    if (json.tt && json.tt.body && json.tt.body[0] && json.tt.body[0].div && json.tt.body[0].div[0]) {
        const paragraphs: any[] = json.tt.body[0].div[0].p || [];
        return paragraphs.map(node => ({
            start: parseFloat(node.$.begin) || 0,
            text: (node._ || '')
                .trim()
                .replace(/\s+/g, ' '),
        }));
    }

    // Public timedtext format
    if (json.transcript && json.transcript.text) {
        const texts: any[] = json.transcript.text;
        return texts.map(node => ({
            start: parseFloat(node.$?.start) || 0,
            text: (node._ || '')
                .trim()
                .replace(/\s+/g, ' '),
        }));
    }

    throw new Error('Unknown captions XML format');
}