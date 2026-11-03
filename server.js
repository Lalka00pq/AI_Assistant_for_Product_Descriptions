import 'dotenv/config';
import { createApp } from './src/app.js';
import { loadConfig } from './src/config.js';
import { createCardGenerator } from './src/gemini.js';

const config = loadConfig();

if (!config.geminiApiKey) {
  console.warn('GEMINI_API_KEY не задан. Добавьте его в файл .env, иначе генерация карточек не заработает.');
}

const app = createApp({
  generateCard: createCardGenerator({
    apiKey: config.geminiApiKey,
    model: config.geminiModel,
  }),
});

app.listen(config.port, () => {
  console.log(`Генератор карточек запущен: http://localhost:${config.port}`);
});
