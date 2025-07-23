// новый файл: services/oauthClient.js
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const oAuth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
);

// Загружает refresh_token из .env и устанавливает в клиенте
export async function ensureOAuthClient() {
    const token = process.env.REFRESH_TOKEN;
    if (!token) throw new Error('REFRESH_TOKEN not found in .env; run /api/auth first');
    oAuth2Client.setCredentials({ refresh_token: token });
    // Обновляем access_token для дальнейших запросов
    const { credentials } = await oAuth2Client.refreshAccessToken();
    oAuth2Client.setCredentials(credentials);
}

export function getOAuthClient() {
    return oAuth2Client;
}
