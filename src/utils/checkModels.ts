// utils/checkModels.js

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

(async () => {
    const models = await openai.models.list();
    console.log('Доступные модели:');
    models.data.forEach(m => console.log(m.id));
})();
