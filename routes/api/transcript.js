// routes/api/transcript.js

import express from 'express';
import {ensureOAuthClient} from '../../services/oauthClient.js';
import {getTranscriptFromUrl} from '../../services/transcriptService.js';
import {getChapters} from '../../services/chapters.js';
import {prepareTranscript} from '../../utils/transcriptPreparer.js';
import {splitTranscriptWithGPT} from '../../services/semanticSplitter.js';
import {splitTranscriptByChapters} from '../../services/chapterSplitter.js';

const router = express.Router();

// Логируем подключение роутера
console.log('✅ transcriptRoute initialized');

// POST /api/transcript
router.post('/', async (req, res) => {
    console.log('→ /api/transcript POST received');
    await ensureOAuthClient(); // убеждаемся, что настроен OAuth

    const {url, transcriptLanguage} = req.body;
    if (!url) {
        return res.status(400).json({error: 'Missing YouTube URL'});
    }

    try {
        // Получаем транскрипт и главы параллельно
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

        // Подготавливаем текст (объединяем, считаем токены)
        const {totalTokens, transcript: rawText} = prepareTranscript(transcript);

        // 1) Генерируем семантические блоки
         console.time('splitSemantic');
         const semantic = await splitTranscriptWithGPT(rawText, transcriptLanguage);
         console.timeEnd('splitSemantic');

// 2) Локально разбиваем по главам только если они есть
        console.time('splitByChapters');
        let splitChapters = [];
        if (chapters.length > 0) {
            // Передаём оригинальный массив сегментов transcript,
            // а внутри splitTranscriptByChapters будем чистить, считать токены и резать
            splitChapters = splitTranscriptByChapters(transcript, chapters, /* overlapSec */ 1.5);
        }
        console.timeEnd('splitByChapters');

        // Отправляем ответ
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
