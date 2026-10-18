// Запуск: открываем экран, на котором остановились (или S0).
(function () {
  // Заглушки на случай, если какая-то часть ещё не готова
  Screens.stub('s0', 'Последний вопрос анкеты', 's1');
  Screens.stub('s1', 'Venti анализирует', 's2');
  Screens.stub('s2', 'Сундук с результатом', 's3');
  Screens.stub('s3', 'Первый шаг за 60 секунд', 's4');
  Screens.stub('s4', 'Мини-вызов', 's5');
  Screens.stub('s5', 'Награда', 's6');
  Screens.stub('s6', 'Куда прислать завтрашнее задание?', 's7');
  Screens.stub('s7', 'Завтра', null);

  // После сброса демо всегда начинаем с S0
  document.addEventListener('state', function (e) {
    if (e.detail.prev.screen !== 's0' && e.detail.next.screen === 's0' && Screens.current() !== 's0') go('s0');
  });

  go(State.get().screen || 's0');
})();
