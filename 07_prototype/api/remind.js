// Напоминания «задание дня»: GET /api/remind
// Вызывает Vercel Cron (vercel.json, 14:00 UTC = 19:00 Астана) с заголовком Authorization: Bearer <CRON_SECRET>.
import { refuseIfMissing, safeEqual } from '../bot/env.js';
import { sendDailyReminders } from '../bot/handlers.js';

export default async function handler(req, res) {
  if (refuseIfMissing(res, 'remind', ['TG_BOT_TOKEN', 'CRON_SECRET'], { redis: false })) return;

  if (!safeEqual(req.headers.authorization, 'Bearer ' + process.env.CRON_SECRET)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    const result = await sendDailyReminders();
    console.log('[remind]', JSON.stringify(result));
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('[remind] сбой рассылки:', err);
    return res.status(500).json({ ok: false, error: 'remind_failed' });
  }
}
