// Данные части 2: вопросы мини-вызова. Выбираются по answers.goal из S0.
// Формат: { q: 'текст', options: ['a','b','c','d'], correct: 0, why: 'объяснение в одну строку' }
// Для unknown правильного ответа нет (correct: null), а fields говорит, к какому направлению ведёт вариант.
window.QUESTIONS = {
  ent: [
    { q: 'Чему равно 15% от 240?', options: ['24', '36', '32', '40'], correct: 1, why: '240 × 0,15 = 36' },
    { q: 'Реши уравнение: 3x − 7 = 11', options: ['x = 4', 'x = 5', 'x = 6', 'x = 7'], correct: 2, why: '3x = 18, значит x = 6' },
    { q: 'В каком году Казахстан провозгласил независимость?', options: ['1990', '1991', '1993', '1995'], correct: 1, why: 'Закон о независимости принят 16 декабря 1991 года' }
  ],
  sat: [
    { q: 'If 2x + 3 = 11, what is x?', options: ['3', '4', '5', '7'], correct: 1, why: '2x = 8, значит x = 4' },
    { q: 'A shirt costs $40 after a 20% discount. What was the original price?', options: ['$48', '$50', '$52', '$60'], correct: 1, why: '40 ÷ 0,8 = 50' },
    { q: 'The results were ___, so the team repeated the test.', options: ['conclusive', 'inconclusive', 'concluded', 'conclusively'], correct: 1, why: 'Тест повторяют, когда результат неоднозначный: inconclusive' }
  ],
  ielts: [
    { q: 'If I ___ more time, I would travel.', options: ['have', 'will have', 'had', 'having'], correct: 2, why: 'Второй тип условных: if + Past Simple, would + глагол' },
    { q: 'Closest meaning of «reluctant»:', options: ['eager', 'unwilling', 'quick', 'proud'], correct: 1, why: 'Reluctant значит «неохотно», то есть unwilling' },
    { q: 'She has lived here ___ 2019.', options: ['for', 'since', 'from', 'at'], correct: 1, why: 'Since ставим перед моментом времени, for перед периодом' }
  ],
  unknown: [
    { q: 'Что тебе интереснее разобрать?', options: ['Как работает приложение', 'Как устроен организм', 'Как заработать на идее'], fields: ['it', 'med', 'biz'], correct: null },
    { q: 'Какой проект ты бы взял на неделю?', options: ['Сделать Telegram-бота', 'Помогать в лаборатории', 'Запустить мини-бизнес'], fields: ['it', 'med', 'biz'], correct: null },
    { q: 'Что раздражает тебя сильнее?', options: ['Когда всё тормозит', 'Когда людям плохо', 'Когда упускают выгоду'], fields: ['it', 'med', 'biz'], correct: null }
  ]
};
