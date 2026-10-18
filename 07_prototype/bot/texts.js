// Все тексты бота Ventorme AI в одном месте. Голос как на лендинге: коротко, на «ты», без канцелярита.
import { days } from './util.js';

// Детская линия доверия Казахстана. ПРОВЕРИТЬ номер перед защитой.
export const HELPLINE = '150';

export const SITE = 'https://ventorme.ai';

export const GOALS = { ent: 'ЕНТ', sat: 'SAT', ielts: 'IELTS', unknown: 'профтест' };
export const FIELDS = { it: 'IT', med: 'медицина', biz: 'бизнес' };

// Результат из сундука на сайте (S2). Держать в согласии с data/profiles.js.
export const RESULTS = {
  it: { title: 'AI-аналитик', match: 96 },
  med: { title: 'Врач-исследователь', match: 93 },
  biz: { title: 'Продакт-менеджер', match: 91 }
};

// Следующий шаг плана поступления по цели
const NEXT_STEP = {
  ent: 'пробный ЕНТ по математической грамотности',
  sat: 'пробный SAT Math, модуль 1',
  ielts: 'IELTS Reading: один текст на время',
  unknown: 'профтест целиком на Ventorme'
};

// Кнопки (подписи и callback_data)
export const BTN = {
  task: ['Задание сейчас', 'task'],
  start: ['Начать', 'task'],
  ask: ['Спросить Venti', 'ask'],
  more: ['Ещё вопрос', 'ask'],
  plan: ['Мой план', 'plan'],
  taskShort: ['Задание', 'task']
};

export const MENU = [[BTN.task], [BTN.ask, BTN.plan]];

function hi(name) { return name ? `Привет, ${name}!` : 'Привет!'; }

export const T = {
  helloWithResult(name, user, streak) {
    const r = RESULTS[user.field];
    const result = r ? `Твой результат: ${r.title}, ${r.match}% совпадения.` : `Твоя цель: ${GOALS[user.goal] || 'поступление'}.`;
    return `${hi(name)} Я Venti из Ventorme. ${result} Серия: ${days(streak)} 🔥\n\n` +
      'Завтра в 19:00 пришлю задание на 60 секунд. А вопросы про поступление можно задавать прямо сейчас.';
  },

  helloNoPayload(name) {
    return `${hi(name)} Я Venti из Ventorme. Каждый день присылаю задание на 60 секунд и отвечаю на вопросы про поступление.\n\nК чему готовишься?`;
  },

  goalSaved(goal, streak) {
    const head = goal === 'unknown' ? 'Не страшно, начнём с профтеста: он подскажет направление.' : `Записал: ${GOALS[goal]}.`;
    return `${head} Серия: ${days(streak)} 🔥\n\nКаждый день в 19:00 пришлю задание на 60 секунд.`;
  },

  ask: 'Спрашивай про поступление: вузы, гранты, ЕНТ, SAT, IELTS, эссе, план подготовки.\n\nНапример: «Как поднять шанс на грант?»',

  plan(user, streak) {
    const progress = Math.min(100, 25 + 5 * (user.tasksDone || 0));
    return `Твой план поступления: ${progress}%\n` +
      `Следующий шаг: ${NEXT_STEP[user.goal] || NEXT_STEP.unknown}\n` +
      `Серия: ${days(streak)} 🔥 · ${user.xp || 0} XP\n\n` +
      `Весь план на ${SITE}`;
  },

  help:
    'Что я умею:\n' +
    '/task — задание дня, 3 вопроса за 60 секунд\n' +
    '/stop — больше не присылать напоминания\n' +
    '/start — начать заново\n' +
    '/help — эта подсказка\n\n' +
    'Или просто напиши вопрос про поступление, отвечу.',

  stop: 'Готово, больше не пишу. Вернуться: /start',

  // Задание дня
  question(n, total, q) { return `Вопрос ${n} из ${total}\n\n${q}`; },
  right(why) { return `✅ Верно! ${why}`; },
  wrong(answer, why) { return `❌ Мимо. Правильно: ${answer}. ${why}`; },
  picked(answer) { return `Записал: ${answer}`; },
  stale: 'Этот вопрос уже позади',

  quizDone(score, total, xp, streak, again) {
    const head = `${score} из ${total}` + (xp ? `, +${xp} XP` : '');
    const tail = again ? 'Это тренировка: XP за сегодня уже начислены.' : 'Следующее задание завтра в 19:00.';
    return `${head}. Серия: ${days(streak)} 🔥\n\n${tail}`;
  },

  profTestDone(field, xp, streak, again) {
    return `Похоже, тебе ближе ${FIELDS[field] || 'IT'}.` + (xp ? ` +${xp} XP.` : '') + ` Серия: ${days(streak)} 🔥\n\n` +
      (again ? 'Это тренировка: XP за сегодня уже начислены.\n\n' : '') +
      'Спроси меня, какие профессии и вузы есть под это направление.';
  },

  // Напоминание в 19:00 (и /demo_tomorrow)
  reminder(user, streak) {
    const what = user.goal === 'unknown' ? '3 вопроса профтеста' : `3 вопроса ${GOALS[user.goal] || 'ЕНТ'}`;
    const head = streak > 0 ? `Серия ${days(streak)} 🔥 Не дай ей сгореть.` : 'Начнём новую серию 🔥';
    return `${head}\nСегодня: ${what} за 60 секунд, до +40 XP.`;
  },

  // ИИ-помощник
  aiLimit: 'На сегодня вопросов хватит 🙂 Давай продолжим завтра. А задание дня можно пройти прямо сейчас.',
  aiRefusal: 'С этим я не помогу. Давай про учёбу и поступление: вузы, гранты, экзамены, эссе.',
  aiDown: 'Venti сейчас не на связи. Попробуй через пару минут, а пока пройди задание дня.',
  textOnly: 'Я пока понимаю только текст. Напиши вопрос словами.',

  notAdmin(id) { return `Эта команда только для команды Ventorme. Твой Telegram id: ${id}. Добавь его в TG_ADMIN_IDS, если ты из команды.`; }
};
