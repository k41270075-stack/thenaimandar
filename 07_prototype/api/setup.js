// Подключение бота одной ссылкой: GET /api/setup?key=<CRON_SECRET>
// Ставит вебхук на домен этого проекта (с секретом) и записывает меню команд.
// Вызывать после каждого деплоя не нужно: только первый раз и после смены токена. Повторный вызов безопасен.
import { refuseIfMissing, safeEqual, webhookSecret } from '../bot/env.js';
import { tg } from '../bot/tg.js';
import { COMMANDS } from '../bot/commands.js';

function queryKey(req) {
  if (req.query && typeof req.query.key === 'string') return req.query.key;
  return new URL(req.url || '/', 'http://localhost').searchParams.get('key');
}

// Основной домен проекта; без него — домен, с которого открыли ссылку
function host(req) {
  return process.env.VERCEL_PROJECT_PRODUCTION_URL || req.headers['x-forwarded-host'] || req.headers.host;
}

export default async function handler(req, res) {
  if (refuseIfMissing(res, 'setup', ['TG_BOT_TOKEN', 'CRON_SECRET'], { redis: false })) return;

  const secret = process.env.CRON_SECRET;
  if (!safeEqual(queryKey(req), secret) && !safeEqual(req.headers.authorization, 'Bearer ' + secret)) {
    return res.status(401).json({ ok: false, error: 'unauthorized', hint: 'Откройте /api/setup?key=<CRON_SECRET>' });
  }

  try {
    const me = await tg('getMe', {});
    await tg('setWebhook', {
      url: `https://${host(req)}/api/telegram`,
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
