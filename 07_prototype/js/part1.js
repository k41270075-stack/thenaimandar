// Участник 1, часть 1: S0, S1, S2 и фон #bg.
// Анимации по скиллам web-animation-design и make-interfaces-feel-better:
// появление ease-out со стаггером ~80 мс, «вау»-моменты на пружине, только transform и opacity,
// каждый эффект пропускается тапом, при reduced motion остаётся только появление.
(function () {
  'use strict';

  var GOAL_LABEL = { ent: 'ЕНТ', sat: 'SAT', ielts: 'IELTS', unknown: 'профтесту' };
  var GRADE_LABEL = { '8-9': '8-9 класса', '10': '10 класса', '11-12': '11-12 класса' };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }

  // Счёт с форматированием «1 000». FX.countUp пишет число без пробелов, поэтому свой.
  function countFmt(node, to, ms, suffix) {
    var start = performance.now();
    ms = FX.reduced ? 0 : ms;
    return new Promise(function (done) {
      function tick(now) {
        var t = ms ? Math.min(1, (now - start) / ms) : 1;
        node.textContent = fmt(to * FX.easeOutCubic(t)) + (suffix || '');
        if (t < 1) requestAnimationFrame(tick); else done();
      }
      requestAnimationFrame(tick);
    });
  }

  /* ======================================================================
     S0. Последний вопрос анкеты
     ====================================================================== */
  var GROUPS = [
    { key: 'grade', label: 'Класс', opts: [['8-9', '8-9'], ['10', '10'], ['11-12', '11-12']] },
    { key: 'goal', label: 'Цель', opts: [['ent', 'ЕНТ'], ['sat', 'SAT'], ['ielts', 'IELTS'], ['unknown', 'Пока не знаю']] },
    { key: 'field', label: 'Направление', opts: [['it', 'IT'], ['med', 'Медицина'], ['biz', 'Бизнес']] }
  ];

  Screens.register('s0', {
    enter: function (el, state) {
      var picked = Object.assign({}, state.answers);
      var h = '' +
        '<div class="s0-progress s0-rise" style="--i:0" aria-label="Анкета почти готова"><span></span></div>' +
        '<h1 class="h1 s0-rise" style="--i:1">Последний <em>вопрос</em>, и результат готов</h1>' +
        '<p class="lead s0-rise" style="--i:2">Ответы меняют результат. Можно попробовать разные.</p>' +
        '<div class="panel s0-rise" style="--i:3"><div class="panel-core s0-groups">';
      GROUPS.forEach(function (g) {
        h += '<div class="s0-group" role="group" aria-label="' + g.label + '"><span class="s0-label">' + g.label + '</span><div class="chips">';
        g.opts.forEach(function (o) {
          h += '<button type="button" class="chip" data-k="' + g.key + '" data-v="' + o[0] + '" aria-pressed="' + (picked[g.key] === o[0]) + '">' + o[1] + '</button>';
        });
        h += '</div></div>';
      });
      h += '</div></div>' +
        '<div class="s0-cta s0-rise" style="--i:4"><button type="button" class="btn" id="s0-done"><span>Готово</span><span class="btn-arrow"></span></button></div>';
      el.innerHTML = h;

      var done = el.querySelector('#s0-done');
      function sync() { done.disabled = !(picked.grade && picked.goal && picked.field); }
      sync();

      el.querySelectorAll('.chip').forEach(function (c) {
        c.addEventListener('click', function () {
          var k = c.dataset.k;
          picked[k] = c.dataset.v;
          el.querySelectorAll('.chip[data-k="' + k + '"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
          FX.sound('pop');   // первый тап заодно разблокирует звук на iPhone
          sync();
        });
      });

      done.addEventListener('click', function () {
        State.set({ answers: picked, profileId: picked.field });
        go('s1');
      });
    }
  });

  /* ======================================================================
     S1. Venti сканирует вузы (2,5 с, тап пропускает)
     ====================================================================== */
  var UNIS = ['NU', 'KBTU', 'HKU', 'UCL', 'ETH', 'NUS', 'KAIST', 'SDU', 'AITU', 'ЕНУ', 'КазНУ', 'TUM', 'KIMEP', 'Narxoz',
    'Bocconi', 'Tsinghua', 'Toronto', 'Seoul', 'Charles', 'Erasmus', 'Satbayev', 'Sorbonne', 'Monash', 'Leiden', 'КазНМУ', 'Aalto'];

  var s1Timers = [];
  Screens.register('s1', {
    enter: function (el, state) {
      var a = state.answers;
      var dots = '';
      UNIS.forEach(function (u, i) {
        // Точка старта на краю круга, у каждой своя задержка: «всасывание» в центр волной
        var ang = (i / UNIS.length) * Math.PI * 2 + (i % 3) * 0.35;
        var r = 150 + (i % 4) * 22;
        dots += '<span class="s1-dot" style="--x:' + Math.round(Math.cos(ang) * r) + 'px;--y:' + Math.round(Math.sin(ang) * r) + 'px;--d:' + (i * 42) + 'ms">' + esc(u) + '</span>';
      });
      el.innerHTML = '' +
        '<h1 class="h1 s0-rise" style="--i:0">Venti подбирает <em>вузы</em> под тебя</h1>' +
        '<div class="s1-stage" aria-hidden="true">' + dots +
          '<span class="s1-core"><span class="s1-core-in">V</span></span><span class="s1-beam"></span></div>' +
        '<div class="s1-stats s0-rise" style="--i:1"><div><b id="s1-u">0</b><span>вузов</span></div><div><b id="s1-g">0</b><span>грантов</span></div></div>' +
        '<ul class="s1-lines">' +
          '<li style="--d:300ms">Сравниваю 1 000+ вузов</li>' +
          '<li style="--d:900ms">Ищу гранты под ' + (GOAL_LABEL[a.goal] || 'твою цель') + '</li>' +
          '<li style="--d:1500ms">Считаю шанс для ' + (GRADE_LABEL[a.grade] || 'тебя') + '</li>' +
        '</ul>' +
        '<p class="tag-example s1-skip">Нажми, чтобы пропустить</p>';

      countFmt(el.querySelector('#s1-u'), 1000, 1800, '+');
      countFmt(el.querySelector('#s1-g'), 300, 1800, '+');

      function next() { if (Screens.current() === 's1') go('s2'); }
      s1Timers.push(setTimeout(next, FX.reduced ? 1200 : 2600));
      el.onclick = next;
    },
    leave: function (el) {
      s1Timers.forEach(clearTimeout);
      s1Timers = [];
      el.onclick = null;
    }
  });

  /* ======================================================================
     S2. Сундук с результатом
     ====================================================================== */
  var s2Timers = [];
  function ringSvg() {
    return '<svg class="s2-ring" viewBox="0 0 120 120" aria-hidden="true">' +
      '<circle cx="60" cy="60" r="50" class="s2-ring-track"/>' +
      '<circle cx="60" cy="60" r="50" class="s2-ring-fill" id="s2-ring-fill"/></svg>';
  }

  function renderResult(el, p) {
    var others = p.professions.slice(1).map(function (pr, i) {
      return '<div class="s2-prof s2-late" style="--i:' + (i + 1) + '"><div class="s2-prof-top"><span>' + esc(pr[0]) + '</span><b>' + pr[1] + '%</b></div>' +
        '<span class="s2-bar"><i style="--w:' + (pr[1] / 100) + ';--d:' + (520 + i * 120) + 'ms"></i></span></div>';
    }).join('');
    var unis = p.unis.map(function (u, i) {
      if (u.locked) {
        return '<li class="s2-uni s2-uni-locked s2-late" style="--i:' + (i + 3) + '"><span class="s2-uni-name">' + esc(u.name) + '</span>' +
          '<span class="s2-lock" aria-label="Откроется завтра">🔒 Завтра</span></li>';
      }
      return '<li class="s2-uni s2-late" style="--i:' + (i + 3) + '"><span><span class="s2-uni-name">' + esc(u.name) + '</span><span class="s2-uni-c">' + esc(u.country) + '</span></span><b>' + u.match + '%</b></li>';
    }).join('');

    el.innerHTML = '' +
      '<div class="s2-hero">' +
        '<span class="s2-rays" aria-hidden="true"></span>' +
        '<div class="s2-card" role="img" aria-label="Профессия: ' + esc(p.title) + ', совпадение ' + p.match + '%">' +
          '<span class="s2-rarity">' + esc(p.rarity) + '</span>' +
          '<span class="s2-card-k">Твоя профессия №1</span>' +
          '<span class="s2-card-t">' + esc(p.title) + '</span>' +
          '<span class="s2-card-m"><b>' + p.match + '%</b> совпадения</span>' +
        '</div>' +
      '</div>' +
      '<section class="card s2-block s2-late" style="--i:0"><h2 class="h2">Ещё тебе подходят</h2>' + others + '</section>' +
      '<section class="card s2-block s2-late" style="--i:2"><h2 class="h2">Вузы под тебя</h2><ul class="s2-unis">' + unis + '</ul></section>' +
      '<section class="card s2-block s2-grant s2-late" style="--i:7">' + ringSvg() +
        '<div class="s2-grant-txt"><span class="s2-grant-k">Шанс на грант</span><b class="s2-grant-v" id="s2-grant">0%</b>' +
        '<div class="s2-levers">' + p.levers.map(function (l) { return '<span class="s2-lever">' + esc(l[0]) + ' <b>+' + l[1] + '%</b></span>'; }).join('') + '</div></div>' +
      '</section>' +
      '<p class="tag-example s2-late" style="--i:8">Пример: цифры в прототипе демонстрационные</p>' +
      '<div class="s2-late" style="--i:9"><button type="button" class="btn" data-go="s3"><span>Дальше</span><span class="btn-arrow"></span></button></div>';

    // Кольцо и счёт идут одновременно: одна длительность, одна кривая (правило парных элементов)
    var fill = el.querySelector('#s2-ring-fill');
    var C = 2 * Math.PI * 50;
    fill.style.strokeDasharray = C;
    fill.style.strokeDashoffset = C;
    s2Timers.push(setTimeout(function () {
      void fill.getBoundingClientRect();
      fill.style.strokeDashoffset = C * (1 - p.grantChance / 100);
      FX.countUp(el.querySelector('#s2-grant'), p.grantChance, { ms: 1200, suffix: '%' });
    }, FX.reduced ? 0 : 1100));
  }

  Screens.register('s2', {
    enter: function (el, state) {
      var p = window.PROFILES[state.profileId] || window.PROFILES.it;
      el.classList.remove('s2-skip', 's2-open');
      el.innerHTML = '' +
        '<div class="s2-intro">' +
          '<h1 class="h1 s0-rise" style="--i:0">Твой результат <em>готов</em></h1>' +
          '<p class="lead s0-rise" style="--i:1">Нажми на сундук, чтобы открыть.</p>' +
          '<button type="button" class="s2-chest s0-rise" style="--i:2" aria-label="Открыть сундук с результатом">' +
            '<span class="s2-chest-glow"></span>' +
            '<span class="s2-chest-lid"></span><span class="s2-chest-box"><span class="s2-chest-lock"></span></span>' +
          '</button>' +
        '</div>';

      var chest = el.querySelector('.s2-chest');
      var opened = false;
      chest.addEventListener('click', function (e) {
        e.stopPropagation();
        if (opened) return;
        opened = true;
        FX.flash();
        FX.vibrate([30, 50, 80]);
        FX.sound('ding');
        chest.classList.add('is-opening');
        s2Timers.push(setTimeout(function () {
          el.classList.add('s2-open');
          renderResult(el, p);
          el.scrollTop = 0;
        }, FX.reduced ? 0 : 260));
      });

      // Тап по экрану во время раскрытия доигрывает всё мгновенно
      el.onclick = function (e) {
        if (!el.classList.contains('s2-open') || e.target.closest('[data-go]')) return;
        el.classList.add('s2-skip');
      };
    },
    leave: function (el) {
      s2Timers.forEach(clearTimeout);
      s2Timers = [];
      el.onclick = null;
    }
  });

  /* ======================================================================
     Фон #bg: звёздное небо, как на лендинге, но на 2D canvas (легче three.js
     для встроенного браузера Instagram). Не рисуем при reduced motion,
     экономии трафика и в фоновой вкладке. Наклон телефона даёт лёгкий параллакс.
     ====================================================================== */
  (function stars() {
    var cv = document.getElementById('bg');
    if (!cv || !cv.getContext) return;
    var conn = navigator.connection || {};
    if (FX.reduced || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')) return;

    var ctx = cv.getContext('2d');
    var dark = window.matchMedia('(prefers-color-scheme: dark)');
    var W, H, dpr, pts = [], tx = 0, ty = 0, px = 0, py = 0, raf = 0;

    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      for (var i = 0; i < 90; i++) {
        pts.push({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 0.7, r: 0.6 + Math.random() * 1.4, t: Math.random() * 6.28 });
      }
    }

    function frame(now) {
      raf = 0;
      if (document.hidden) return;
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      ctx.clearRect(0, 0, W, H);
      var isDark = dark.matches;
      for (var i = 0; i < pts.length; i++) {
        var s = pts[i];
        s.y -= 0.06 * s.z;                       // медленный дрейф вверх
        if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W; }
        var tw = 0.55 + 0.45 * Math.sin(now / 900 + s.t);
        var x = s.x + px * 14 * s.z, y = s.y + py * 14 * s.z;
        ctx.globalAlpha = (isDark ? 0.75 : 0.32) * tw * s.z;
        ctx.fillStyle = isDark ? '#FFFFFF' : (i % 5 === 0 ? '#8FB800' : '#3B47FF');
        ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.283); ctx.fill();
      }
      loop();
    }
    function loop() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }

    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma == null) return;
      tx = Math.max(-1, Math.min(1, e.gamma / 30));
      ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    });
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX / window.innerWidth * 2 - 1;
      ty = e.clientY / window.innerHeight * 2 - 1;
    });
    document.addEventListener('visibilitychange', loop);
    window.addEventListener('resize', size);

    // После загрузки страницы, чтобы не мешать первому экрану
    function start() { size(); loop(); }
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
  })();
})();
