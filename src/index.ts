//src/index.ts
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import transcriptRoute from './routes/api/transcript.ts';
import authRoute from './routes/api/auth.ts';
import summaryRoute from './routes/api/summary.ts';

dotenv.config();

const app = express();
app.use((req, res, next) => {
    console.log(`→ ${req.method} ${req.originalUrl}`);
    next();
});
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.get('/api/health', (_req: Request, res: Response) => {
    console.log('OK!!!!')
    res.send('OK');
});

app.use('/api/auth', authRoute);
app.use('/api/transcript', transcriptRoute);
app.use('/api/summary', summaryRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});