// Хранилище бота в Upstash Redis.
//   user:<chat_id>        → {field, goal, grade, streak, xp, lastActive, lastTaskDay, tasksDone, subscribed, lastSent, joined}
//   subs                  → множество chat_id, кому слать напоминание в 19:00
//   hist:<chat_id>        → последние 6 реплик диалога с Venti (живут 7 дней)
//   quiz:<chat_id>        → текущее задание дня (живёт сутки)
//   ai:<chat_id>:<день>   → сколько ИИ-ответов уже было сегодня
//   upd:<update_id>       → защита от повторной доставки одного апдейта
// Личных данных не храним: ни имени, ни телефона, только chat_id и прогресс.
import { Redis } from '@upstash/redis';
import { redisConfig } from './env.js';

const HISTORY_TURNS = 6;
const HISTORY_TTL = 7 * 86400;

let client = null;
function redis() {
  if (!client) client = new Redis(redisConfig());
  return client;
}

export function newUser() {
  return {
    field: null, goal: null, grade: null,
    streak: 0, xp: 0, lastActive: null,
    lastTaskDay: null, tasksDone: 0,
    subscribed: true, lastSent: null, joined: null
  };
}

export async function getUser(chatId) {
  return (await redis().get('user:' + chatId)) || null;
}

export async function saveUser(chatId, user) {
  await redis().set('user:' + chatId, user);
  if (user.subscribed) await redis().sadd('subs', String(chatId));
  else await redis().srem('subs', String(chatId));
}

export function subscribers() {
  return redis().smembers('subs');
}

// true, если апдейт пришёл впервые (Telegram повторяет доставку, если ответ задержался)
export async function firstDelivery(updateId) {
  return (await redis().set('upd:' + updateId, 1, { nx: true, ex: 600 })) === 'OK';
}

export async function getHistory(chatId) {
  return (await redis().lrange('hist:' + chatId, 0, -1)) || [];
}

export async function pushHistory(chatId, question, answer) {
  const key = 'hist:' + chatId;
  await redis().rpush(key, { role: 'user', content: question }, { role: 'assistant', content: answer });
  await redis().ltrim(key, -HISTORY_TURNS, -1);
  await redis().expire(key, HISTORY_TTL);
}

export function clearHistory(chatId) {
  return redis().del('hist:' + chatId);
}

// Счётчик ИИ-ответов за день; возвращает номер текущего ответа
export async function countAiAnswer(chatId, day) {
  const key = `ai:${chatId}:${day}`;
  const n = await redis().incr(key);
  if (n === 1) await redis().expire(key, 2 * 86400);
  return n;
}

export async function getQuiz(chatId) {
  return (await redis().get('quiz:' + chatId)) || null;
}

export function saveQuiz(chatId, quiz) {
  return redis().set('quiz:' + chatId, quiz, { ex: 86400 });
}

export function clearQuiz(chatId) {
  return redis().del('quiz:' + chatId);
}
