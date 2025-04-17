import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import transcriptRoute from './routes/transcriptRoute.js';

dotenv.config()


const app = express();
app.use(helmet());
app.use(cors())
app.use(express.json())


app.get('/api/health', (req, res) => {
    res.send('OK');
});

app.use('/api/transcript', transcriptRoute)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});