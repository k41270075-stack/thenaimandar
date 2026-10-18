import { createHash, timingSafeEqual } from 'node:crypto';

// Переменные окружения бота. Значения живут только в Vercel → Settings → Environment Variables.
// В коде и логах — только имена переменных, никогда их значения.

// Upstash подключают двумя способами: напрямую (UPSTASH_REDIS_REST_*)
// или через Vercel Marketplace, который заводит KV_REST_API_*. Берём то, что есть.
export function redisConfig() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || ''
  };
}

// Возвращает список недостающих переменных. Redis проверяется по паре url+token.
export function missingEnv(names, { redis = true } = {}) {
  const missing = names.filter((n) => !process.env[n]);
  const r = redisConfig();
  if (redis && !r.url) missing.push('UPSTASH_REDIS_REST_URL');
  if (redis && !r.token) missing.push('UPSTASH_REDIS_REST_TOKEN');
  return missing;
}

// Отвечает 503 и пишет понятную ошибку в лог, если чего-то не хватает. Иначе false.
export function refuseIfMissing(res, where, names, opts) {
  const missing = missingEnv(names, opts);
  if (!missing.length) return false;
  console.error(`[${where}] не настроено: нет переменных окружения ${missing.join(', ')}. См. DEPLOY.md`);
  res.status(503).json({ ok: false, error: 'not_configured', missing });
  return true;
}

// Секрет вебхука: TG_WEBHOOK_SECRET, а если его не задали — выводится из токена бота.
// Это не слабее: кто знает токен, и так управляет ботом. Зато на одну переменную меньше.
export function webhookSecret() {
  return process.env.TG_WEBHOOK_SECRET ||
    createHash('sha256').update('ventorme-webhook:' + process.env.TG_BOT_TOKEN).digest('hex');
}

export function adminIds() {
  return String(process.env.TG_ADMIN_IDS || '')
    .split(/[\s,]+/)
    .filter(Boolean);
}

// Сравнение секретов за постоянное время
export function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && timingSafeEqual(x, y);
}
