import { YoutubeTranscript } from 'youtube-transcript';
import {extractVideoId} from "../utils/youtube.js";

export async function getTranscriptFromUrl(url) {
    const videoId = extractVideoId(url);
    if (!videoId) throw new Error('Invalid YouTube URL');
    return await YoutubeTranscript.fetchTranscript(videoId);
}

