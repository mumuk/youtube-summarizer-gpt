import { YoutubeTranscript } from 'youtube-transcript';

export async function getTranscriptFromUrl(url) {
    const videoId = extractVideoId(url);
    if (!videoId) throw new Error('Invalid YouTube URL');
    return await YoutubeTranscript.fetchTranscript(videoId);
}

function extractVideoId(url) {
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : null;
}