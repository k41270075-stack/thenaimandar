// Команды бота: один список для /help и для меню Telegram (setMyCommands через /sync_commands).
// Служебные команды команды Ventorme (/demo_tomorrow, /stats, /sync_commands) в меню не попадают.
export const COMMANDS = [
  { command: 'task', description: 'Задание дня за 60 секунд', group: 'Задания' },
  { command: 'ent', description: '3 вопроса ЕНТ', group: 'Задания' },
  { command: 'sat', description: '3 вопроса SAT Math', group: 'Задания' },
  { command: 'ielts', description: '3 вопроса IELTS', group: 'Задания' },
  { command: 'proftest', description: 'Профтест: какое направление тебе ближе', group: 'Задания' },
  { command: 'tip', description: 'Совет дня', group: 'Задания' },

  { command: 'ask', description: 'Задать вопрос Venti', group: 'Спросить Venti' },
  { command: 'grant', description: 'Как поднять шанс на грант', group: 'Спросить Venti' },
  { command: 'unis', description: 'Какие вузы мне подходят', group: 'Спросить Venti' },
  { command: 'professions', description: 'Профессии под моё направление', group: 'Спросить Venti' },
  { command: 'essay', description: 'Как написать мотивационное эссе', group: 'Спросить Venti' },
  { command: 'week', description: 'План подготовки на неделю', group: 'Спросить Venti' },
  { command: 'new', description: 'Начать новый диалог с Venti', group: 'Спросить Venti' },

  { command: 'plan', description: 'Мой план поступления', group: 'Прогресс и профиль' },
  { command: 'me', description: 'Мой профиль, серия и XP', group: 'Прогресс и профиль' },
  { command: 'goal', description: 'Сменить цель: ЕНТ, SAT, IELTS', group: 'Прогресс и профиль' },
  { command: 'field', description: 'Сменить направление', group: 'Прогресс и профиль' },
  { command: 'grade', description: 'Указать класс', group: 'Прогресс и профиль' },

  { command: 'remind', description: 'Включить напоминания в 19:00', group: 'Напоминания' },
  { command: 'stop', description: 'Отключить напоминания', group: 'Напоминания' },

  { command: 'privacy', description: 'Какие данные хранит бот', group: 'Данные и связь' },
  { command: 'delete', description: 'Удалить мои данные', group: 'Данные и связь' },
  { command: 'feedback', description: 'Написать команде Ventorme', group: 'Данные и связь' },
  { command: 'site', description: 'Открыть ventorme.ai', group: 'Данные и связь' },
  { command: 'start', description: 'Начать сначала', group: 'Данные и связь' },
  { command: 'help', description: 'Все команды', group: 'Данные и связь' }
];

// Готовые вопросы Venti: команда (и кнопка ai:<ключ>) задаёт ИИ вопрос с учётом профиля ученика
export const AI_SHORTCUTS = {
  grant: 'Как мне поднять шанс на грант? Дай 3 конкретных шага под мой профиль.',
  unis: 'Какие вузы мне стоит рассмотреть под мой профиль и цель? Назови 3–5 вариантов и что у них проверить.',
  professions: 'Какие профессии подходят под моё направление? Назови 3–4 и что для них сдавать.',
  essay: 'Как написать сильное мотивационное эссе для поступления? Дай структуру и 3 ошибки, которых стоит избегать.',
  week: 'Составь мне план подготовки на эту неделю: по 20–30 минут в день, под мою цель.'
};
