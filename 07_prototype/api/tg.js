// Прокси к Telegram Bot API для страницы bot.html: POST /api/tg
// Нужен, если браузер не пускает страницу к api.telegram.org напрямую (CORS). Страница присылает
// токен, метод и параметры; функция пересылает их в Telegram и возвращает ответ как есть.
// Токен нигде не хранится и не пишется в логи. Пропускаем только методы бота и только бота @VentormeAI_bot.
const API = 'https://api.telegram.org/bot';
const BOT_ID = process.env.TG_BOT_ID || '8743940607';
const METHODS = new Set(['getMe', 'deleteWebhook', 'setMyCommands', 'getUpdates', 'sendMessage',
  'editMessageText', 'answerCallbackQuery', 'sendChatAction']);

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return Object.fromEntries(new URLSearchParams(String(req.body || '')));
}

export default async function handler(req, res) {
  // Страница может быть открыта с другого адреса или как файл: разрешаем любой источник
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, description: 'method_not_allowed' });
  }

  const { token = '', method = '', params = '{}' } = readBody(req);
  if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(token) || token.split(':')[0] !== BOT_ID) {
    return res.status(403).json({ ok: false, error_code: 403, description: 'Этот прокси только для бота Ventorme AI' });
  }
  if (!METHODS.has(method)) {
    return res.status(400).json({ ok: false, error_code: 400, description: 'Метод не разрешён' });
  }
  try { JSON.parse(params); } catch (e) {
    return res.status(400).json({ ok: false, error_code: 400, description: 'Параметры не JSON' });
  }

  try {
    const tgRes = await fetch(API + token + '/' + method, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: params
    });
    const text = await tgRes.text();
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.status(tgRes.status).send(text);
  } catch (err) {
    console.error('[tg-proxy] нет связи с Telegram:', err.message);
    return res.status(502).json({ ok: false, error_code: 502, description: 'Нет связи с Telegram' });
  }
}
