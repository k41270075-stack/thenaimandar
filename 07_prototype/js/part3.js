// Участник 2: S6, S7, демо-меню и сцена серии StreakFX. Бот Ventorme AI живёт в api/ и bot/.
// Движение по правилам DEV_PLAN (раздел 0) и раскадровке StreakFX (раздел 3.5): только transform и opacity,
// пропуск тапом, при «уменьшить движение» — сразу итог.
(function () {
  // Юзернейм бота из @BotFather, без @ (см. DEPLOY.md)
  var BOT_USERNAME = 'VentormeAI_bot';

  var GOALS = { ent: 'ЕНТ', sat: 'SAT', ielts: 'IELTS', unknown: 'профтеста' };
  var DEMO_ANSWERS = { grade: '11', goal: 'ent', field: 'it' };
  var FALLBACK_UNI = { name: 'Bocconi', country: 'Италия', match: 80 };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function profile(s) {
    var p = window.PROFILES || {};
    return p[s.profileId] || p[s.answers.field] || null;
  }

  // Профиль для бота: `${field}_${goal}_${grade}`, только [A-Za-z0-9_-], до 64 символов. Пример: it_ent_11
  function payload(s) {
    var a = s.answers || {};
    var field = /^(it|med|biz)$/.test(a.field) ? a.field : (/^(it|med|biz)$/.test(s.profileId) ? s.profileId : 'na');
    var goal = /^(ent|sat|ielts|unknown)$/.test(a.goal) ? a.goal : 'na';
    var grade = String(a.grade || '').replace(/[^0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'na';
    return (field + '_' + goal + '_' + grade).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  }

  function botLink(s) {
    return 'https://t.me/' + BOT_USERNAME + '?start=' + payload(s);
  }

  function streakText(n) {
    var m10 = n % 10, m100 = n % 100;
    var w = m10 === 1 && m100 !== 11 ? 'день' : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'дня' : 'дней');
    return n + '\u00A0' + w;
  }

  // ---------- S6. Подключи Venti в Telegram ----------

  function renderS6(el, s) {
    var p = profile(s);
    var result = p ? 'Твой результат: ' + esc(p.title) + ', ' + p.match + '% совпадения.' : 'Твой результат уже у меня.';
    var streak = Math.max(1, s.streak);
    var tgOn = s.notify && s.notify.tg;

    el.innerHTML =
      '<h1 class="h1">Подключи <em>Venti</em> в Telegram</h1>' +
      '<p class="lead">Завтра в 19:00 Venti пришлёт задание на 60 секунд, чтобы серия не сгорела. И ответит на любой вопрос про поступление.</p>' +

      '<div class="panel s6-chat">' +
        '<div class="panel-core">' +
          '<div class="s6-chat-head">' +
            '<img class="s6-avatar" src="img/ventorme-icon.png" alt="" width="40" height="40">' +
            '<div class="s6-chat-name"><b>Venti · Ventorme AI</b><span>бот в Telegram</span></div>' +
          '</div>' +
          '<div class="s6-msg"><div class="s6-typing" aria-hidden="true"><span></span><span></span><span></span></div>' +
          '<div class="s6-bubble">' +
            '<p>Привет! Я Venti из Ventorme. ' + result + ' Серия: ' + streakText(streak) + ' 🔥</p>' +
            '<p>Завтра в 19:00 пришлю задание на 60 секунд.</p>' +
          '</div></div>' +
          '<span class="tag-example">пример первого сообщения</span>' +
        '</div>' +
      '</div>' +

      '<div class="card s6-time">' +
        '<span class="s6-time-icon" aria-hidden="true">' + Icon.svg('alarm') + '</span>' +
        '<div><b>Каждый день в 19:00</b><span>Одно сообщение в день. Отписка одной командой /stop</span></div>' +
      '</div>' +

      '<a class="btn s6-connect" href="' + esc(botLink(s)) + '" target="_blank" rel="noopener">' +
        '<span>' + (tgOn ? 'Открыть Venti ещё раз' : 'Подключить Venti') + '</span><span class="btn-arrow"></span>' +
      '</a>' +

      '<details class="s6-mail"' + (s.notify && s.notify.email ? ' open' : '') + '>' +
        '<summary>Нет Telegram? Пришлём на почту</summary>' +
        '<form class="s6-mail-form" novalidate>' +
          '<label class="s6-label" for="s6-email">Почта</label>' +
          '<input class="s6-input" id="s6-email" type="email" inputmode="email" autocomplete="email" placeholder="name@mail.kz" value="' + esc(s.notify && s.notify.contact || '') + '">' +
          '<p class="s6-mail-note" role="status">' + (s.notify && s.notify.email ? 'Готово, напомним на почту.' : 'В демо почта остаётся на этом телефоне.') + '</p>' +
          '<button class="btn btn-ghost" type="submit"><span>Напоминать на почту</span></button>' +
        '</form>' +
      '</details>' +

      '<button class="btn ' + (tgOn ? '' : 'btn-ghost ') + 's6-done" type="button" data-go="s7">' +
        '<span>Готово</span><span class="btn-arrow"></span>' +
      '</button>';

    el.querySelector('.s6-connect').addEventListener('click', function () {
      FX.sound('pop');
      State.set({ notify: { tg: true, time: '19:00' } });
      el.querySelector('.s6-connect span').textContent = 'Открыть Venti ещё раз';
      el.querySelector('.s6-done').classList.remove('btn-ghost');
    });

    el.querySelector('.s6-mail-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = el.querySelector('#s6-email');
      var note = el.querySelector('.s6-mail-note');
      var value = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        input.setAttribute('aria-invalid', 'true');
        note.textContent = 'Проверь почту: похоже, в ней опечатка.';
        FX.sound('error');
        return;
      }
      input.removeAttribute('aria-invalid');
      State.set({ notify: { email: true, contact: value, time: '19:00' } });
      note.textContent = 'Готово, напомним на почту.';
      el.querySelector('.s6-done').classList.remove('btn-ghost');
      FX.sound('ding');
    });
  }

  Screens.register('s6', { enter: renderS6 });

  // ---------- S7. Завтра ----------

  function lockedUni(s) {
    var p = profile(s);
    var unis = (p && p.unis) || [];
    for (var i = 0; i < unis.length; i++) if (unis[i].locked) return unis[i];
    return unis[3] || FALLBACK_UNI;
  }

  // 8 осколков замка: угол разлёта, дальность и поворот у каждого свои
  function shards() {
    var h = '';
    for (var i = 0; i < 8; i++) {
      h += '<span class="s7-shard" style="--a:' + (i * 45 + (i % 2 ? 12 : -8)) + 'deg;--d:' + (34 + (i * 7) % 20) + 'px;--r:' + (i % 2 ? 140 : -120) + 'deg"></span>';
    }
    return h;
  }

  function tomorrowDate() {
    var d = new Date(Date.now() + 86400000);
    try { return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }); }
    catch (e) { return 'завтра'; }
  }

  function renderS7(el, s) {
    var goal = GOALS[s.answers.goal] || GOALS.ent;
    var uni = lockedUni(s);
    var streak = Math.max(1, s.streak);

    el.innerHTML =
      '<h1 class="h1">Завтра, <em>19:00</em></h1>' +
      '<p class="lead">Прошли сутки. Venti напоминает о себе, а ученик возвращается за минуту.</p>' +

      '<div class="s7-lock">' +
        '<svg class="s7-clock" viewBox="0 0 100 100" aria-hidden="true">' +
          '<circle cx="50" cy="50" r="46" class="s7-clock-face"/>' +
          '<g class="s7-clock-ticks">' +
            [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(function (a) {
              return '<line x1="50" y1="8" x2="50" y2="14" transform="rotate(' + a + ' 50 50)"/>';
            }).join('') +
          '</g>' +
          '<line class="s7-hand-h" x1="50" y1="50" x2="50" y2="28" transform="rotate(210 50 50)"/>' +
          '<line class="s7-hand-m" x1="50" y1="50" x2="50" y2="16"/>' +
          '<circle cx="50" cy="50" r="3.5" class="s7-clock-pin"/>' +
        '</svg>' +
        '<p class="s7-time">19:00</p>' +
        '<p class="s7-date">' + esc(tomorrowDate()) + '</p>' +

        '<button class="s7-notif" type="button">' +
          '<img class="s7-notif-icon" src="img/ventorme-icon.png" alt="" width="38" height="38">' +
          '<span class="s7-notif-body">' +
            '<span class="s7-notif-top"><b>Ventorme AI</b><span>сейчас</span></span>' +
            '<span class="s7-notif-title">Серия ' + streakText(streak) + ' 🔥 Не дай ей сгореть</span>' +
            '<span class="s7-notif-text">Сегодня: 3 вопроса ' + goal + ' за 60 секунд, до +40 XP</span>' +
          '</span>' +
        '</button>' +
        '<p class="s7-hint">Нажми на уведомление</p>' +
      '</div>' +

      '<div class="s7-result" hidden>' +
        '<div class="panel"><div class="panel-core s7-streak">' +
          '<span class="s7-fire" aria-hidden="true">' + Icon.svg('fire') + '</span>' +
          '<div><b class="s7-streak-num"></b><span>Серия растёт, план поступления тоже</span></div>' +
        '</div></div>' +
        '<div class="card s7-uni">' +
          '<span class="s7-uni-icon" aria-hidden="true">' +
            '<span class="s7-uni-lock">' + Icon.svg('lock') + '</span>' +
            '<span class="s7-uni-open">' + Icon.svg('unlock') + '</span>' +
            shards() +
          '</span>' +
          '<div class="s7-uni-name"><b>' + esc(uni.name) + '</b><span>' + esc(uni.country) + ' · открыт после задания</span></div>' +
          '<b class="s7-uni-match">' + uni.match + '%</b>' +
        '</div>' +
        '<span class="tag-example">пример</span>' +
        '<button class="btn s7-restart" type="button"><span>Начать заново</span><span class="btn-arrow"></span></button>' +
      '</div>';

    var notif = el.querySelector('.s7-notif');

    // burst: замок 4-го вуза разлетается на осколки (только сразу после тапа, не при повторном заходе)
    function open(burst) {
      var st = State.get();
      el.querySelector('.s7-streak-num').textContent = streakText(Math.max(2, st.streak)) + ' подряд';
      el.querySelector('.s7-hint').hidden = true;
      el.querySelector('.s7-result').hidden = false;
      notif.setAttribute('aria-disabled', 'true');
      notif.classList.add('is-read');
      if (burst && !FX.reduced) {
        el.querySelector('.s7-uni').classList.add('s7-burst');
        setTimeout(function () { if (Screens.current() === 's7') FX.sound('pop'); }, 520);
      }
    }

    notif.addEventListener('click', function () {
      if (notif.classList.contains('is-read')) return;
      FX.vibrate([30, 50, 80]);
      FX.sound('ding');
      var from = Math.max(1, State.get().streak);
      State.set({ streak: from + 1, lockedUni: false, tomorrow: true });
      notif.setAttribute('aria-disabled', 'true');
      notif.classList.add('is-read');
      // Сначала сцена серии 1 → 2, потом итог и открытый вуз
      playStreak(from, from + 1).then(function () {
        if (Screens.current() !== 's7') return;
        open(true);
        el.querySelector('.s7-restart').focus({ preventScroll: true });
      });
    });

    el.querySelector('.s7-restart').addEventListener('click', function () {
      State.reset();
    });

    if (s.tomorrow) {
      open();
      el.classList.add('s7-seen');
    } else {
      el.classList.remove('s7-seen');
      // Вибрация и звук в момент, когда уведомление падает сверху (после перемотки часов)
      setTimeout(function () {
        if (Screens.current() !== 's7') return;
        FX.vibrate([20, 40, 20]);
        FX.sound('pop');
      }, FX.reduced ? 0 : 1350);
    }
  }

  Screens.register('s7', { enter: renderS7 });

  // ---------- StreakFX: мощная сцена серии (DEV_PLAN 3.5) ----------
  // StreakFX.play(from, to) → Promise, который выполняется, когда сцена закрыта. Рисуется в #overlay-root.
  // Раскадровка ~2,4 с: затемнение и свечение → огонь с ударными волнами → искры → барабан числа →
  // дни недели → конфетти и вздрагивание → текст → кнопка «Продолжить». Тап до кнопки — сразу финальный кадр.

  var WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  var SPARKS = 22;
  var streakActive = null;

  function dayWord(n) { return streakText(n).split('\u00A0')[1]; }

  // Барабан: старое число, 6 «пролетающих» и новое. Пролетающие не совпадают с итогом, чтобы «щелчок» был виден
  function reelNumbers(from, to) {
    var list = [from], top = Math.max(9, to + 5), seed = to * 7 + from * 3 + 1;
    for (var i = 0; i < 6; i++) {
      seed = (seed * 37 + 11) % 101;
      var n = seed % (top + 1);
      list.push(n === to ? (n + 3) % (top + 1) : n);
    }
    list.push(to);
    return list;
  }

  function sparks() {
    var h = '';
    for (var i = 0; i < SPARKS; i++) {
      var a = Math.round(i * 360 / SPARKS + (i % 3) * 5);
      var d = 80 + (i * 53) % 140;                    // 80–220 px
      var s = 6 + (i % 3) * 2;
      h += '<span class="streakfx-spark' + (i % 4 === 0 ? ' is-lime' : '') + '" style="--a:' + a + 'deg;--d:' + d + 'px;--s:' + s + 'px;--t:' + (300 + (i % 5) * 20) + 'ms"></span>';
    }
    return h;
  }

  function week(to) {
    var today = (new Date().getDay() + 6) % 7;
    var first = Math.max(0, today - (to - 1));        // дни серии на этой неделе, заканчиваются сегодня
    return WEEK.map(function (d, i) {
      var on = i >= first && i <= today;
      return '<li class="' + (on ? 'is-on' : '') + (i === today ? ' is-today' : '') + '" style="--k:' + (i - first) + '">' +
        '<span class="streakfx-dot">' + (on ? Icon.svg('fire') : '') + '</span><span>' + d + '</span></li>';
    }).join('');
  }

  function playStreak(from, to) {
    if (streakActive) return streakActive;
    from = Math.max(0, Math.floor(from) || 0);
    to = Math.max(from + 1, Math.floor(to) || 0);
    var root = document.getElementById('overlay-root');
    var prevFocus = document.activeElement;
    var reel = reelNumbers(from, to);
    var title = to === 1 ? 'Первый день серии! 🔥' : 'Серия ' + streakText(to) + '! 🔥';

    var node = document.createElement('div');
    node.className = 'streakfx';
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');
    node.setAttribute('aria-labelledby', 'streakfx-title');
    node.tabIndex = -1;
    node.style.setProperty('--n', reel.length - 1);
    node.innerHTML =
      '<div class="streakfx-bg"></div>' +
      '<div class="streakfx-body">' +
        '<div class="streakfx-stage" aria-hidden="true">' +
          '<span class="streakfx-glow"></span>' +
          '<span class="streakfx-ring"></span><span class="streakfx-ring is-2"></span>' +
          sparks() +
          '<span class="streakfx-fire"><span class="streakfx-fire-in">' + Icon.svg('fire') + '</span></span>' +
        '</div>' +
        '<div class="streakfx-count" aria-hidden="true"><span class="streakfx-reel">' +
          reel.map(function (n) { return '<b>' + n + '</b>'; }).join('') +
        '</span></div>' +
        '<p class="streakfx-unit" aria-hidden="true">' + dayWord(to) + ' подряд</p>' +
        '<ol class="streakfx-week" aria-hidden="true">' + week(to) + '</ol>' +
        '<p class="streakfx-title" id="streakfx-title">' + title + '</p>' +
        '<p class="streakfx-sub">Завтра 3 вопроса за минуту — не потеряй серию</p>' +
        '<button class="btn btn-lime streakfx-go" type="button"><span>Продолжить</span><span class="btn-arrow"></span></button>' +
      '</div>';
    root.appendChild(node);

    var timers = [], sounded = false, closed = false, done;
    var promise = new Promise(function (r) { done = r; });
    streakActive = promise;
    var btn = node.querySelector('.streakfx-go');

    function sound() {
      if (sounded) return;
      sounded = true;
      FX.sound('levelup');
      FX.vibrate([30, 40, 90]);
    }
    function final() {
      if (node.classList.contains('is-final')) return;
      timers.forEach(clearTimeout);
      node.classList.add('is-final');
      sound();
      btn.focus({ preventScroll: true });
    }
    function close() {
      if (closed) return;
      closed = true;
      timers.forEach(clearTimeout);
      node.classList.add('is-out');
      setTimeout(function () {
        node.remove();
        streakActive = null;
        if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
        done();
      }, FX.reduced ? 0 : 220);
    }

    btn.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    node.addEventListener('click', final);
    node.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); if (node.classList.contains('is-final')) close(); else final(); }
      if (e.key === 'Tab') { e.preventDefault(); btn.focus(); }   // фокус не уходит из сцены
    });

    if (FX.reduced) {
      node.classList.add('is-final');
      sound();
      btn.focus({ preventScroll: true });
    } else {
      node.focus({ preventScroll: true });
      timers.push(setTimeout(sound, 1150));
      timers.push(setTimeout(function () {
        FX.confetti({ colors: ['#FF8A3D', '#C6F432', '#FFFFFF'], particleCount: 60 });
      }, 1400));
      timers.push(setTimeout(function () { node.classList.add('is-final'); btn.focus({ preventScroll: true }); }, 2600));
    }
    return promise;
  }

  window.StreakFX = { play: playStreak };

  // Заход в новый день: вчера была серия — до любого экрана показываем n → n+1.
  // Дата в том же виде, что пишет S5 (toISOString), иначе дни не совпадут.
  (function newDay() {
    var s = State.get();
    var today = new Date().toISOString().slice(0, 10);
    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (!s.streak || s.lastActive !== yesterday) return;
    var from = s.streak;
    State.set({ streak: from + 1, lastActive: today });
    requestAnimationFrame(function () { playStreak(from, from + 1); });
  })();

  // ---------- Демо-меню: тройной тап по логотипу ----------

  var root = document.getElementById('overlay-root');
  var backdrop = document.createElement('div');
  var sheet = document.createElement('div');
  backdrop.className = 'demo-backdrop';
  backdrop.hidden = true;
  sheet.className = 'demo-sheet';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'demo-title');
  sheet.innerHTML =
    '<p class="demo-title" id="demo-title">Демо-меню</p>' +
    '<p class="demo-sub">Для показа на защите</p>' +
    '<div class="demo-actions">' +
      '<button class="btn btn-ghost" type="button" data-demo="reset"><span>Сбросить демо</span></button>' +
      '<button class="btn btn-ghost" type="button" data-demo="tomorrow"><span>Перейти в «Завтра»</span></button>' +
      '<button class="btn btn-ghost" type="button" data-demo="streak"><span>Показать серию</span></button>' +
      '<button class="btn btn-ghost" type="button" data-demo="skip"><span>Пропустить анкету</span></button>' +
      '<button class="btn" type="button" data-demo="close"><span>Закрыть</span></button>' +
    '</div>';
  root.appendChild(backdrop);
  root.appendChild(sheet);

  function isOpen() { return !sheet.hidden; }

  function openMenu() {
    backdrop.hidden = false;
    sheet.hidden = false;
    sheet.querySelector('button').focus();
  }

  function closeMenu() {
    if (!isOpen()) return;
    backdrop.hidden = true;
    sheet.hidden = true;
    var logo = document.getElementById('hud-logo');
    if (logo) logo.focus({ preventScroll: true });
  }

  var actions = {
    reset: function () {
      closeMenu();
      State.reset();
    },
    // Состояние «после S6», чтобы S7 показал уведомление заново
    tomorrow: function () {
      var s = State.get();
      var patch = { streak: 1, plan: 25, badge5min: true, lockedUni: true, tomorrow: false, notify: { tg: true, time: '19:00' } };
      if (!s.answers.goal || !s.answers.field) { patch.answers = DEMO_ANSWERS; patch.profileId = 'it'; }
      if (s.level < 2) { patch.xp = 110; patch.level = 2; }
      State.set(patch);
      closeMenu();
      var el = document.querySelector('[data-screen="s7"]');
      if (Screens.current() === 's7') renderS7(el, State.get());
      else go('s7');
    },
    // Только показ сцены для защиты: состояние не меняется
    streak: function () {
      closeMenu();
      var n = Math.max(1, State.get().streak);
      playStreak(n, n + 1);
    },
    skip: function () {
      State.set({ answers: DEMO_ANSWERS, profileId: 'it' });
      closeMenu();
      go('s2');
    },
    close: closeMenu
  };

  sheet.addEventListener('click', function (e) {
    var b = e.target.closest('[data-demo]');
    if (b && actions[b.getAttribute('data-demo')]) actions[b.getAttribute('data-demo')]();
  });
  backdrop.addEventListener('click', closeMenu);

  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { closeMenu(); return; }
    if (e.key !== 'Tab') return;
    // Фокус не уходит из шторки
    var items = sheet.querySelectorAll('button');
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  document.addEventListener('demo:menu', function () {
    if (isOpen()) closeMenu(); else openMenu();
  });
})();
