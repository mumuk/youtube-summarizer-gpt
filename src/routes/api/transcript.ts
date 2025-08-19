import express, { Request, Response } from 'express';
import {ensureOAuthClient} from '../../services/oauthClient.ts';
import {getTranscriptFromUrl} from '../../services/transcriptService.ts';
import {getChapters} from '../../services/chapters.ts';
import {prepareTranscript} from '../../utils/transcriptPreparer.ts';
import {splitTranscriptWithGPT} from '../../services/semanticSplitter.ts';
import {splitTranscriptByChapters} from '../../services/chapterSplitter.ts';
import { TranscriptRequestBody, TranscriptResponse, TranscriptBlock, ErrorResponse, SemanticResult } from '../../types.ts';

const router = express.Router();

console.log('✅ transcriptRoute initialized');

router.post('/', async (req: Request<{}, any, TranscriptRequestBody>, res: Response<TranscriptResponse | ErrorResponse>) => {
    console.log('→ /api/transcript POST received');
    await ensureOAuthClient();

    const {url, transcriptLanguage} = req.body;
    if (!url) {
        return res.status(400).json({error: 'Missing YouTube URL'});
    }

    try {
        const [transcriptResult, chaptersResult] = await Promise.allSettled([
            getTranscriptFromUrl(url, transcriptLanguage),
            getChapters(url)
        ]);

        if (transcriptResult.status !== 'fulfilled') {
            console.error('[Transcript Error] getTranscriptFromUrl failed:', transcriptResult.reason);
            return res.status(500).json({error: transcriptResult.reason.message || 'Transcript failed to load'});
        }
        const transcript = transcriptResult.value;
        const chapters = chaptersResult.status === 'fulfilled' ? chaptersResult.value : [];

        console.log('Transcript items:', transcript.length);

        const {totalTokens, transcript: rawText} = prepareTranscript(transcript);

        console.time('splitSemantic');
        const semantic: SemanticResult = await splitTranscriptWithGPT(rawText, transcriptLanguage);
        console.timeEnd('splitSemantic');

        console.time('splitByChapters');
        let splitChapters: TranscriptBlock[] = [];
        if (chapters.length > 0) {
            splitChapters = splitTranscriptByChapters(transcript, chapters, 1.5);
        }
        console.timeEnd('splitByChapters');

        return res.json({
            language: transcriptLanguage,
            totalTokens,
            rawText,
            semantic,
            chapters: splitChapters
        });
    } catch (error) {
        console.error('[Transcript Route Error]', error);
        return res.status(500).json({error: 'Failed to process transcript'});
    }
});

export default router;
