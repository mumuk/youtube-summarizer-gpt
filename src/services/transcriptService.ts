// services/transcriptService.js

import fetch from 'node-fetch';
import path from 'path';
import { google } from 'googleapis';
import { getOAuthClient } from './oauthClient.ts';
import { extractVideoId } from '../utils/youtube.ts';
import { parseCaptionsXml } from '../utils/captionParser.ts';
import { execFile } from 'child_process';

// ─────────────────────────────────────────────────────────────
// Promise-обёртка execFile с принудительным PYTHONUTF8 = 1,
// таймаутом и killSignal
// ─────────────────────────────────────────────────────────────
function runPythonScript(pythonPath, args) {
    return new Promise((resolve, reject) => {
        execFile(
            pythonPath,
            args,
            {
                cwd: process.cwd(),
                env: { ...process.env, PYTHONUTF8: '1' },
                timeout: 120_000,       // 2 минуты
                killSignal: 'SIGTERM'   // при превышении таймаута
            },
            (error, stdout, stderr) => {
                if (error) return reject({ error, stdout, stderr });
                resolve({ stdout, stderr });
            }
        );
    });
}

// ─────────────────────────────────────────────────────────────
// Выбор пути к Python:
// 1) через переменную окружения PYTHON_CMD
// 2) .venv\Scripts\python.exe на Windows
// 3) 'python3' на остальных системах
// ─────────────────────────────────────────────────────────────
const pythonPath = process.env.PYTHON_CMD
    || (process.platform === 'win32'
        ? path.resolve(process.cwd(), '.venv', 'Scripts', 'python.exe')
        : 'python3');

// ─────────────────────────────────────────────────────────────
// Главная функция получения транскрипта
// ─────────────────────────────────────────────────────────────
export async function getTranscriptFromUrl(url, transcriptLanguage = 'en') {
    const videoId = extractVideoId(url);
    if (!videoId) throw new Error('Invalid YouTube URL');

    // Python-only fallback
    const args = ['scripts/get_transcript.py', videoId, transcriptLanguage];
    console.log('[Transcript] Using Python at:', pythonPath);
    console.log('[Transcript] PYTHON fallback args:', args);

    try {
        const { stdout, stderr } = await runPythonScript(pythonPath, args);

        if (stderr) {
            console.warn('[Transcript] PYTHON stderr:', stderr.toString().slice(0, 200));
        }

        const data = JSON.parse(stdout);
        if (data.error) {
            throw new Error(data.error);
        }

        console.log('[Transcript] PYTHON succeeded, items:', Array.isArray(data) ? data.length : '(unexpected format)');
        return data.map(item => ({
            start: item.start,
            text: item.text.trim().replace(/\s+/g, ' ')
        }));
    } catch (e) {
        console.error('[Transcript] PYTHON failed:', e.error?.message || e.message);
        if (e.stderr) {
            console.error('[Transcript] PYTHON stderr full:', e.stderr.toString());
        }
        throw new Error('Python-only fallback failed: ' + (e.error?.message || e.message));
    }
}
