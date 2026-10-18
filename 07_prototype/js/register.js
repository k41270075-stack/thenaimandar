// Симуляция регистрации Ventorme для демо финала.
// Шаги: аккаунт (Google или почта) → «создаём аккаунт» → анкета 9 из 10 заполняется сама →
// «Последний вопрос» → index.html (S0 прототипа). Данные никуда не отправляются.
(function () {
  'use strict';

  var main = document.getElementById('rg-main');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STATE_KEY = 'vt5min-v1';      // ключ состояния прототипа: чистим, чтобы демо началось с S0
  var timers = [];

  function wait(ms) { return new Promise(function (r) { timers.push(setTimeout(r, reduced ? 0 : ms)); }); }

  var G_ICON = '<svg class="rg-g" viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  var ANKETA = [
    ['Имя', 'Айгерим'],
    ['Город', 'Астана'],
    ['Язык обучения', 'Русский'],
    ['Школа', 'Обычная школа, гимназия'],
    ['Что важнее всего', 'Поступить на грант'],
    ['Сколько готов заниматься', '30 минут в день'],
    ['Удобное время', 'Вечером'],
    ['Как узнал о Ventorme', 'От друзей'],
    ['Пробовал готовиться', 'Сам, по видео']
  ];

  /* Шаг 1. Аккаунт */
  function stepAccount() {
    main.innerHTML = '' +
      '<div class="rg-step">' +
        '<h1 class="h1 rg-rise" style="--i:0">Создай <em>аккаунт</em></h1>' +
        '<p class="lead rg-rise" style="--i:1">Бесплатно. Займёт 20 секунд, дальше сразу результат.</p>' +
        '<div class="panel rg-rise" style="--i:2"><div class="panel-core rg-form">' +
          '<button type="button" class="btn btn-ghost rg-google" id="rg-google">' + G_ICON + '<span>Продолжить с Google</span></button>' +
          '<div class="rg-or"><span>или по почте</span></div>' +
          '<form id="rg-mail" novalidate>' +
            '<label class="rg-label" for="rg-email">Почта</label>' +
            '<input class="rg-input" id="rg-email" type="email" inputmode="email" autocomplete="off" placeholder="name@mail.kz" value="aigerim.demo@mail.kz">' +
            '<p class="rg-err" id="rg-err" role="alert" hidden>Проверь почту: должна быть с @ и точкой</p>' +
            '<button type="submit" class="btn rg-submit"><span>Зарегистрироваться</span><span class="btn-arrow"></span></button>' +
          '</form>' +
        '</div></div>' +
        '<p class="rg-note rg-rise" style="--i:3">Это демо регистрации для хакатона: данные никуда не отправляются.</p>' +
      '</div>';

    document.getElementById('rg-google').addEventListener('click', function () { stepCreating('Google'); });
    document.getElementById('rg-mail').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = document.getElementById('rg-email').value.trim();
      var ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
      document.getElementById('rg-err').hidden = ok;
      if (ok) stepCreating('почту');
    });
  }

  /* Шаг 2. Создаём аккаунт */
  function stepCreating(via) {
    main.innerHTML = '' +
      '<div class="rg-step rg-center">' +
        '<div class="rg-check" id="rg-check" aria-hidden="true"><svg viewBox="0 0 52 52"><circle class="rg-check-c" cx="26" cy="26" r="23"/><path class="rg-check-p" d="M15 27l7 7 15-16"/></svg></div>' +
        '<h1 class="h1 rg-rise" style="--i:0" id="rg-title">Создаём аккаунт…</h1>' +
        '<p class="lead rg-rise" style="--i:1">Вход через ' + via + '</p>' +
      '</div>';
    wait(1100).then(function () {
      document.getElementById('rg-check').classList.add('is-done');
      document.getElementById('rg-title').textContent = 'Аккаунт готов';
      return wait(900);
    }).then(stepAnketa);
  }

  /* Шаг 3. Анкета: 9 ответов «уже есть», последний вопрос ждёт в прототипе */
  function stepAnketa() {
    main.innerHTML = '' +
      '<div class="rg-step">' +
        '<h1 class="h1 rg-rise" style="--i:0">Анкета <em>почти готова</em></h1>' +
        '<div class="rg-prog rg-rise" style="--i:1"><span class="rg-prog-bar"><i id="rg-bar"></i></span><b id="rg-count">0 из 10</b></div>' +
        '<ul class="rg-list" id="rg-list">' + ANKETA.map(function (a) {
          return '<li><span class="rg-q">' + a[0] + '</span><span class="rg-a">' + a[1] + '</span></li>';
        }).join('') + '</ul>' +
        '<div class="rg-cta" id="rg-cta" hidden><button type="button" class="btn btn-lime btn-glow" id="rg-go"><span>Последний вопрос</span><span class="btn-arrow"></span></button></div>' +
      '</div>';

    var items = main.querySelectorAll('#rg-list li');
    var bar = document.getElementById('rg-bar');
    var count = document.getElementById('rg-count');
    var i = 0;
    (function next() {
      if (i >= items.length) {
        document.getElementById('rg-cta').hidden = false;
        document.getElementById('rg-go').focus({ preventScroll: true });
        return;
      }
      items[i].classList.add('is-on');
      i++;
      bar.style.transform = 'scaleX(' + (i / 10) + ')';
      count.textContent = i + ' из 10';
      wait(170).then(next);
    })();

    document.getElementById('rg-go').addEventListener('click', function () {
      try { localStorage.removeItem(STATE_KEY); } catch (e) {}
      location.href = 'index.html';
    });
  }

  stepAccount();
})();
