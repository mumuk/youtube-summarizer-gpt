// routes/api/transcript.js

import express from 'express';
import { getTranscriptFromUrl } from '../../services/transcriptService.js';
import { getChapters } from '../../services/chapters.js';
import { prepareTranscript } from '../../utils/transcriptPreparer.js';
import { splitTranscriptWithGPT } from '../../services/semanticSplitter.js';
import {splitTranscriptByChapters} from "../../services/chapterSplitter.js"; // добавляем сюда нормализацию!

const router = express.Router();

router.post('/', async (req, res) => {
    const { url,  transcriptLanguage} = req.body;
    if (!url) return res.status(400).json({ error: 'Missing YouTube URL' });

    try {
        // Загружаем transcript и главы параллельно
        const [transcriptResult, chaptersResult] = await Promise.allSettled([
            getTranscriptFromUrl(url),
            getChapters(url)
        ]);

        const transcript =
            transcriptResult.status === 'fulfilled' ? transcriptResult.value : null;
        const chapters =
            chaptersResult.status === 'fulfilled' ? chaptersResult.value : [];

        if (!transcript) {
            return res.status(500).json({ error: 'Transcript failed to load' });
        }



        // Подготавливаем весь текст и считаем токени
        const {totalTokens,transcript:rawText} = prepareTranscript(transcript)

        const [semantic, splitChapters] = await Promise.all([
            splitTranscriptWithGPT(rawText, transcriptLanguage),
            splitTranscriptByChapters(chapters, rawText, transcriptLanguage)
        ]);


        // Возвращаем готовый ответ
        res.json({
            language:transcriptLanguage,
            totalTokens,
            transcript: rawText,          // Очищенный транскрипт (массива сабов с временем и текстом)
            chapters: splitChapters, // Нормализованные главы
            semantic
        });

    } catch (error) {
        console.error('[Transcript Error]', error);
        res.status(500).json({ error: 'Failed to process transcript' });
    }
});

export default router;
