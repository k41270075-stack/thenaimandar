// Данные части 1: профили результата. Выбираются по answers.field в S0.
// Все цифры демо, на экране подписываются «пример».
window.PROFILES = {
  it: {
    title: 'AI-аналитик',
    match: 96,
    rarity: 'Легендарная',              // «редкость» карточки в сундуке
    professions: [['AI-аналитик', 96], ['Продуктовый дизайнер', 88], ['Data Engineer', 84]],
    unis: [
      { name: 'Nazarbayev University', country: 'Казахстан', match: 91 },
      { name: 'HKU', country: 'Гонконг', match: 87 },
      { name: 'UCL', country: 'Великобритания', match: 83 },
      { name: 'Bocconi', country: 'Италия', match: 80, locked: true }   // 4-й вуз под замком до «завтра»
    ],
    grantChance: 34,
    levers: [['+0,5 к IELTS', 9], ['ЕНТ 110+', 12]]
  }
  // med: {...}, biz: {...} — дописывает часть 1
};
