import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCardGenerator } from '../src/gemini.js';
import { ServiceError } from '../src/errors.js';
import { parseProduct } from '../src/product.js';
import { validCardData } from './fixtures.js';

const product = parseProduct({ name: 'Манометр DM 02', manufacturer: 'Манотомь', specs: { присоединение: 'G1/2' } });

function geminiResponse(text) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function generatorWith(fetchImpl, apiKey = 'test-key') {
  return createCardGenerator({ apiKey, model: 'gemini-2.5-flash', fetchImpl });
}

async function assertRejects(promise, { status, includes }) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof ServiceError, `ожидалась ServiceError, получено: ${error}`);
    assert.equal(error.statusCode, status);
    assert.ok(error.message.includes(includes), `сообщение: "${error.message}"`);
    return true;
  });
}

test('успешный ответ разбирается и отправляется с ключом', async () => {
  const seen = {};
  const generate = generatorWith(async (url, options) => {
    seen.url = url;
    seen.options = options;
    return geminiResponse(JSON.stringify(validCardData));
  });

  const card = await generate(product);

  assert.equal(card.seoTitle, validCardData.seoTitle);
  assert.ok(seen.url.endsWith('/models/gemini-2.5-flash:generateContent'));
  assert.equal(seen.options.headers['x-goog-api-key'], 'test-key');
  const payload = JSON.parse(seen.options.body);
  assert.equal(payload.generationConfig.responseMimeType, 'application/json');
  assert.ok(payload.generationConfig.responseSchema);
});

test('без ключа API не вызывается и выдаётся ошибка 500', async () => {
  const generate = generatorWith(async () => {
    throw new Error('сеть не должна вызываться');
  }, '');

  await assertRejects(generate(product), { status: 500, includes: 'GEMINI_API_KEY' });
});

test('ответ 429 переводится в сообщение о лимите', async () => {
  const generate = generatorWith(async () => new Response('{}', { status: 429 }));

  await assertRejects(generate(product), { status: 429, includes: 'лимит' });
});

test('ответ 403 сообщает о проблеме с ключом или моделью', async () => {
  const generate = generatorWith(async () => new Response('{}', { status: 403 }));

  await assertRejects(generate(product), { status: 502, includes: 'GEMINI_API_KEY' });
});

test('ошибка сервера Gemini переводится в сообщение о недоступности', async () => {
  const generate = generatorWith(async () => new Response('{}', { status: 500 }));

  await assertRejects(generate(product), { status: 502, includes: 'временно недоступна' });
});

test('сетевой сбой переводится в сообщение о связи', async () => {
  const generate = generatorWith(async () => {
    throw new TypeError('fetch failed');
  });

  await assertRejects(generate(product), { status: 502, includes: 'Не удалось связаться' });
});

test('превышение времени ожидания возвращает 504', async () => {
  const generate = generatorWith(async () => {
    throw new DOMException('timeout', 'TimeoutError');
  });

  await assertRejects(generate(product), { status: 504, includes: 'не ответила' });
});

test('пустой ответ модели считается ошибкой', async () => {
  const generate = generatorWith(async () => new Response(JSON.stringify({ candidates: [] })));

  await assertRejects(generate(product), { status: 502, includes: 'не вернула результат' });
});

test('текст не в формате JSON считается ошибкой формата', async () => {
  const generate = generatorWith(async () => geminiResponse('это не JSON'));

  await assertRejects(generate(product), { status: 502, includes: 'неожиданном формате' });
});

test('JSON без нужных полей считается ошибкой формата', async () => {
  const generate = generatorWith(async () => geminiResponse(JSON.stringify({ seoTitle: 'Манометр' })));

  await assertRejects(generate(product), { status: 502, includes: 'неожиданном формате' });
});
