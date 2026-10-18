// Вид страницы: на ноутбуке широкий сайт, на телефоне телефон.
// Shift + CapsLock + Tab на ноутбуке переключает «вид телефона» (телефон в рамке по центру) и обратно.
// Выбор запоминается в этом браузере; ?phone в ссылке сразу открывает вид телефона.
// Стили обоих видов: css/desktop.css. Здесь же шаги пути в шапке (видны только в широком виде).
(function () {
  'use strict';

  var KEY = 'vt5min-view';
  var root = document.documentElement;

  /* ---------- Режим вида ---------- */
  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function remember(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  function apply(v) {
    if (v === 'phone') root.setAttribute('data-view', 'phone');
    else root.removeAttribute('data-view');
    // Фон со звёздами и прочие холсты пересчитывают размер по resize
    window.dispatchEvent(new Event('resize'));
  }

  apply(/[?&]phone\b/.test(location.search) ? 'phone' : saved());

  var toastEl = null, toastTimer = 0;
  function toast(text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'view-toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = text;
    toastEl.classList.remove('is-on');
    void toastEl.offsetWidth;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  function toggle() {
    var next = root.getAttribute('data-view') === 'phone' ? 'desktop' : 'phone';
    remember(next);
    // Без анимации: действие с клавиатуры должно срабатывать мгновенно (скилл emil-design-eng)
    apply(next);
    var keys = '<kbd>Shift</kbd> + <kbd>Caps</kbd> + <kbd>Tab</kbd>';
    toast(next === 'phone' ? 'Вид телефона · ' + keys + ' вернёт сайт' : 'Вид ноутбука · ' + keys + ' покажет телефон');
  }

  window.View = { toggle: toggle, isPhone: function () { return root.getAttribute('data-view') === 'phone'; } };

  /* ---------- Shift + CapsLock + Tab ----------
     CapsLock на Mac — переключатель: событие приходит один раз (keydown при включении, keyup при выключении),
     поэтому считаем его «нажатым», если он сработал меньше секунды назад. Так комбинация ловится
     при любом состоянии лампочки, а обычный Shift + Tab для перехода по кнопкам не трогаем. */
  var capsAt = 0, comboAt = 0;
  function capsEvent(e) {
    if (e.key === 'CapsLock' || e.code === 'CapsLock') {
      capsAt = Date.now();
      check(e);
    }
  }
  function check(e) {
    var now = Date.now();
    var tab = e.key === 'Tab' || tabDown;
    if (!e.shiftKey || !tab || now - capsAt > 1000 || now - comboAt < 700) return false;
    comboAt = now;
    toggle();
    return true;
  }
  var tabDown = false;
  document.addEventListener('keydown', function (e) {
    capsEvent(e);
    if (e.key !== 'Tab') return;
    tabDown = true;
    if (check(e)) e.preventDefault();
  }, true);
  document.addEventListener('keyup', function (e) {
    capsEvent(e);
    if (e.key === 'Tab') tabDown = false;
  }, true);
  window.addEventListener('blur', function () { tabDown = false; });

  /* ---------- Шаги пути в шапке (только широкий вид) ---------- */
  var STEPS = [['s0', 'Анкета'], ['s1', 'Подбор'], ['s2', 'Результат'], ['s3', 'Первый шаг'],
    ['s4', 'Вызов'], ['s5', 'Награда'], ['s6', 'Venti'], ['s7', 'Завтра']];
  var hud = document.getElementById('hud');
  var nav = document.createElement('ol');
  nav.className = 'dk-steps';
  nav.setAttribute('aria-label', 'Путь ученика');
  nav.innerHTML = STEPS.map(function (s, i) {
    return '<li data-step="' + s[0] + '"><span class="dk-step-n">' + (i + 1) + '</span><span class="dk-step-t">' + s[1] + '</span></li>';
  }).join('');
  hud.insertBefore(nav, hud.querySelector('.hud-stats'));

  function renderSteps(screen) {
    var at = STEPS.findIndex(function (s) { return s[0] === screen; });
    nav.style.setProperty('--at', Math.max(0, at));
    nav.querySelectorAll('li').forEach(function (li, i) {
      li.classList.toggle('is-done', i < at);
      if (i === at) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }
  document.addEventListener('state', function (e) { renderSteps(e.detail.next.screen); });
  renderSteps(window.State ? State.get().screen : 's0');
})();

/* ---------- Смена фона: кнопка с палитрой в шапке ----------
   Четыре фона без смены темы: текст и карточки читаются одинаково. Выбор запоминается в этом браузере. */
(function () {
  'use strict';

  var KEY = 'vt5min-bg';
  var BGS = [['stars', 'Звёзды'], ['aurora', 'Сияние'], ['grid', 'Сетка'], ['plain', 'Без фона']];
  var root = document.documentElement;
  var app = document.getElementById('app');
  var stats = document.querySelector('.hud-stats');

  // Отдельный слой под экранами для «Сетки» и «Сияния»: свои маски и дрейф, звёзды при этом не рисуются
  var layer = document.createElement('div');
  layer.className = 'bg-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<span class="bg-grid"></span><span class="bg-blob bg-blob-1"></span><span class="bg-blob bg-blob-2"></span><span class="bg-blob bg-blob-3"></span>';
  app.insertBefore(layer, document.getElementById('screens'));

  // Затемнение под шторкой (на телефоне окно выбора выезжает снизу)
  var scrim = document.createElement('div');
  scrim.className = 'bg-scrim';
  scrim.hidden = true;
  app.appendChild(scrim);

  function current() { return root.getAttribute('data-bg') || 'stars'; }
  function apply(id) {
    if (id === 'stars') root.removeAttribute('data-bg'); else root.setAttribute('data-bg', id);
    // Холст со звёздами пересчитывает размер: спрятанный перестаёт рисовать, показанный начинает снова
    window.dispatchEvent(new Event('resize'));
  }
  try { var saved = localStorage.getItem(KEY); if (saved && saved !== 'stars') apply(saved); } catch (e) {}

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'bg-btn';
  btn.setAttribute('aria-label', 'Сменить фон');
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = Icon.svg('palette');
  stats.insertBefore(btn, stats.firstChild);

  var pop = document.createElement('div');
  pop.className = 'bg-pop';
  pop.setAttribute('role', 'radiogroup');
  pop.setAttribute('aria-label', 'Фон');
  pop.hidden = true;
  pop.innerHTML = '<p class="bg-pop-t">Фон</p><div class="bg-pop-grid">' + BGS.map(function (b) {
    return '<button type="button" role="radio" class="bg-opt" data-bg="' + b[0] + '"><span class="bg-swatch bg-swatch-' + b[0] + '"></span><span>' + b[1] + '</span></button>';
  }).join('') + '</div>';
  app.appendChild(pop);

  function sync() {
    pop.querySelectorAll('.bg-opt').forEach(function (o) { o.setAttribute('aria-checked', String(o.dataset.bg === current())); });
    pop.querySelector('.bg-pop-t').textContent = 'Фон';
  }
  function place() {
    // На узком экране (телефон и вид телефона) окно становится шторкой снизу: так оно всегда влезает.
    // На широком растёт из кнопки: правый край и верх привязаны к ней.
    var sheet = app.clientWidth < 600;
    pop.classList.toggle('is-sheet', sheet);
    if (sheet) { pop.style.top = ''; pop.style.right = ''; return; }
    var a = app.getBoundingClientRect(), r = btn.getBoundingClientRect();
    pop.style.top = (r.bottom - a.top + 8) + 'px';
    pop.style.right = Math.max(8, a.right - r.right) + 'px';
  }
  function open() {
    sync(); place();
    pop.hidden = false;
    if (pop.classList.contains('is-sheet')) scrim.hidden = false;
    void pop.offsetWidth;
    pop.classList.add('is-open');
    scrim.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    (pop.querySelector('[aria-checked="true"]') || pop.querySelector('.bg-opt')).focus({ preventScroll: true });
  }
  function close(focusBtn) {
    if (pop.hidden) return;
    pop.classList.remove('is-open');
    scrim.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    // Закрытие быстрее открытия: шторка уезжает за 240 мс, окно гаснет за 150 мс
    setTimeout(function () { if (!pop.classList.contains('is-open')) { pop.hidden = true; scrim.hidden = true; } }, 260);
    if (focusBtn) btn.focus({ preventScroll: true });
  }

  btn.addEventListener('click', function (e) { e.stopPropagation(); if (pop.hidden) open(); else close(); });
  pop.addEventListener('click', function (e) {
    e.stopPropagation();
    var o = e.target.closest('.bg-opt');
    if (!o) return;
    apply(o.dataset.bg);
    try { localStorage.setItem(KEY, o.dataset.bg); } catch (err) {}
    sync();
    if (window.FX) FX.sound('pop');
    // На телефоне шторка закрывается сама, чтобы сразу увидеть новый фон
    if (pop.classList.contains('is-sheet')) setTimeout(function () { close(); }, 180);
  });
  document.addEventListener('click', function () { close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(true); });
  window.addEventListener('resize', function () { if (!pop.hidden) place(); });
})();
