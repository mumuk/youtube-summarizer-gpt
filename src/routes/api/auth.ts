import express, { Request, Response } from 'express';
import {google} from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
);

// 1) Старт авторизации
router.get('/', (_req: Request, res: Response) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/youtube.force-ssl'],
        prompt: 'consent',
    });
    res.redirect(url);
});

// 2) Callback
router.get('/callback', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const {tokens} = await oauth2Client.getToken(code);
    // Выводим в консоль для копирования в .env
    console.log('REFRESH_TOKEN=', tokens.refresh_token);
    res.send('Скопируйте REFRESH_TOKEN из лога и вставьте в .env');
});

export default router;
