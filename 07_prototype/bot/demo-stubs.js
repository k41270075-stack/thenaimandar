// Заглушки для сборки bot.html: в браузере бот работает без Upstash (память вкладки)
// и без Claude API (готовые ответы из faq.js), поэтому эти библиотеки в страницу не попадают.
export class Redis {
  constructor() { throw new Error('Upstash недоступен на странице bot.html'); }
}

export default class Anthropic {
  constructor() { throw new Error('Claude API недоступен на странице bot.html'); }
}
Anthropic.RateLimitError = class extends Error {};
Anthropic.APIConnectionError = class extends Error {};
Anthropic.APIError = class extends Error {};
