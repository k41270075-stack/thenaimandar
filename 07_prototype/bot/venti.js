// ИИ-помощник Venti на Claude API (официальный SDK @anthropic-ai/sdk).
// Короткие ответы в чате: effort low, max_tokens ~1000, история из последних 6 реплик.
import Anthropic from '@anthropic-ai/sdk';
import { HELPLINE, SITE, GOALS, FIELDS, RESULTS, T, TOPIC_BUTTONS } from './texts.js';
import { faqAnswer, isCrisis } from './faq.js';

// Модель можно сменить переменной VENTI_MODEL (например, claude-haiku-5-5, если важна цена)
const MODEL = process.env.VENTI_MODEL || 'claude-opus-5-5';
const MAX_CHARS = 3500; // Telegram режет сообщения длиннее 4096 символов

const SYSTEM = `Ты Venti, ИИ-помощник Ventorme (${SITE}) в Telegram. Ты помогаешь школьникам 13–18 лет из Казахстана, которые готовятся к поступлению: выбор профессии и вуза, ЕНТ, SAT, IELTS, гранты и стипендии, эссе, план подготовки.

Как отвечать:
- Коротко: до 600 символов, 2–4 абзаца. Это чат в телефоне.
- На «ты», дружелюбно и по делу, без канцелярита.
- На языке ученика: пишет по-русски — отвечай по-русски, пишет по-казахски — по-казахски.
- Обычным текстом без Markdown: без звёздочек, решёток и таблиц. Список — короткими строками с «—».
- Заканчивай одним конкретным следующим шагом.

Правила:
- Не выдумывай цифры, проходные баллы, суммы грантов и дедлайны. Если не уверен, скажи об этом и подскажи, где проверить: на ${SITE} или на официальном сайте вуза или экзамена.
- Не спрашивай и не собирай личные данные: ФИО, телефон, адрес, школу, документы. Если ученик прислал их сам, не повторяй их.
- Домашку и задания целиком не решай: объясни ход решения и дай попробовать самому.
- Вопросы не про учёбу и поступление мягко возвращай к теме одной фразой.
- Если ученик пишет о беде, опасности, насилии, мыслях навредить себе или о плохом самочувствии, ответь бережно и без нотаций: посоветуй прямо сейчас поговорить со взрослым, которому доверяет, и дай номер детской линии доверия Казахстана ${HELPLINE}. Если есть угроза жизни — 112.`;

function profileText(user, streak) {
  const parts = [];
  if (user.grade) parts.push(`класс — ${String(user.grade).replace('-', '–')}`);
  if (user.goal) parts.push(`цель — ${GOALS[user.goal]}`);
  if (user.field) parts.push(`направление — ${FIELDS[user.field]}`);
  const r = RESULTS[user.field];
  if (r) parts.push(`результат теста на сайте — ${r.title}, ${r.match}% совпадения (демо-цифра)`);
  parts.push(`серия — ${streak} дн.`);
  return 'Профиль ученика из анкеты Ventorme: ' + parts.join('; ') + '.';
}

let client = null;
function anthropic() {
  // Ретраи SDK по умолчанию (2), но с коротким таймаутом, чтобы уложиться во время функции Vercel
  if (!client) client = new Anthropic({ timeout: 15000 });
  return client;
}

// Без ИИ: готовый ответ по теме, а если тема не распознана — меню тем (rows — кнопки)
function offline(question, user, fallbackText) {
  const text = faqAnswer(question, user);
  // Под ответом о беде — без кнопок «Задание» и «Ещё вопрос»
  if (text) return { ok: true, text, faq: true, rows: isCrisis(question) ? [] : undefined };
  return fallbackText ? { ok: false, text: fallbackText } : { ok: false, text: T.faqMenu, rows: TOPIC_BUTTONS };
}

let warnedNoKey = false;

// → { ok, text, rows? }. Никогда не бросает: при любой беде возвращает готовый ответ.
export async function askVenti(user, streak, history, question) {
  if (!process.env.ANTHROPIC_API_KEY) {
    if (!warnedNoKey) console.log('[venti] нет ANTHROPIC_API_KEY: Venti отвечает готовыми ответами из bot/faq.js');
    warnedNoKey = true;
    return offline(question, user);
  }
  try {
    const response = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 1000,
      output_config: { effort: 'low' },
      // Если модель откажет по политике, сервер сам повторит запрос на рекомендованной модели
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        { type: 'text', text: SYSTEM },
        { type: 'text', text: profileText(user, streak) }
      ],
      messages: [...history, { role: 'user', content: question }]
    });

    if (response.stop_reason === 'refusal') {
      console.warn('[venti] отказ модели, категория:', response.stop_details?.category ?? 'нет');
      return isCrisis(question) ? { ok: false, text: faqAnswer(question, user), rows: [] } : { ok: false, text: T.aiRefusal };
    }

    let text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (!text) {
      console.warn('[venti] пустой ответ, stop_reason:', response.stop_reason);
      return offline(question, user, T.aiDown);
    }
    if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS).trimEnd() + '…';
    else if (response.stop_reason === 'max_tokens') text += '…';
    return { ok: true, text };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      console.error('[venti] лимит запросов Claude API (429)');
    } else if (err instanceof Anthropic.APIConnectionError) {
      console.error('[venti] нет связи с Claude API:', err.message);
    } else if (err instanceof Anthropic.APIError) {
      console.error(`[venti] ошибка Claude API ${err.status}:`, err.message);
    } else {
      console.error('[venti] неожиданная ошибка:', err);
    }
    return offline(question, user, T.aiDown);
  }
}
