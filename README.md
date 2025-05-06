# 🎬 YouTube Summarizer GPT

A Node.js-based agent that summarizes YouTube videos by extracting transcripts and chapters, then generating a concise structured summary using OpenAI's API.

---

## 🚀 Features

- 📄 Fetches YouTube auto-generated transcripts
- 🕒 Parses chapters and timestamps from video description
- ✂️ Splits transcript into token-aware chunks
- 🧠 Generates chunk-level summaries via OpenAI
- 🧾 Returns:
  - Final summary
  - Chapters with timestamps
  - Token and cost statistics

---

## 🧱 Project Structure

```bash
.
├── index.js
├── routes/
│   └── transcript.js
├── services/
│   └── transcriptService.js
├── .env.example
├── project.md
└── ...
```

---

## 📦 Installation

```bash
git clone https://github.com/yourusername/youtube-summarizer-gpt.git
cd youtube-summarizer-gpt
npm install
cp .env.example .env
```

Fill in your actual `OPENAI_API_KEY` inside `.env`.

---

## 🖥️ Usage

Start the server:

```bash
npm run dev
```

Test the API:

```http
POST /api/transcript
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=yourVideoId"
}
```

---

## 📁 API Response

```json
{
  "transcript": [
    {
      "text": "This is a line of transcript",
      "offset": 0,
      "duration": 5.2
    }
  ]
}
```

---

## 📘 Documentation

Full project architecture and roadmap available in [`project.md`](./project.md).

---

## 🛡️ License

MIT © [Mykhailo Lytvynov]