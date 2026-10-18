// Бот для демо прямо в браузере: страница bot.html сама забирает сообщения из Telegram, пока вкладка открыта.
// Тот же код, что на Vercel и в npm start: handlers.js, задания, готовые ответы Venti (faq.js).
// Данные живут в памяти вкладки. Токен хранится только в этом браузере и уходит только на api.telegram.org.
import { tg, route } from './tg.js';
import { handleUpdate } from './handlers.js';
import { COMMANDS } from './commands.js';

const TOKEN_KEY = 'vt-demo-token';
const PROD = 'https://thenaimandar-07prototype.vercel.app';
const STALE_SEC = 10 * 60;   // сообщения старше 10 минут при запуске не догоняем

// Прокси на том же сайте, если страница открыта с Vercel; иначе — на основном адресе проекта
process.env.TG_PROXY = (/^https?:$/.test(location.protocol) && /\.vercel\.app$/.test(location.hostname) ? location.origin : PROD) + '/api/tg';
const $ = (id) => document.getElementById(id);

let running = false;
let loop = Promise.resolve();
let wakeLock = null;

function time() {
  return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function log(text, kind) {
  const li = document.createElement('li');
  if (kind) li.className = kind;
  li.textContent = time() + '  ' + text;
  $('log').prepend(li);
  while ($('log').children.length > 60) $('log').lastChild.remove();
}

function status(text, kind) {
  $('status').textContent = text;
  $('status').className = 'status' + (kind ? ' is-' + kind : '');
}

function describe(update) {
  if (update.message) return '📩 ' + (update.message.text || '[не текст]').slice(0, 80);
  if (update.callback_query) return '👆 нажата кнопка';
  return '• событие';
}

async function keepAwake() {
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { wakeLock = null; }
}

async function poll() {
  let offset = 0;
  while (running) {
    try {
      const updates = await tg('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] });
      for (const update of updates) {
        offset = update.update_id + 1;
        const sent = update.message && update.message.date;
        if (sent && Date.now() / 1000 - sent > STALE_SEC) {
          log('Пропущено старое сообщение (отправлено до запуска)');
          continue;
        }
        log(describe(update));
        try {
          await handleUpdate(update);
        } catch (err) {
          log('Не удалось ответить: ' + err.message, 'bad');
        }
      }
    } catch (err) {
      if (!running) break;
      log(err.code === 409
        ? 'Бота уже слушает другая вкладка, npm start или Vercel. Закрой лишнее.'
        : 'Нет связи с Telegram, пробую снова…', 'bad');
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function start() {
  const token = $('token').value.trim();
  if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(token)) {
    status('Это не похоже на токен из @BotFather. Он выглядит так: 123456789:AAH…', 'bad');
    return;
  }
  await loop; // дождаться, пока прошлый запуск отпустит Telegram
  process.env.TG_BOT_TOKEN = token;
  try {
    if ($('remember').checked) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) {}

  $('start').disabled = true;
  status('Подключаюсь к Telegram…');
  let me;
  try {
    me = await tg('getMe', {});
  } catch (err) {
    $('start').disabled = false;
    status(err.code === 401 || err.code === 404
      ? 'Telegram не принял токен. После /revoke старый токен не работает: возьми последний в @BotFather.'
      : err.code === 403
        ? 'Это токен другого бота. Нужен токен @VentormeAI_bot из @BotFather.'
        : 'Нет связи с Telegram ни напрямую, ни через сервер. Проверь интернет и попробуй ещё раз.', 'bad');
    return;
  }
  // Вебхук и эта страница не работают одновременно. Недавние сообщения (до 10 минут) бот догонит
  await tg('deleteWebhook', { drop_pending_updates: false }).catch(() => {});
  await tg('setMyCommands', { commands: COMMANDS.map(({ command, description }) => ({ command, description })) }).catch(() => {});

  running = true;
  document.body.classList.add('is-running');
  $('open').href = 'https://t.me/' + me.username;
  $('open').textContent = 'Открыть @' + me.username;
  status(`Бот @${me.username} работает. Не закрывай вкладку и не давай ноутбуку уснуть.`, 'good');
  log('Бот запущен, жду сообщений' + (route() === 'proxy' ? ' (через сервер Vercel)' : ''), 'good');
  keepAwake();
  loop = poll();
}

function stop() {
  running = false;
  document.body.classList.remove('is-running');
  $('start').disabled = false;
  if (wakeLock) wakeLock.release().catch(() => {});
  wakeLock = null;
  status('Бот остановлен. Он молчит, пока страница не запущена снова.');
  log('Бот остановлен');
}

try { $('token').value = localStorage.getItem(TOKEN_KEY) || ''; } catch (e) {}
$('remember').checked = Boolean($('token').value);
$('start').addEventListener('click', start);
$('stop').addEventListener('click', stop);
$('token').addEventListener('keydown', (e) => { if (e.key === 'Enter') start(); });
document.addEventListener('visibilitychange', () => {
  if (running && document.visibilityState === 'visible') keepAwake();
});
