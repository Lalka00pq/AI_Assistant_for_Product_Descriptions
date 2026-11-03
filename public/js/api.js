export async function fetchSamples() {
  return requestJson('/api/samples');
}

export async function createCard(product) {
  const data = await requestJson('/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  if (!data.card || typeof data.markdown !== 'string' || !data.checks) {
    throw new Error('Сервис вернул ответ в неожиданном формате. Попробуйте ещё раз.');
  }
  return data;
}

async function requestJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Нет связи с сервером. Проверьте, что сервис запущен, и попробуйте ещё раз.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? `Сервер вернул ошибку (код ${response.status}). Попробуйте ещё раз.`);
  }
  if (!data) {
    throw new Error('Сервер вернул пустой ответ. Попробуйте ещё раз.');
  }
  return data;
}
