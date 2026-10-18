// Вебхук Telegram-бота Ventorme AI: POST /api/telegram
// Telegram присылает заголовок X-Telegram-Bot-Api-Secret-Token с секретом из setWebhook (см. api/setup.js).
// Апдейт обрабатываем до ответа: после ответа Vercel может заморозить функцию.
// Повторную доставку того же апдейта отсекает store.firstDelivery.
import { refuseIfMissing, safeEqual, webhookSecret } from '../bot/env.js';
import { handleUpdate } from '../bot/handlers.js';

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || 'null'); } catch (e) { return null; }
}

export default async function handler(req, res) {
  if (refuseIfMissing(res, 'telegram', ['TG_BOT_TOKEN'], { redis: false })) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!safeEqual(req.headers['x-telegram-bot-api-secret-token'], webhookSecret())) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    await handleUpdate(readBody(req));
  } catch (err) {
    // Всегда 200: иначе Telegram будет повторять апдейт снова и снова
    console.error('[telegram] апдейт не обработан:', err);
  }
  return res.status(200).json({ ok: true });
}
