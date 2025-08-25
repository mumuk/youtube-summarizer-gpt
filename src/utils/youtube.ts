// utils/youtube.js

/**
 * Извлекает videoId из YouTube-ссылки
 */
export function extractVideoId(url: string): string | null {
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : null;
}

/**
 * Преобразует время в формате 00:00 или 1:02:33 в секунды
 */
export function timeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
}
