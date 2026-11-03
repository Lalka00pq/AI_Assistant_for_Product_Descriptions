import { CARD_FORMAT_ERROR, normalizeCard } from './card.js';
import { ServiceError } from './errors.js';
import { buildUserMessage, RESPONSE_SCHEMA, SYSTEM_PROMPT } from './prompt.js';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const REQUEST_TIMEOUT_MS = 60_000;
const EMPTY_RESPONSE_MESSAGE = 'Модель не вернула результат. Попробуйте ещё раз.';

export function createCardGenerator({ apiKey, model, fetchImpl = fetch }) {
  return async function generateCard(product) {
    if (!apiKey) {
      throw new ServiceError(
        'Ключ доступа к модели не задан. Добавьте GEMINI_API_KEY в файл .env и перезапустите сервер.',
        500,
      );
    }

    const response = await sendRequest(fetchImpl, { apiKey, model, product });
    const body = await readJson(response);
    return parseCard(extractText(body));
  };
}

async function sendRequest(fetchImpl, { apiKey, model, product }) {
  const url = `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`;

  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(buildPayload(product)),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw networkError(error);
  }

  if (!response.ok) {
    console.error(`Gemini API responded with HTTP ${response.status}`);
    throw statusError(response.status);
  }
  return response;
}

function buildPayload(product) {
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: buildUserMessage(product) }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };
}

function networkError(error) {
  if (error.name === 'TimeoutError' || error.name === 'AbortError') {
    return new ServiceError('Модель не ответила за 60 секунд. Попробуйте ещё раз.', 504);
  }
  console.error('Gemini request failed:', error);
  return new ServiceError('Не удалось связаться с моделью. Проверьте интернет-соединение и попробуйте ещё раз.', 502);
}

function statusError(status) {
  if (status === 429) {
    return new ServiceError('Превышен лимит запросов к модели. Подождите минуту и повторите.', 429);
  }
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return new ServiceError('Модель отклонила запрос. Проверьте GEMINI_API_KEY и GEMINI_MODEL в файле .env.', 502);
  }
  return new ServiceError('Модель временно недоступна. Попробуйте позже.', 502);
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractText(body) {
  const parts = body?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((part) => part?.text ?? '').join('') : '';
  if (!text.trim()) {
    throw new ServiceError(EMPTY_RESPONSE_MESSAGE, 502);
  }
  return text;
}

function parseCard(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    console.error('Gemini returned invalid JSON:', error);
    throw new ServiceError(CARD_FORMAT_ERROR, 502);
  }
  return normalizeCard(data);
}
