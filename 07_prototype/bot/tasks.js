// Вопросы задания дня по цели ученика. Формат как в data/questions.js, но файл свой.
// { q, options, correct, why }; у профтеста correct: null, а каждый вариант голосует за направление (fields).
import { dayNumber } from './util.js';

const POOL = {
  ent: [
    { q: 'Чему равно 15% от 240?', options: ['24', '36', '32', '40'], correct: 1, why: '240 × 0,15 = 36.' },
    { q: 'Футболка стоила 8 000 ₸, её уценили на 25%. Сколько она стоит теперь?', options: ['6 000 ₸', '6 500 ₸', '7 000 ₸', '2 000 ₸'], correct: 0, why: '25% от 8 000 — это 2 000, значит 8 000 − 2 000 = 6 000.' },
    { q: 'Реши уравнение: 3x − 7 = 11', options: ['x = 4', 'x = 6', 'x = 18', 'x = 3'], correct: 1, why: '3x = 18, значит x = 6.' },
    { q: 'Поезд проехал 240 км за 3 часа. Какая у него скорость?', options: ['60 км/ч', '72 км/ч', '80 км/ч', '90 км/ч'], correct: 2, why: '240 : 3 = 80 км/ч.' },
    { q: 'Среднее арифметическое чисел 4, 7, 10 и 15?', options: ['8', '9', '10', '36'], correct: 1, why: '(4 + 7 + 10 + 15) : 4 = 36 : 4 = 9.' },
    { q: 'Сколько будет 2⁵?', options: ['10', '16', '25', '32'], correct: 3, why: '2 · 2 · 2 · 2 · 2 = 32.' }
  ],
  sat: [
    { q: 'If 2x + 5 = 17, what is the value of x?', options: ['5', '6', '7', '11'], correct: 1, why: '2x = 12, значит x = 6.' },
    { q: 'A $40 shirt is on sale for 15% off. What is the sale price?', options: ['$34', '$36', '$25', '$6'], correct: 0, why: '15% от 40 — это 6, значит 40 − 6 = 34.' },
    { q: 'What is the slope of the line y = −3x + 4?', options: ['4', '3', '−3', '−4'], correct: 2, why: 'В y = kx + b наклон равен k, то есть −3.' },
    { q: 'If f(x) = x² − 1, what is f(3)?', options: ['5', '8', '9', '10'], correct: 1, why: '3² − 1 = 9 − 1 = 8.' },
    { q: 'The ratio of boys to girls is 3 : 5. There are 40 students. How many are girls?', options: ['15', '24', '25', '30'], correct: 2, why: '40 : 8 = 5 на часть, девочек 5 × 5 = 25.' },
    { q: 'What is 30% of 50?', options: ['12', '15', '20', '35'], correct: 1, why: '50 × 0,3 = 15.' }
  ],
  ielts: [
    { q: 'She has lived here ___ 2019.', options: ['for', 'since', 'from', 'during'], correct: 1, why: 'since + момент времени, for + период.' },
    { q: 'Which word is closest in meaning to “significant”?', options: ['minor', 'important', 'similar', 'silent'], correct: 1, why: 'significant = important, «значимый».' },
    { q: 'If I ___ more time, I would travel.', options: ['have', 'had', 'will have', 'would have'], correct: 1, why: 'Второй тип условных: if + Past Simple, would + глагол.' },
    { q: 'Writing Task 1: which phrase describes a sharp rise?', options: ['levelled off', 'soared', 'fluctuated', 'dipped slightly'], correct: 1, why: 'soared — резко вырос; levelled off — выровнялся.' },
    { q: 'The number of students ___ increased.', options: ['have', 'has', 'are', 'were'], correct: 1, why: '«The number of…» — единственное число, поэтому has.' },
    { q: 'The city is expensive; ___, many students move there.', options: ['therefore', 'moreover', 'nevertheless', 'for example'], correct: 2, why: 'nevertheless = «тем не менее», это противопоставление.' }
  ],
  // «Пока не знаю»: мини-профтест без правильных ответов
  unknown: [
    { q: 'Что интереснее сделать за выходные?', options: ['Собрать свой сайт или бота', 'Разобраться, как работает иммунитет', 'Продать что-то на маркетплейсе'], fields: ['it', 'med', 'biz'], correct: null },
    { q: 'Какой школьный проект возьмёшь?', options: ['Игра на Python', 'Опрос о здоровье класса', 'Ярмарка с бюджетом и прибылью'], fields: ['it', 'med', 'biz'], correct: null },
    { q: 'Что звучит как ты?', options: ['Люблю логику и задачи', 'Хочу помогать людям', 'Люблю договариваться и вести за собой'], fields: ['it', 'med', 'biz'], correct: null }
  ]
};

export const PER_DAY = 3;

export function poolFor(goal) {
  return POOL[goal] || POOL.ent;
}

// Задание дня: 3 вопроса подряд из пула, каждый день следующая тройка
export function pickForDay(goal, day) {
  const pool = poolFor(goal);
  const start = (dayNumber(day) * PER_DAY) % pool.length;
  return Array.from({ length: Math.min(PER_DAY, pool.length) }, (_, i) => (start + i) % pool.length);
}
