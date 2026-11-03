import { ServiceError } from './errors.js';
import { isPlainObject } from './guards.js';

export const PRODUCT_LIMITS = {
  textLength: 5000,
  specs: 50,
};

const FIELD_LABELS = {
  name: 'название товара',
  manufacturer: 'производитель',
  description: 'описание',
  specs: 'характеристики',
};

const INVALID_BODY_MESSAGE =
  'Данные товара должны быть объектом с полями name, manufacturer, specs и description.';

export function parseProduct(raw) {
  if (!isPlainObject(raw)) {
    throw new ServiceError(INVALID_BODY_MESSAGE, 400);
  }

  const problems = createProblems();
  const product = {
    name: readText(raw.name, 'name', problems, { required: true }),
    manufacturer: readText(raw.manufacturer, 'manufacturer', problems, { required: true }),
    description: readText(raw.description, 'description', problems),
    specs: readSpecs(raw.specs, problems),
  };

  const message = describeProblems(problems);
  if (message) {
    throw new ServiceError(message, 400);
  }
  return product;
}

function createProblems() {
  return {
    missing: new Set(),
    invalid: new Set(),
    tooLong: new Set(),
    tooManySpecs: false,
  };
}

function isEmptyValue(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function readText(value, field, problems, { required = false } = {}) {
  if (isEmptyValue(value)) {
    if (required) problems.missing.add(field);
    return '';
  }
  if (typeof value !== 'string') {
    problems.invalid.add(field);
    return '';
  }
  const text = value.trim();
  if (text.length > PRODUCT_LIMITS.textLength) problems.tooLong.add(field);
  return text;
}

function readSpecs(value, problems) {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) {
    problems.invalid.add('specs');
    return {};
  }

  const specs = {};
  for (const [rawName, rawValue] of Object.entries(value)) {
    const name = rawName.trim();
    const text = toSpecText(rawValue);
    if (text === null) {
      problems.invalid.add('specs');
      continue;
    }
    if (!name || !text) continue;
    if (text.length > PRODUCT_LIMITS.textLength) problems.tooLong.add('specs');
    specs[name] = text;
  }

  if (Object.keys(specs).length > PRODUCT_LIMITS.specs) {
    problems.tooManySpecs = true;
  }
  return specs;
}

function toSpecText(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value.trim();
  return null;
}

function describeProblems({ missing, invalid, tooLong, tooManySpecs }) {
  const parts = [];
  if (missing.size) parts.push(`Не заполнено: ${listLabels(missing)}.`);
  if (invalid.size) parts.push(`Проверьте формат: ${listLabels(invalid)}.`);
  if (tooLong.size) {
    parts.push(`Слишком длинный текст (не больше ${PRODUCT_LIMITS.textLength} символов): ${listLabels(tooLong)}.`);
  }
  if (tooManySpecs) {
    parts.push(`Характеристик может быть не больше ${PRODUCT_LIMITS.specs}.`);
  }
  return parts.join(' ');
}

function listLabels(fields) {
  return [...fields].map((field) => FIELD_LABELS[field]).join(', ');
}
