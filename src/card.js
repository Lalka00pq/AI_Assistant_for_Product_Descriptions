import { ServiceError } from './errors.js';
import { isPlainObject } from './guards.js';

export const CARD_LIMITS = {
  titleMax: 70,
  descriptionMin: 800,
  descriptionMax: 1200,
  queriesMin: 3,
  queriesMax: 5,
};

export const CARD_FORMAT_ERROR = 'Модель вернула ответ в неожиданном формате. Попробуйте ещё раз.';

export function normalizeCard(data) {
  if (!isPlainObject(data)) throw formatError();
  const manager = requireObject(data.managerBlock);

  return {
    seoTitle: requireString(data.seoTitle),
    seoDescription: requireString(data.seoDescription),
    keyCharacteristics: requireList(data.keyCharacteristics)
      .map(normalizeCharacteristic)
      .filter((item) => item.name),
    searchQueries: requireList(data.searchQueries).map(requireString).filter(Boolean),
    managerBlock: {
      suitableFor: requireString(manager.suitableFor),
      tasks: requireString(manager.tasks),
    },
    missingData: requireList(data.missingData).map(requireString).filter(Boolean),
  };
}

export function buildChecks(card) {
  const titleLength = [...card.seoTitle].length;
  const descriptionLength = [...card.seoDescription].length;
  const queriesCount = card.searchQueries.length;

  return {
    seoTitle: {
      length: titleLength,
      max: CARD_LIMITS.titleMax,
      ok: titleLength > 0 && titleLength <= CARD_LIMITS.titleMax,
    },
    seoDescription: {
      length: descriptionLength,
      min: CARD_LIMITS.descriptionMin,
      max: CARD_LIMITS.descriptionMax,
      ok: descriptionLength >= CARD_LIMITS.descriptionMin && descriptionLength <= CARD_LIMITS.descriptionMax,
    },
    searchQueries: {
      count: queriesCount,
      min: CARD_LIMITS.queriesMin,
      max: CARD_LIMITS.queriesMax,
      ok: queriesCount >= CARD_LIMITS.queriesMin && queriesCount <= CARD_LIMITS.queriesMax,
    },
  };
}

function normalizeCharacteristic(item) {
  if (!isPlainObject(item)) throw formatError();
  return { name: requireString(item.name), value: requireString(item.value) };
}

function requireString(value) {
  if (typeof value !== 'string') throw formatError();
  return value.trim();
}

function requireList(value) {
  if (!Array.isArray(value)) throw formatError();
  return value;
}

function requireObject(value) {
  if (!isPlainObject(value)) throw formatError();
  return value;
}

function formatError() {
  return new ServiceError(CARD_FORMAT_ERROR, 502);
}
