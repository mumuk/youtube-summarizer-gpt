// utils/checkModels.js

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY as string,
});

(async (): Promise<void> => {
    const models = await openai.models.list();
    console.log('Доступные модели:');
    models.data.forEach(m => console.log(m.id));
})();
