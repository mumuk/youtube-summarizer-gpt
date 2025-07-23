import { extractVideoId, timeToSeconds } from '../utils/youtube.js';

export async function getChapters(url) {
    const videoId = extractVideoId(url);
    if (!videoId) throw new Error('Invalid YouTube URL');

    const { description, duration } = await fetchDescriptionAndDuration(videoId);
    if (!description) throw new Error('Could not fetch video description');

    const rawChapters = parseChapters(description);

    // 🛠 ВАЖНО: Теперь дополняем главы
    const chapters = completeChapters(rawChapters, duration);
    console.log('splitByChapters - chapters: ', chapters);
    return chapters;

}

async function fetchDescriptionAndDuration(videoId) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;

    const res = await fetch(apiUrl);
    const data = await res.json();

    const item = data.items?.[0];
    if (!item) return { description: null, duration: null };

    const { snippet, contentDetails } = item;
    const description = snippet?.description || null;
    const isoDuration = contentDetails?.duration || null;
    const duration = isoDuration ? isoDurationToSeconds(isoDuration) : null;

    return { description, duration };
}

function parseChapters(description) {
    const lines = description.split('\n');
    const timeRegex = /^(\d{1,2}:)?\d{1,2}:\d{2}/;

    const chapters = [];

    for (const line of lines) {
        const match = line.match(timeRegex);
        if (match) {
            const start = timeToSeconds(match[0]);
            const title = line.replace(match[0], '').trim().replace(/^[-–—\s]+/, '');
            chapters.push({ title, start });
        }
    }

    return chapters;
}

function completeChapters(chapters, videoDuration) {
    return chapters.map((chapter, index) => {
        const nextChapter = chapters[index + 1];
        return {
            title: chapter.title,
            summary: "", // можно добавить автогенерацию позже
            start: chapter.start,
            end: nextChapter ? nextChapter.start - 1 : videoDuration
        };
    });
}

function isoDurationToSeconds(isoDuration) {
    // Примитивный парсер ISO 8601 для длительности видео
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const [, hours, minutes, seconds] = match.map(x => parseInt(x || '0', 10));
    return (hours * 3600) + (minutes * 60) + seconds;
}
