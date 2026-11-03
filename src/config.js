const DEFAULT_PORT = 3000;
const DEFAULT_MODEL = 'gemini-2.5-flash';

export function loadConfig(env = process.env) {
  return {
    port: parsePort(env.PORT),
    geminiApiKey: (env.GEMINI_API_KEY ?? '').trim(),
    geminiModel: (env.GEMINI_MODEL ?? '').trim() || DEFAULT_MODEL,
  };
}

function parsePort(value) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT;
}
