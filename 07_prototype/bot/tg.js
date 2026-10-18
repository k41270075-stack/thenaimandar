// Тонкая обёртка над Telegram Bot API. Токен не попадает ни в ошибки, ни в логи.
const API = 'https://api.telegram.org/bot';

// В браузере (bot.html) шлём параметры формой: такой запрос не требует предварительной CORS-проверки.
// Вложенные объекты (кнопки, списки) Telegram принимает в форме строкой JSON.
const IN_BROWSER = typeof window !== 'undefined';

function asForm(params) {
  const form = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  });
  return form;
}

// Если браузер не пускает страницу к api.telegram.org (CORS), запросы идут через api/tg.js на Vercel.
// Путь выбирает первый запрос (getMe — его безопасно повторить), дальше он не меняется:
// так сообщение никогда не уйдёт дважды.
let browserRoute = null;  // null → ещё не выбран, 'direct' или 'proxy'

function direct(method, params) {
  return fetch(API + process.env.TG_BOT_TOKEN + '/' + method, IN_BROWSER
    ? { method: 'POST', body: asForm(params) }
    : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(params) });
}

function viaProxy(method, params) {
  return fetch(process.env.TG_PROXY, {
    method: 'POST',
    body: asForm({ token: process.env.TG_BOT_TOKEN, method, params: JSON.stringify(params) })
  });
}

async function request(method, params) {
  if (!IN_BROWSER || !process.env.TG_PROXY || browserRoute === 'direct') return direct(method, params);
  if (browserRoute === 'proxy') return viaProxy(method, params);
  try {
    const res = await direct(method, params);
    browserRoute = 'direct';
    return res;
  } catch (err) {
    browserRoute = 'proxy';
    return viaProxy(method, params);
  }
}

export function route() { return browserRoute; }

export async function tg(method, params) {
  const res = await request(method, params);
  let data;
  try { data = await res.json(); } catch (e) { data = { ok: false, description: 'HTTP ' + res.status }; }
  if (!data.ok) {
    const err = new Error(`Telegram ${method}: ${data.description || 'error'}`);
    err.code = data.error_code || res.status;
    throw err;
  }
  return data.result;
}

// Кнопки: [[['Текст', 'callback_data'], ...], ...] → inline_keyboard
export function keyboard(rows) {
  return {
    inline_keyboard: rows.map((row) => row.map(([text, data]) =>
      data.startsWith('https://') ? { text, url: data } : { text, callback_data: data }))
  };
}

export function send(chatId, text, rows) {
  const params = { chat_id: chatId, text, link_preview_options: { is_disabled: true } };
  if (rows && rows.length) params.reply_markup = keyboard(rows);
  return tg('sendMessage', params);
}
