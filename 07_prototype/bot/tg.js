// Тонкая обёртка над Telegram Bot API. Токен не попадает ни в ошибки, ни в логи.
const API = 'https://api.telegram.org/bot';

export async function tg(method, params) {
  const res = await fetch(API + process.env.TG_BOT_TOKEN + '/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params)
  });
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
  if (rows) params.reply_markup = keyboard(rows);
  return tg('sendMessage', params);
}
