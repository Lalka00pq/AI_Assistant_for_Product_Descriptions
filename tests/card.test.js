import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChecks, normalizeCard } from '../src/card.js';
import { cardToMarkdown } from '../src/markdown.js';
import { ServiceError } from '../src/errors.js';
import { validCardData } from './fixtures.js';

test('карточка нормализуется и обрезаются пустые элементы', () => {
  const card = normalizeCard({
    ...validCardData,
    searchQueries: ['манометр', '   ', ''],
    missingData: [''],
  });

  assert.deepEqual(card.searchQueries, ['манометр']);
  assert.deepEqual(card.missingData, []);
  assert.equal(card.managerBlock.suitableFor, 'данных нет');
});

test('отсутствующее обязательное поле считается ошибкой формата', () => {
  const { seoTitle, ...broken } = validCardData;

  assert.throws(() => normalizeCard(broken), (error) => {
    assert.ok(error instanceof ServiceError);
    assert.equal(error.statusCode, 502);
    return true;
  });
});

test('список вместо объекта в managerBlock считается ошибкой формата', () => {
  assert.throws(() => normalizeCard({ ...validCardData, managerBlock: [] }), ServiceError);
});

test('проверки длины показывают выход за пределы', () => {
  const checks = buildChecks(
    normalizeCard({
      ...validCardData,
      seoTitle: 'а'.repeat(71),
      seoDescription: 'б'.repeat(100),
      searchQueries: ['один', 'два'],
    }),
  );

  assert.equal(checks.seoTitle.ok, false);
  assert.equal(checks.seoDescription.ok, false);
  assert.equal(checks.searchQueries.ok, false);
});

test('длина заголовка считается по символам, а не по байтам', () => {
  const checks = buildChecks(normalizeCard({ ...validCardData, seoTitle: 'Манометр' }));

  assert.equal(checks.seoTitle.length, 8);
  assert.equal(checks.seoTitle.ok, true);
});

test('markdown содержит все разделы', () => {
  const markdown = cardToMarkdown(normalizeCard(validCardData));

  assert.ok(markdown.includes('## Заголовок'));
  assert.ok(markdown.includes('- **диапазон измерений:** 0–1,6 МПа'));
  assert.ok(markdown.includes('- манометр DM 02'));
  assert.ok(markdown.includes('## Что нужно уточнить'));
});

test('пустые списки в markdown помечаются как данных нет', () => {
  const markdown = cardToMarkdown(
    normalizeCard({ ...validCardData, keyCharacteristics: [], searchQueries: [], missingData: [] }),
  );

  assert.ok(markdown.includes('## Ключевые характеристики\nданных нет'));
  assert.ok(markdown.includes('## Поисковые запросы\nданных нет'));
  assert.ok(!markdown.includes('## Что нужно уточнить'));
});
