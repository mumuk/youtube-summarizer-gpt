import express from 'express';
import { getTranscriptFromUrl } from '../services/transcriptService.js';

const router = express.Router();

router.post('/', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing YouTube URL' });

    try {
        const transcript = await getTranscriptFromUrl(url);
        res.json({ transcript });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve transcript' });
    }
});

export default router;