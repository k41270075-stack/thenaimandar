// Подключение бота одной ссылкой: GET /api/setup (если задан CRON_SECRET — /api/setup?key=<CRON_SECRET>)
// Ставит вебхук на домен этого проекта (с секретом) и записывает меню команд.
// Вызывать после каждого деплоя не нужно: только первый раз и после смены токена. Повторный вызов безопасен.
// Без ключа вебхук ставится только на домен, который сообщает сам Vercel (VERCEL_PROJECT_PRODUCTION_URL),
// а не на Host из запроса: так через эту ссылку нельзя увести бота на чужой сервер.
import { refuseIfMissing, safeEqual, webhookSecret } from '../bot/env.js';
import { tg } from '../bot/tg.js';
import { COMMANDS } from '../bot/commands.js';

function queryKey(req) {
  if (req.query && typeof req.query.key === 'string') return req.query.key;
  return new URL(req.url || '/', 'http://localhost').searchParams.get('key');
}

export default async function handler(req, res) {
  if (refuseIfMissing(res, 'setup', ['TG_BOT_TOKEN'], { redis: false })) return;

  const secret = process.env.CRON_SECRET;
  const keyOk = Boolean(secret) && (safeEqual(queryKey(req), secret) || safeEqual(req.headers.authorization, 'Bearer ' + secret));
  if (secret && !keyOk) {
    return res.status(401).json({ ok: false, error: 'unauthorized', hint: 'Откройте /api/setup?key=<CRON_SECRET>' });
  }

  // Основной домен проекта от Vercel; домен из запроса — только с верным ключом
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || (keyOk ? req.headers['x-forwarded-host'] || req.headers.host : '');
  if (!host) {
    return res.status(400).json({ ok: false, error: 'no_domain', hint: 'Задайте CRON_SECRET и откройте /api/setup?key=<CRON_SECRET>' });
  }

  try {
    const me = await tg('getMe', {});
    await tg('setWebhook', {
      url: `https://${host}/api/telegram`,
      secret_token: webhookSecret(),
      allowed_updates: ['message', 'callback_query']
    });
    await tg('setMyCommands', { commands: COMMANDS.map(({ command, description }) => ({ command, description })) });
    const info = await tg('getWebhookInfo', {});
    return res.status(200).json({
      ok: true,
      bot: '@' + me.username,
      webhook: info.url,
      commands: COMMANDS.length,
      next: 'Готово. Откройте бота в Telegram и нажмите «Старт».'
    });
  } catch (err) {
    console.error('[setup] не удалось подключить бота:', err.message);
    return res.status(502).json({ ok: false, error: err.message });
  }
}
