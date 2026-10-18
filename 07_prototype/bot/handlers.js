// Логика бота Ventorme AI: команды, кнопки, задание дня, ИИ-ответы, напоминания.
import { tg, send } from './tg.js';
import * as store from './store.js';
import { T, BTN, MENU, GOALS, SITE } from './texts.js';
import { COMMANDS, AI_SHORTCUTS } from './commands.js';
import { poolFor, pickForDay } from './tasks.js';
import { askVenti } from './venti.js';
import { dayKey, liveStreak, touchStreak, isQuietHours } from './util.js';
import { adminIds } from './env.js';

const AI_PER_DAY = 20;
const MAX_QUESTION = 1000;
const FIELDS = ['it', 'med', 'biz'];

const GOAL_BUTTONS = [
  [['ЕНТ', 'goal:ent'], ['SAT', 'goal:sat'], ['IELTS', 'goal:ielts']],
  [['Пока не знаю', 'goal:unknown']]
];
const FIELD_BUTTONS = [[['IT', 'field:it'], ['Медицина', 'field:med'], ['Бизнес', 'field:biz']]];
const GRADE_BUTTONS = [[['8–9', 'grade:8-9'], ['10', 'grade:10'], ['11–12', 'grade:11-12']]];
const DELETE_BUTTONS = [[['Да, удалить всё', 'delete:yes']], [['Отмена', 'delete:no']]];

function logError(where) {
  return (err) => console.error(`[bot] ${where}:`, err.message || err);
}

// Счётчики метрик не должны ломать ответ ученику
async function track(event) {
  try { await store.track(event, dayKey()); } catch (err) { logError('track')(err); }
}

function isAdmin(fromId) {
  return adminIds().includes(String(fromId));
}

// payload из S6: `${field}_${goal}_${grade}`, например it_ent_11 или med_unknown_8-9
export function parsePayload(payload) {
  const [field, goal, grade] = String(payload || '').trim().split('_');
  return {
    field: FIELDS.includes(field) ? field : null,
    goal: Object.hasOwn(GOALS, goal || '') ? goal : null,
    grade: /^\d{1,2}(-\d{1,2})?$/.test(grade || '') ? grade : null
  };
}

async function loadUser(chatId) {
  return (await store.getUser(chatId)) || store.newUser();
}

export async function handleUpdate(update) {
  if (!update || typeof update.update_id !== 'number') return;
  if (!(await store.firstDelivery(update.update_id))) return;
  if (update.message) return onMessage(update.message);
  if (update.callback_query) return onCallback(update.callback_query);
}

async function onMessage(msg) {
  if (msg.chat?.type !== 'private') return; // бот только для личных чатов
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  if (!text) return send(chatId, T.textOnly);

  const cmd = text.match(/^\/([a-z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i);
  if (!cmd) return onQuestion(chatId, text);

  const name = cmd[1].toLowerCase();
  const arg = (cmd[2] || '').trim();
  if (Object.hasOwn(AI_SHORTCUTS, name)) return onQuestion(chatId, AI_SHORTCUTS[name]);

  switch (name) {
    case 'start': return onStart(chatId, msg.from?.first_name, arg);
    case 'help': return send(chatId, T.help, MENU);
    // Задания
    case 'task': return startQuiz(chatId);
    case 'ent': case 'sat': case 'ielts': return startQuiz(chatId, name);
    case 'proftest': return startQuiz(chatId, 'unknown');
    case 'tip': return send(chatId, T.tip(dayKey()), [[BTN.taskShort, BTN.more]]);
    // Venti
    case 'ask': return arg ? onQuestion(chatId, arg) : send(chatId, T.ask);
    case 'new': return onNewDialog(chatId);
    // Прогресс и профиль
    case 'plan': return showPlan(chatId);
    case 'me': return showMe(chatId);
    case 'goal': return send(chatId, T.chooseGoal, GOAL_BUTTONS);
    case 'field': return send(chatId, T.chooseField, FIELD_BUTTONS);
    case 'grade': return send(chatId, T.chooseGrade, GRADE_BUTTONS);
    // Напоминания
    case 'remind': return onRemind(chatId);
    case 'stop': return onStop(chatId);
    // Данные и связь
    case 'privacy': return send(chatId, T.privacy, [[BTN.deleteData]]);
    case 'delete': return send(chatId, T.deleteConfirm, DELETE_BUTTONS);
    case 'feedback': return onFeedback(chatId, arg);
    case 'site': return send(chatId, T.site, [[['Открыть ventorme.ai', SITE]]]);
    // Для команды Ventorme
    case 'demo_tomorrow': return onDemoTomorrow(chatId);
    case 'stats': return onStats(chatId, msg.from?.id);
    case 'sync_commands': return onSyncCommands(chatId, msg.from?.id);
    default: return send(chatId, T.unknown, MENU);
  }
}

// Вход по ссылке из сторис друга: /start ref_<код>
const REF = /^ref_([A-Za-z0-9]{4,16})$/;

async function onStart(chatId, name, payload) {
  const user = await loadUser(chatId);
  const today = dayKey();
  const ref = REF.exec(String(payload || '').trim());
  if (ref) return onRefStart(chatId, name, user, ref[1], today);
  const p = parsePayload(payload);
  user.subscribed = true;
  user.joined = user.joined || today;
  // День первого входа — первый день серии (ученик только что прошёл вызов на сайте)
  if (!user.lastActive) touchStreak(user, today);
  await track('start');

  if (p.goal || p.field) {
    user.field = p.field || user.field;
    user.goal = p.goal || user.goal;
    user.grade = p.grade || user.grade;
    await store.saveUser(chatId, user);
    return send(chatId, T.helloWithResult(name, user, liveStreak(user, today)), MENU);
  }
  await store.saveUser(chatId, user);
  return send(chatId, T.helloNoPayload(name), GOAL_BUTTONS);
}

async function onRefStart(chatId, name, user, code, today) {
  const isNew = !user.joined;
  user.subscribed = true;
  user.joined = user.joined || today;
  if (isNew) user.referredBy = code;              // считаем только первый вход
  if (!user.lastActive) touchStreak(user, today);
  await store.saveUser(chatId, user);
  await track('start');
  if (isNew) await track('ref');
  return send(chatId, T.helloFriend(name), GOAL_BUTTONS);
}

async function onGoal(chatId, goal) {
  if (!Object.hasOwn(GOALS, goal)) return;
  const user = await loadUser(chatId);
  user.goal = goal;
  user.joined = user.joined || dayKey();
  if (!user.lastActive) touchStreak(user);
  await store.saveUser(chatId, user);
  return send(chatId, T.goalSaved(goal, liveStreak(user)), MENU);
}

async function onField(chatId, field) {
  if (!FIELDS.includes(field)) return;
  const user = await loadUser(chatId);
  user.field = field;
  user.joined = user.joined || dayKey();
  await store.saveUser(chatId, user);
  return send(chatId, T.fieldSaved(field), [[BTN.professions, BTN.unis]]);
}

async function onGrade(chatId, grade) {
  if (!/^\d{1,2}(-\d{1,2})?$/.test(grade)) return;
  const user = await loadUser(chatId);
  user.grade = grade;
  user.joined = user.joined || dayKey();
  await store.saveUser(chatId, user);
  return send(chatId, T.gradeSaved(grade), MENU);
}

async function showPlan(chatId) {
  const user = await loadUser(chatId);
  return send(chatId, T.plan(user, liveStreak(user)), [[BTN.task], [BTN.ask]]);
}

async function showMe(chatId) {
  const user = await loadUser(chatId);
  return send(chatId, T.me(user, liveStreak(user)), [[BTN.goal, BTN.field, BTN.grade]]);
}

async function onRemind(chatId) {
  const user = await loadUser(chatId);
  user.subscribed = true;
  user.joined = user.joined || dayKey();
  await store.saveUser(chatId, user);
  return send(chatId, T.remindOn, MENU);
}

async function onStop(chatId) {
  const user = await store.getUser(chatId);
  if (user) {
    user.subscribed = false;
    await store.saveUser(chatId, user);
  }
  await track('stop');
  return send(chatId, T.stop);
}

async function onNewDialog(chatId) {
  await store.clearHistory(chatId);
  return send(chatId, T.newDialog);
}

async function onDelete(chatId) {
  await store.deleteUser(chatId, dayKey());
  await track('delete');
  return send(chatId, T.deleted);
}

// Отзыв уходит команде без имени и chat_id ученика
async function onFeedback(chatId, text) {
  if (!text) return send(chatId, T.feedbackHow);
  const clean = text.slice(0, MAX_QUESTION);
  await store.pushFeedback(clean, dayKey());
  await track('feedback');
  for (const admin of adminIds()) {
    await send(admin, T.feedbackForAdmins(clean)).catch(logError('feedback'));
  }
  return send(chatId, T.feedbackThanks);
}

// Для показа на защите: присылает «завтрашнее» напоминание самому себе, поэтому доступна всем
async function onDemoTomorrow(chatId) {
  return sendReminder(chatId, await loadUser(chatId));
}

async function onStats(chatId, fromId) {
  if (!isAdmin(fromId)) return send(chatId, T.notAdmin(fromId));
  return send(chatId, T.stats(await store.stats(dayKey())));
}

// Записывает COMMANDS в меню Telegram: после смены списка команд достаточно отправить /sync_commands
async function onSyncCommands(chatId, fromId) {
  if (!isAdmin(fromId)) return send(chatId, T.notAdmin(fromId));
  await tg('setMyCommands', { commands: COMMANDS.map(({ command, description }) => ({ command, description })) });
  return send(chatId, T.synced(COMMANDS.length));
}

// ИИ-ответ Venti на любой текст
async function onQuestion(chatId, text) {
  const user = await loadUser(chatId);
  const n = await store.countAiAnswer(chatId, dayKey());
  if (n > AI_PER_DAY) return send(chatId, T.aiLimit, [[BTN.taskShort]]);

  tg('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(logError('typing'));
  const question = text.slice(0, MAX_QUESTION);
  const history = await store.getHistory(chatId);
  const answer = await askVenti(user, liveStreak(user), history, question);
  if (answer.ok) {
    await store.pushHistory(chatId, question, answer.text);
    await track('ai');
  }
  return send(chatId, answer.text, answer.rows || [[BTN.taskShort, BTN.more]]);
}

// ---------- Задание дня ----------

// goal не задан — задание под цель ученика; /ent, /sat, /ielts, /proftest задают свою
async function startQuiz(chatId, goalOverride) {
  const user = await loadUser(chatId);
  const goal = goalOverride || user.goal || 'ent';
  const day = dayKey();
  const quiz = {
    id: Date.now().toString(36),
    goal,
    day,
    ids: pickForDay(goal, day),
    i: 0,
    score: 0,
    picks: []
  };
  await store.saveQuiz(chatId, quiz);
  return sendQuestion(chatId, quiz);
}

function questionText(quiz, k) {
  return T.question(k + 1, quiz.ids.length, poolFor(quiz.goal)[quiz.ids[k]].q);
}

function sendQuestion(chatId, quiz) {
  const q = poolFor(quiz.goal)[quiz.ids[quiz.i]];
  const rows = q.options.map((opt, j) => [[opt, `a:${quiz.id}:${quiz.i}:${j}`]]);
  return send(chatId, questionText(quiz, quiz.i), rows);
}

async function onAnswer(chatId, cq, ack) {
  const [, qid, iStr, jStr] = cq.data.split(':');
  const i = Number(iStr), j = Number(jStr);
  const quiz = await store.getQuiz(chatId);
  if (!quiz || quiz.id !== qid || quiz.i !== i) return ack(T.stale);
  const q = poolFor(quiz.goal)[quiz.ids[i]];
  if (!q || !(j >= 0 && j < q.options.length)) return ack(T.stale);

  let verdict;
  if (q.correct === null) {
    quiz.picks.push(q.fields[j]);
    quiz.score++;
    verdict = T.picked(q.options[j]);
  } else if (j === q.correct) {
    quiz.score++;
    verdict = T.right(q.why);
  } else {
    verdict = T.wrong(q.options[q.correct], q.why);
  }
  quiz.i++;
  await store.saveQuiz(chatId, quiz);
  await ack(q.correct === null ? '' : j === q.correct ? '✅ Верно' : '❌ Мимо');

  // Вопрос остаётся в чате с вердиктом, кнопки убираются
  await tg('editMessageText', {
    chat_id: chatId,
    message_id: cq.message.message_id,
    text: questionText(quiz, i) + '\n\n' + verdict
  }).catch(logError('editMessageText'));

  if (quiz.i < quiz.ids.length) return sendQuestion(chatId, quiz);
  return finishQuiz(chatId, quiz);
}

function topField(picks) {
  const count = {};
  picks.forEach((f) => { count[f] = (count[f] || 0) + 1; });
  return FIELDS.reduce((best, f) => ((count[f] || 0) > (count[best] || 0) ? f : best), picks[0] || 'it');
}

async function finishQuiz(chatId, quiz) {
  await store.clearQuiz(chatId);
  const user = await loadUser(chatId);
  const again = user.lastTaskDay === quiz.day; // повтор в тот же день: тренировка без XP
  let xp = 0;
  if (!again) {
    xp = 10 * quiz.score + 10; // 10 за каждый верный ответ и 10 за то, что дошёл до конца
    user.xp = (user.xp || 0) + xp;
    user.tasksDone = (user.tasksDone || 0) + 1;
    user.lastTaskDay = quiz.day;
    touchStreak(user, quiz.day);
  }
  const field = quiz.goal === 'unknown' ? topField(quiz.picks) : null;
  if (field && !user.field) user.field = field;
  await store.saveUser(chatId, user);
  await track('task');

  const streak = liveStreak(user);
  const text = field
    ? T.profTestDone(field, xp, streak, again)
    : T.quizDone(quiz.score, quiz.ids.length, xp, streak, again);
  return send(chatId, text, [[BTN.ask, BTN.plan]]);
}

// ---------- Кнопки ----------

async function onCallback(cq) {
  const chatId = cq.message?.chat?.id;
  const data = cq.data || '';
  const ack = (text) => tg('answerCallbackQuery', text ? { callback_query_id: cq.id, text } : { callback_query_id: cq.id })
    .catch(logError('answerCallbackQuery'));
  if (!chatId || cq.message.chat.type !== 'private') return ack();

  if (data.startsWith('a:')) return onAnswer(chatId, cq, ack);
  await ack();
  const [kind, value] = data.split(':');
  if (data === 'task') return startQuiz(chatId);
  if (data === 'ask') return send(chatId, T.ask);
  if (data === 'plan') return showPlan(chatId);
  if (kind === 'goal') return onGoal(chatId, value);
  if (kind === 'field') return onField(chatId, value);
  if (kind === 'grade') return onGrade(chatId, value);
  if (kind === 'ai' && Object.hasOwn(AI_SHORTCUTS, value)) return onQuestion(chatId, AI_SHORTCUTS[value]);
  if (data === 'menu:goal') return send(chatId, T.chooseGoal, GOAL_BUTTONS);
  if (data === 'menu:field') return send(chatId, T.chooseField, FIELD_BUTTONS);
  if (data === 'menu:grade') return send(chatId, T.chooseGrade, GRADE_BUTTONS);
  if (data === 'delete:ask') return send(chatId, T.deleteConfirm, DELETE_BUTTONS);
  if (data === 'delete:yes') return onDelete(chatId);
  if (data === 'delete:no') return send(chatId, T.deleteCancelled);
}

// ---------- Напоминания ----------

export function sendReminder(chatId, user) {
  return send(chatId, T.reminder(user, liveStreak(user)), [[BTN.start], [BTN.ask]]);
}

// Vercel Cron в 19:00 по Астане. Не больше одного сообщения в день, только подписанным,
// не в тихие часы, не тем, кто подключился сегодня или уже сделал задание.
export async function sendDailyReminders(now = new Date()) {
  const today = dayKey(now);
  const ids = await store.subscribers();
  const result = { total: ids.length, sent: 0, skipped: 0, failed: 0 };
  if (isQuietHours(now)) {
    result.skipped = ids.length;
    result.quiet = true;
    return result;
  }
  for (const id of ids) {
    const user = await store.getUser(id);
    if (!user || !user.subscribed || user.lastSent === today || user.lastTaskDay === today || user.joined === today) {
      result.skipped++;
      continue;
    }
    try {
      await sendReminder(id, user);
      user.lastSent = today;
      await store.saveUser(id, user);
      result.sent++;
    } catch (err) {
      result.failed++;
      if (err.code === 403) { // ученик заблокировал бота: больше не пишем
        user.subscribed = false;
        await store.saveUser(id, user);
      } else {
        console.error('[remind] не отправлено:', err.message);
      }
    }
  }
  return result;
}
