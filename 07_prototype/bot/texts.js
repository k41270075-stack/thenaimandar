// Все тексты бота Ventorme AI в одном месте. Голос как на лендинге: коротко, на «ты», без канцелярита.
import { days, dayNumber } from './util.js';
import { COMMANDS } from './commands.js';

// Детская линия доверия Казахстана. ПРОВЕРИТЬ номер перед защитой.
export const HELPLINE = '150';

export const SITE = 'https://ventorme.ai';

export const GOALS = { ent: 'ЕНТ', sat: 'SAT', ielts: 'IELTS', unknown: 'профтест' };
export const FIELDS = { it: 'IT', med: 'медицина', biz: 'бизнес' };

// Результат из сундука на сайте (S2). Держать в согласии с data/profiles.js.
export const RESULTS = {
  it: { title: 'AI-аналитик', match: 96 },
  med: { title: 'Врач-исследователь', match: 93 },
  biz: { title: 'Продакт-менеджер', match: 94 }
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
  taskShort: ['Задание', 'task'],
  deleteData: ['Удалить мои данные', 'delete:ask'],
  professions: ['Какие профессии', 'ai:professions'],
  unis: ['Какие вузы', 'ai:unis'],
  goal: ['Цель', 'menu:goal'],
  field: ['Направление', 'menu:field'],
  grade: ['Класс', 'menu:grade']
};

export const MENU = [[BTN.task], [BTN.ask, BTN.plan]];

// Совет дня (/tip): без цифр и дедлайнов, которые нельзя проверить
const TIPS = [
  'Решай по 3 задачи каждый день вместо 20 в воскресенье: так запоминается лучше.',
  'Ошибки выписывай в отдельную заметку и возвращайся к ним через 3 дня. Это самый быстрый способ поднять балл.',
  'Раз в неделю пиши пробный тест на время: он показывает реальный уровень лучше, чем десять задач без таймера.',
  'Дедлайны вузов и стипендий проверяй только на официальных сайтах и ставь напоминание за 2 недели.',
  'В эссе начни с истории из своей жизни, а не с «С детства я мечтал…».',
  'Английские слова учи целыми фразами, а не по одному: так они сами всплывают на экзамене.',
  'Если тема не идёт, объясни её вслух другу или Venti: сразу видно, где пробел.',
  'Портфолио собирай заранее: олимпиады, проекты, волонтёрство. Записывай сразу, пока помнишь детали.',
  'Сравнивай вузы по трём вещам: программа, стоимость с учётом гранта и где работают выпускники.',
  'Перед пробником лучше выспаться, чем повторять до ночи: свежая голова решает быстрее.'
];

function hi(name) { return name ? `Привет, ${name}!` : 'Привет!'; }

function helpText() {
  const groups = [];
  COMMANDS.forEach((c) => {
    let g = groups.find((x) => x.name === c.group);
    if (!g) groups.push(g = { name: c.group, lines: [] });
    g.lines.push(`/${c.command} — ${c.description}`);
  });
  return 'Что я умею:\n\n' +
    groups.map((g) => `${g.name}\n${g.lines.join('\n')}`).join('\n\n') +
    '\n\nИли просто напиши вопрос про поступление, отвечу.';
}

function orDash(v) { return v || 'не указано'; }

export const T = {
  helloWithResult(name, user, streak) {
    const r = RESULTS[user.field];
    const result = r ? `Твой результат: ${r.title}, ${r.match}% совпадения.` : `Твоя цель: ${GOALS[user.goal] || 'поступление'}.`;
    return `${hi(name)} Я Venti из Ventorme. ${result} Серия: ${days(streak)} 🔥\n\n` +
      'Завтра в 19:00 пришлю задание на 60 секунд. А вопросы про поступление можно задавать прямо сейчас.\n\nВсе команды: /help';
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

  help: helpText(),
  unknown: 'Такой команды я не знаю. Все команды: /help',

  me(user, streak) {
    const r = RESULTS[user.field];
    return 'Твой профиль\n' +
      `Класс: ${orDash(user.grade && String(user.grade).replace('-', '–'))}\n` +
      `Цель: ${orDash(GOALS[user.goal])}\n` +
      `Направление: ${orDash(FIELDS[user.field])}\n` +
      (r ? `Результат теста: ${r.title}, ${r.match}%\n` : '') +
      `\nСерия: ${days(streak)} 🔥 · ${user.xp || 0} XP · заданий: ${user.tasksDone || 0}\n` +
      `Напоминания: ${user.subscribed ? 'включены, каждый день в 19:00' : 'выключены, включить: /remind'}`;
  },

  chooseGoal: 'К чему готовишься?',
  chooseField: 'Какое направление тебе ближе?',
  chooseGrade: 'В каком ты классе?',
  fieldSaved(field) { return `Записал направление: ${FIELDS[field]}. Спроси меня, какие профессии и вузы есть под него.`; },
  gradeSaved(grade) { return `Записал: ${String(grade).replace('-', '–')} класс. Буду советовать с учётом этого.`; },

  tip(day) { return `Совет дня 💡\n\n${TIPS[dayNumber(day) % TIPS.length]}`; },

  remindOn: 'Напоминания включены: каждый день в 19:00, одно сообщение. Отключить: /stop',
  stop: 'Готово, больше не пишу. Включить снова: /remind',
  newDialog: 'Начали с чистого листа: прошлый диалог я забыл. О чём спросишь?',

  privacy:
    'Что я храню:\n' +
    '— номер чата в Telegram, чтобы присылать задания\n' +
    '— класс, цель и направление\n' +
    '— серию, XP и выполненные задания\n' +
    '— последние 6 сообщений диалога с Venti, они удаляются через 7 дней\n\n' +
    'Не храню: имя, телефон, фото, контакты.\n\n' +
    'Вопросы Venti обрабатывает Claude API (Anthropic). Отзывы из /feedback хранятся без привязки к тебе.\n\n' +
    'Удалить всё о себе: /delete',
  deleteConfirm: 'Удалить все твои данные: профиль, серию, XP и историю диалога? Отменить это нельзя.',
  deleted: 'Готово, всё удалено. Напоминаний больше не будет. Вернуться: /start',
  deleteCancelled: 'Ок, ничего не удаляю.',

  feedbackHow: 'Напиши после команды, что улучшить или что понравилось. Например:\n/feedback хочу больше вопросов по физике',
  feedbackThanks: 'Спасибо! Передал команде Ventorme.',
  feedbackForAdmins(text) { return `Отзыв о боте:\n${text}`; },

  site: 'Тест, план поступления, вузы и гранты — на сайте Ventorme.',

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

  notAdmin(id) { return `Эта команда только для команды Ventorme. Твой Telegram id: ${id}. Добавь его в TG_ADMIN_IDS, если ты из команды.`; },

  stats(s) {
    const row = (x) => `/start ${x.start} · заданий ${x.task} · вопросов Venti ${x.ai} · отписок ${x.stop} · удалений ${x.delete} · отзывов ${x.feedback}`;
    return 'Статистика бота\n\n' +
      `Сегодня: ${row(s.today)}\n\n` +
      `За всё время: ${row(s.all)}\n\n` +
      `Учеников: ${s.users}, с напоминаниями: ${s.subs}`;
  },
  synced(n) { return `Меню команд обновлено: ${n} команд.`; }
};
