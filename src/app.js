import express from 'express';
import { fileURLToPath } from 'node:url';
import { buildChecks } from './card.js';
import { ServiceError } from './errors.js';
import { cardToMarkdown } from './markdown.js';
import { parseProduct, PRODUCT_LIMITS } from './product.js';
import { SAMPLE_PRODUCTS } from './samples.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url));
const BODY_LIMIT = '200kb';

export function createApp({ generateCard }) {
  const app = express();

  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.static(PUBLIC_DIR));

  app.get('/api/samples', (_req, res) => {
    res.json({ samples: SAMPLE_PRODUCTS, productLimits: PRODUCT_LIMITS });
  });

  app.post('/api/cards', async (req, res) => {
    const product = parseProduct(req.body);
    const card = await generateCard(product);
    res.json({
      card,
      checks: buildChecks(card),
      markdown: cardToMarkdown(card),
    });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Такого адреса в сервисе нет.' });
  });

  app.use(handleError);
  return app;
}

function handleError(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }
  const { status, message } = describeError(error);
  res.status(status).json({ error: message });
}

function describeError(error) {
  if (error instanceof ServiceError) {
    return { status: error.statusCode, message: error.message };
  }
  if (error.type === 'entity.parse.failed') {
    return {
      status: 400,
      message: 'Запрос содержит некорректный JSON. Проверьте, все ли кавычки, запятые и скобки на месте.',
    };
  }
  if (error.type === 'entity.too.large') {
    return { status: 413, message: 'Данные слишком большие. Сократите описание или список характеристик.' };
  }
  console.error('Unexpected error:', error);
  return { status: 500, message: 'Внутренняя ошибка сервиса. Попробуйте ещё раз.' };
}
