// Секреты вебхука и cron. Только для функций Vercel (api/*): здесь node:crypto,
// поэтому остальной код бота от этого файла не зависит и запускается и в браузере (bot.html).
import { createHash, timingSafeEqual } from 'node:crypto';

// Секрет вебхука: TG_WEBHOOK_SECRET, а если его не задали — выводится из токена бота.
// Это не слабее: кто знает токен, и так управляет ботом. Зато на одну переменную меньше.
export function webhookSecret() {
  return process.env.TG_WEBHOOK_SECRET ||
    createHash('sha256').update('ventorme-webhook:' + process.env.TG_BOT_TOKEN).digest('hex');
}

// Сравнение секретов за постоянное время
export function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && timingSafeEqual(x, y);
}
