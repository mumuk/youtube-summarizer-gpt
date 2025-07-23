#!/usr/bin/env python3
# scripts/get_transcript.py

import sys, json
from youtube_transcript_api import YouTubeTranscriptApi

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error":"No video ID provided"}))
        return
    video_id = sys.argv[1]
    lang = sys.argv[2] if len(sys.argv) > 2 else None
    try:
        if lang:
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
        else:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
        print(json.dumps(transcript, ensure_ascii=False))
    except Exception as e:
        # Always exit with code 0, output JSON error
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()