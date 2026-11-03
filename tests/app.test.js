import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { ServiceError } from '../src/errors.js';
import { normalizeCard } from '../src/card.js';
import { validCardData } from './fixtures.js';

let baseUrl;
let server;
let generatorBehavior;

before(async () => {
  const app = createApp({
    generateCard: async (product) => {
      if (generatorBehavior) return generatorBehavior(product);
      return normalizeCard(validCardData);
    },
  });
  server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
});

function postJson(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('главная страница отдаётся с сервера', async () => {
  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.ok(html.includes('Генератор черновиков'));
});

test('статические файлы отдаются', async () => {
  const response = await fetch(`${baseUrl}/js/main.js`);

  assert.equal(response.status, 200);
});

test('примеры отдаются через API', async () => {
  const response = await fetch(`${baseUrl}/api/samples`);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.samples.length, 2);
  assert.ok(data.productLimits.textLength > 0);
});

test('корректный товар возвращает карточку, проверки и markdown', async () => {
  generatorBehavior = null;
  const response = await postJson('/api/cards', { name: 'Манометр', manufacturer: 'Манотомь' });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.card.seoTitle, validCardData.seoTitle);
  assert.equal(data.checks.seoTitle.ok, true);
  assert.ok(data.markdown.includes('## Заголовок'));
});

test('некорректный JSON возвращает 400 на русском', async () => {
  const response = await postJson('/api/cards', '{"name": "Манометр",');
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.ok(data.error.includes('некорректный JSON'));
});

test('пустые поля возвращают 400 без вызова модели', async () => {
  generatorBehavior = () => {
    throw new Error('модель не должна вызываться');
  };
  const response = await postJson('/api/cards', { name: '', manufacturer: '' });
  const data = await response.json();
  generatorBehavior = null;

  assert.equal(response.status, 400);
  assert.ok(data.error.includes('Не заполнено'));
});

test('массив вместо объекта возвращает 400', async () => {
  const response = await postJson('/api/cards', ['манометр']);

  assert.equal(response.status, 400);
});

test('ошибка сервиса из генератора передаётся клиенту с её кодом', async () => {
  generatorBehavior = () => {
    throw new ServiceError('Превышен лимит запросов к модели. Подождите минуту и повторите.', 429);
  };
  const response = await postJson('/api/cards', { name: 'Манометр', manufacturer: 'Манотомь' });
  const data = await response.json();
  generatorBehavior = null;

  assert.equal(response.status, 429);
  assert.ok(data.error.includes('лимит'));
});

test('неожиданная ошибка возвращает 500 без технических деталей', async () => {
  generatorBehavior = () => {
    throw new Error('внутренние детали');
  };
  const response = await postJson('/api/cards', { name: 'Манометр', manufacturer: 'Манотомь' });
  const data = await response.json();
  generatorBehavior = null;

  assert.equal(response.status, 500);
  assert.equal(data.error, 'Внутренняя ошибка сервиса. Попробуйте ещё раз.');
});

test('неизвестный адрес API возвращает 404 в формате JSON', async () => {
  const response = await fetch(`${baseUrl}/api/unknown`);

  assert.equal(response.status, 404);
  assert.ok((await response.json()).error);
});
