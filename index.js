// index.js

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import transcriptRoute from './routes/api/transcript.js';
import summaryRoute from './routes/api/summary.js'; // ✅ Добавлено

dotenv.config();

const app = express();

// Middleware
app.use(helmet()); // Защита заголовков
app.use(cors());   // Поддержка CORS для фронта
app.use(express.json({ limit: '20mb' })); // Увеличенный лимит на тело запроса
app.use(express.urlencoded({ extended: true, limit: '20mb' })); // На всякий случай и для форм

// Health Check
app.get('/api/health', (req, res) => {
    res.send('OK');
});

// Routes
app.use('/api/transcript', transcriptRoute);
app.use('/api/summary', summaryRoute); // ✅ Теперь подключён /api/summary

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
