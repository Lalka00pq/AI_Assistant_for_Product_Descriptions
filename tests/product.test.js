import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ServiceError } from '../src/errors.js';
import { parseProduct, PRODUCT_LIMITS } from '../src/product.js';

function assertServiceError(fn, { status, includes }) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof ServiceError, 'ожидалась ServiceError');
    assert.equal(error.statusCode, status);
    assert.ok(error.message.includes(includes), `сообщение: "${error.message}"`);
    return true;
  });
}

test('поля обрезаются, пустые характеристики пропускаются', () => {
  const product = parseProduct({
    name: '  Манометр DM 02 ',
    manufacturer: 'Манотомь',
    specs: { ' присоединение ': ' G1/2 ', пусто: '  ', '': 'значение' },
  });

  assert.equal(product.name, 'Манометр DM 02');
  assert.deepEqual(product.specs, { присоединение: 'G1/2' });
});

test('null в описании и характеристиках превращается в пустое значение', () => {
  const product = parseProduct({ name: 'Термометр', manufacturer: 'X', description: null, specs: null });

  assert.equal(product.description, '');
  assert.deepEqual(product.specs, {});
});

test('числовые значения характеристик переводятся в текст', () => {
  const product = parseProduct({ name: 'Термометр', manufacturer: 'X', specs: { класс: 1.5, количество: 2 } });

  assert.deepEqual(product.specs, { класс: '1.5', количество: '2' });
});

test('пустое название отклоняется с понятным сообщением', () => {
  assertServiceError(() => parseProduct({ name: '   ', manufacturer: 'Манотомь' }), {
    status: 400,
    includes: 'название товара',
  });
});

test('отсутствующий производитель назван в сообщении', () => {
  assertServiceError(() => parseProduct({ name: 'Манометр' }), { status: 400, includes: 'производитель' });
});

test('тело запроса не в виде объекта отклоняется', () => {
  assertServiceError(() => parseProduct(['манометр']), { status: 400, includes: 'объектом' });
});

test('неверный тип характеристик отклоняется', () => {
  assertServiceError(() => parseProduct({ name: 'Манометр', manufacturer: 'X', specs: ['строка'] }), {
    status: 400,
    includes: 'Проверьте формат: характеристики',
  });
});

test('слишком много характеристик отклоняется', () => {
  const specs = Object.fromEntries(
    Array.from({ length: PRODUCT_LIMITS.specs + 1 }, (_, index) => [`параметр ${index}`, 'значение']),
  );

  assertServiceError(() => parseProduct({ name: 'Манометр', manufacturer: 'X', specs }), {
    status: 400,
    includes: 'Характеристик может быть не больше',
  });
});

test('слишком длинный текст отклоняется', () => {
  const name = 'а'.repeat(PRODUCT_LIMITS.textLength + 1);

  assertServiceError(() => parseProduct({ name, manufacturer: 'X' }), {
    status: 400,
    includes: 'Слишком длинный текст',
  });
});
