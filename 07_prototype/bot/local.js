// Запуск на своём компьютере: npm start
//   — лендинг, регистрация и прототип на http://localhost:5173
//   — бот @VentormeAI_bot сам забирает сообщения из Telegram (long polling): Vercel и вебхук не нужны
//   — без ключей Upstash данные бота живут в памяти и сбрасываются при остановке
// Токены берутся из файла .env рядом с package.json (образец: .env.example). Файл .env в git не попадает.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT) || 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf'
};

// .env → process.env (то, что уже задано в окружении, не перезаписываем)
function loadEnv() {
  const file = join(ROOT, '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

// Статика из папки 07_prototype. Скрытые файлы (.env) и node_modules не отдаём.
async function serve(req, res) {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    res.writeHead(400).end('Bad request');
    return;
  }
  const file = normalize(join(ROOT, path.endsWith('/') ? path + 'index.html' : path));
  const inside = file.slice(ROOT.length);
  if (!file.startsWith(ROOT + sep) || /(^|[\\/])\./.test(inside) || /node_modules/.test(inside)) {
    res.writeHead(404).end('Not found');
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) {
      res.writeHead(301, { location: path + '/' }).end();
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch (e) {
    res.writeHead(404).end('Not found');
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runBot() {
  // Модули бота читают переменные при загрузке, поэтому подключаем их после loadEnv()
  const { tg } = await import('./tg.js');
  const { handleUpdate, sendDailyReminders } = await import('./handlers.js');
  const { dayKey, astanaHour } = await import('./util.js');

  let me;
  try {
    me = await tg('getMe', {});
  } catch (err) {
    console.error(err.code === 401 || err.code === 404
      ? '  Бот: Telegram не принял TG_BOT_TOKEN. Проверь токен в файле .env.'
      : '  Бот: нет связи с Telegram — ' + err.message);
    return;
  }
  // Вебхук и polling не работают одновременно: снимаем вебхук (на Vercel потом снова открыть /api/setup)
  await tg('deleteWebhook', {});
  console.log(`  Бот:           @${me.username} слушает сообщения. Напиши ему в Telegram.\n`);

  // Напоминания: раз в минуту проверяем, не наступило ли 19:00 по Астане
  let remindedDay = null;
  setInterval(async () => {
    const now = new Date();
    if (astanaHour(now) !== 19 || remindedDay === dayKey(now)) return;
    remindedDay = dayKey(now);
    try {
      console.log('[local] напоминания:', JSON.stringify(await sendDailyReminders(now)));
    } catch (err) {
      console.error('[local] напоминания не отправлены:', err.message);
    }
  }, 60000);

  let offset = 0;
  for (;;) {
    try {
      const updates = await tg('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] });
      for (const update of updates) {
        offset = update.update_id + 1;
        try {
          await handleUpdate(update);
        } catch (err) {
          console.error('[local] сообщение не обработано:', err);
        }
      }
    } catch (err) {
      console.error(err.code === 409
        ? '[local] Бота уже слушает другая копия (второй npm start или вебхук). Закрой её.'
        : '[local] Telegram недоступен: ' + err.message);
      await sleep(3000);
    }
  }
}

process.env.VT_LOCAL = '1';
loadEnv();

const server = createServer(serve);
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Порт ${PORT} занят. Запусти на другом: PORT=5174 npm start (Windows: set PORT=5174 && npm start)`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log('\nVentorme · Первые 5 минут\n');
  console.log(`  Демо целиком:  http://localhost:${PORT}/landing/   (лендинг → регистрация → прототип)`);
  console.log(`  Прототип:      http://localhost:${PORT}/`);
  if (!process.env.TG_BOT_TOKEN) {
    console.log('  Бот:           выключен — впиши TG_BOT_TOKEN в файл .env (образец: .env.example)\n');
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) console.log('  Venti:         без ИИ — нет ANTHROPIC_API_KEY, на вопросы будет заготовка');
  if (!process.env.UPSTASH_REDIS_REST_URL && !process.env.KV_REST_API_URL) console.log('  Данные бота:   в памяти, сбросятся при остановке');
  runBot();
});
