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
  },
  med: {
    title: 'Врач-исследователь',
    match: 93,
    rarity: 'Эпическая',
    professions: [['Врач-исследователь', 93], ['Биоинженер', 87], ['Фармацевт', 81]],
    unis: [
      { name: 'КазНМУ им. Асфендиярова', country: 'Казахстан', match: 90 },
      { name: 'Nazarbayev University, School of Medicine', country: 'Казахстан', match: 86 },
      { name: 'Charles University', country: 'Чехия', match: 82 },
      { name: 'Semmelweis University', country: 'Венгрия', match: 79, locked: true }
    ],
    grantChance: 41,
    levers: [['Биология 45+', 11], ['ЕНТ 115+', 14]]
  },
  biz: {
    title: 'Продакт-менеджер',
    match: 94,
    rarity: 'Редкая',
    professions: [['Продакт-менеджер', 94], ['Финансовый аналитик', 89], ['Маркетолог', 85]],
    unis: [
      { name: 'KIMEP University', country: 'Казахстан', match: 90 },
      { name: 'Narxoz University', country: 'Казахстан', match: 88 },
      { name: 'Erasmus University Rotterdam', country: 'Нидерланды', match: 82 },
      { name: 'Bocconi', country: 'Италия', match: 80, locked: true }
    ],
    grantChance: 38,
    levers: [['+0,5 к IELTS', 8], ['Математика 40+', 10]]
  }
};
