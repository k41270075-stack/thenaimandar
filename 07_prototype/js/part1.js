// Участник 1, часть 1: S0, S1, S2 и фон #bg.
// Анимации по скиллам web-animation-design и make-interfaces-feel-better:
// появление ease-out со стаггером ~80 мс, «вау»-моменты на пружине, только transform и opacity,
// каждый эффект пропускается тапом, при reduced motion остаётся только появление.
(function () {
  'use strict';

  var GOAL_LABEL = { ent: 'ЕНТ', sat: 'SAT', ielts: 'IELTS', unknown: 'твою цель' };
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
        '<div class="s0-progress s0-rise" style="--i:0" role="progressbar" aria-valuenow="90" aria-valuemin="0" aria-valuemax="100" aria-label="Анкета почти готова"><span></span></div>' +
        '<h1 class="h1 s0-rise" style="--i:1">Последний <em>вопрос</em>, и результат готов</h1>' +
        '<p class="lead s0-rise" style="--i:2">Ответы меняют результат. Можно попробовать разные.</p>' +
        '<div class="panel s0-rise" style="--i:3"><div class="panel-core s0-groups">';
      GROUPS.forEach(function (g) {
        h += '<div class="s0-group" role="group" aria-labelledby="s0-l-' + g.key + '"><span class="s0-label" id="s0-l-' + g.key + '">' + g.label + '</span><div class="chips">';
        g.opts.forEach(function (o) {
          h += '<button type="button" class="chip s0-chip" data-k="' + g.key + '" data-v="' + o[0] + '" aria-pressed="' + (picked[g.key] === o[0]) + '">' + o[1] + '</button>';
        });
        h += '</div></div>';
      });
      h += '</div></div>' +
        '<div class="s0-cta s0-rise" style="--i:4"><button type="button" class="btn s0-done" id="s0-done"><span>Готово</span><span class="btn-arrow"></span></button>' +
        '<p class="s0-hint" id="s0-hint" aria-live="polite"></p></div>';
      el.innerHTML = h;

      var done = el.querySelector('#s0-done');
      var hint = el.querySelector('#s0-hint');
      function sync() {
        var left = GROUPS.filter(function (g) { return !picked[g.key]; }).map(function (g) { return g.label.toLowerCase(); });
        done.disabled = left.length > 0;
        hint.textContent = left.length ? 'Осталось выбрать: ' + left.join(', ') : '';
      }
      sync();

      el.querySelectorAll('.s0-chip').forEach(function (c) {
        c.addEventListener('click', function () {
          var k = c.dataset.k;
          picked[k] = c.dataset.v;
          el.querySelectorAll('.s0-chip[data-k="' + k + '"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
          FX.sound('pop');      // первый тап заодно разблокирует звук на iPhone
          FX.vibrate(8);
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
    'Bocconi', 'Tsinghua', 'Toronto', 'Seoul', 'Charles', 'Erasmus', 'Satbayev', 'Sorbonne', 'Monash', 'Leiden', 'КазНМУ', 'Aalto', 'KAU', 'Purdue'];

  var s1Timers = [];
  Screens.register('s1', {
    enter: function (el, state) {
      var a = state.answers;
      var dots = '';
      UNIS.forEach(function (u, i) {
        // Старт на краю круга, у каждой точки своя задержка: «всасывание» в центр волной
        var ang = (i / UNIS.length) * Math.PI * 2 + (i % 3) * 0.35;
        var r = 150 + (i % 4) * 22;
        dots += '<span class="s1-dot" style="--x:' + Math.round(Math.cos(ang) * r) + 'px;--y:' + Math.round(Math.sin(ang) * r) + 'px;--d:' + (i * 40) + 'ms">' + esc(u) + '</span>';
      });
      el.innerHTML = '' +
        '<h1 class="h1 s0-rise" style="--i:0">Venti подбирает <em>вузы</em> под тебя</h1>' +
        '<div class="s1-stage" aria-hidden="true">' + dots +
          '<span class="s1-wave"></span><span class="s1-wave s1-wave-2"></span>' +
          '<span class="s1-core"><span class="s1-core-in">V</span></span><span class="s1-beam"></span></div>' +
        '<div class="s1-stats s0-rise" style="--i:1"><div><b id="s1-u">0</b><span>вузов</span></div><div><b id="s1-g">0</b><span>грантов</span></div></div>' +
        '<ul class="s1-lines" aria-live="polite">' +
          '<li style="--d:300ms">Сравниваю 1 000+ вузов</li>' +
          '<li style="--d:900ms">Ищу гранты под ' + (GOAL_LABEL[a.goal] || 'твою цель') + '</li>' +
          '<li style="--d:1500ms">Считаю шанс для ' + (GRADE_LABEL[a.grade] || 'тебя') + '</li>' +
        '</ul>' +
        '<p class="s1-skip">Нажми, чтобы пропустить</p>';

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
      return '<div class="s2-prof"><div class="s2-prof-top"><span>' + esc(pr[0]) + '</span><b>' + pr[1] + '%</b></div>' +
        '<span class="s2-bar"><i style="--w:' + (pr[1] / 100) + ';--d:' + (520 + i * 120) + 'ms"></i></span></div>';
    }).join('');
    var unis = p.unis.map(function (u, i) {
      if (u.locked) {
        return '<li class="s2-uni s2-uni-locked s2-late" style="--i:' + (i + 3) + '"><span class="s2-uni-name" aria-hidden="true">' + esc(u.name) + '</span>' +
          '<span class="s2-lock">🔒 Откроется завтра</span></li>';
      }
      return '<li class="s2-uni s2-late" style="--i:' + (i + 3) + '"><span><span class="s2-uni-name">' + esc(u.name) + '</span><span class="s2-uni-c">' + esc(u.country) + '</span></span><b>' + u.match + '%</b></li>';
    }).join('');

    el.innerHTML = '' +
      '<div class="s2-hero">' +
        '<span class="s2-rays" aria-hidden="true"></span>' +
        '<div class="s2-card" role="img" aria-label="Профессия: ' + esc(p.title) + ', совпадение ' + p.match + '%, редкость ' + esc(p.rarity) + '">' +
          '<span class="s2-shine" aria-hidden="true"></span>' +
          '<span class="s2-rarity">' + esc(p.rarity) + '</span>' +
          '<span class="s2-card-k">Твоя профессия №1</span>' +
          '<span class="s2-card-t">' + esc(p.title) + '</span>' +
          '<span class="s2-card-m"><b>' + p.match + '%</b> совпадения</span>' +
        '</div>' +
      '</div>' +
      '<section class="card s2-block s2-late" style="--i:0"><h2 class="h2">Ещё тебе подходят</h2>' + others + '</section>' +
      '<section class="card s2-block s2-late" style="--i:2"><h2 class="h2">Вузы под тебя</h2><ul class="s2-unis">' + unis + '</ul></section>' +
      '<section class="card s2-block s2-grant s2-late" style="--i:7">' + ringSvg() +
        '<div class="s2-grant-txt"><span class="s2-grant-k">Шанс на грант</span><b class="s2-grant-v" id="s2-grant" aria-live="polite">0%</b>' +
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
      FX.countUp(el.querySelector('#s2-grant'), p.grantChance, { ms: el.classList.contains('s2-skip') ? 0 : 1200, suffix: '%' });
    }, FX.reduced ? 0 : 1100));
  }

  Screens.register('s2', {
    enter: function (el, state) {
      var p = window.PROFILES[state.profileId] || window.PROFILES.it;
      el.classList.remove('s2-skip', 's2-open');
      el.innerHTML = '' +
        '<div class="s2-intro">' +
          '<h1 class="h1 s0-rise" style="--i:0">Твой результат <em>готов</em></h1>' +
          '<p class="lead s0-rise" style="--i:1">Открой свой результат</p>' +
          '<button type="button" class="s2-chest s0-rise" style="--i:2" aria-label="Открой свой результат">' +
            '<span class="s2-chest-glow"></span>' +
            '<span class="s2-spark" style="--sx:-86px;--sy:-70px;--sd:0s"></span>' +
            '<span class="s2-spark" style="--sx:82px;--sy:-52px;--sd:.7s"></span>' +
            '<span class="s2-spark" style="--sx:-70px;--sy:30px;--sd:1.3s"></span>' +
            '<span class="s2-spark" style="--sx:92px;--sy:24px;--sd:1.9s"></span>' +
            '<span class="s2-chest-lid"></span><span class="s2-chest-box"><span class="s2-chest-lock"></span></span>' +
          '</button>' +
          '<p class="s2-tap">Нажми на сундук</p>' +
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
          // Фокус на карточку: экранный диктор сразу читает результат
          var card = el.querySelector('.s2-card');
          card.setAttribute('tabindex', '-1');
          card.focus({ preventScroll: true });
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
     Фон #bg: 3D-звёзды, как на лендинге (03_landing/site/three-hero.js):
     точки летят из глубины на зрителя с перспективной проекцией, фирменные
     цвета синий, фиолетовый и лайм, плюс несколько четырёхлучевых искр как в
     знаке Ventorme. Вместо three.js обычный 2D canvas: во встроенном браузере
     Instagram это легче. Не рисуем при reduced motion, экономии трафика,
     медленной сети и в фоновой вкладке. Наклон телефона даёт параллакс.
     ====================================================================== */
  (function stars() {
    var cv = document.getElementById('bg');
    if (!cv || !cv.getContext) return;
    var conn = navigator.connection || {};
    if (FX.reduced || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')) return;

    var ctx = cv.getContext('2d');
    if (!ctx) return;
    var dark = window.matchMedia('(prefers-color-scheme: dark)');
    var W = 0, H = 0, dpr = 1, pts = [], sparks = [], tx = 0, ty = 0, px = 0, py = 0, raf = 0, last = 0;
    var COLORS_LIGHT = ['#3B47FF', '#3B47FF', '#7B5CFF', '#8FB800'];
    var COLORS_DARK = ['#FFFFFF', '#C9CDFF', '#A996FF', '#C6F432'];
    var FOCAL = 260;

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function star(far) {
      return { x: rnd(-1, 1), y: rnd(-1, 1), z: far ? rnd(0.85, 1) : rnd(0.08, 1), c: Math.floor(Math.random() * 4) };
    }

    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight;
      if (!W || !H) return;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      for (var i = 0; i < 140; i++) pts.push(star(false));
      sparks = [];
      for (var j = 0; j < 5; j++) sparks.push({ x: rnd(0.08, 0.92), y: rnd(0.12, 0.95), r: rnd(4, 8), a: rnd(0, 6.28), s: rnd(0.15, 0.4), lime: j % 2 === 0 });
    }

    // Четырёхлучевая искра, как в логотипе Ventorme
    function sparkle(x, y, r, rot) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0);
      ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
      ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0);
      ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
      ctx.fill();
      ctx.restore();
    }

    function frame(now) {
      raf = 0;
      if (document.hidden) return;
      var dt = Math.min(50, now - (last || now)); last = now;
      px += (tx - px) * 0.04; py += (ty - py) * 0.04;
      ctx.clearRect(0, 0, W, H);
      var isDark = dark.matches, cols = isDark ? COLORS_DARK : COLORS_LIGHT;
      var cx = W / 2 + px * 18, cy = H / 2 + py * 18, spread = Math.max(W, H) * 0.55;

      for (var i = 0; i < pts.length; i++) {
        var s = pts[i];
        s.z -= 0.00009 * dt;                       // медленный полёт из глубины на зрителя
        if (s.z <= 0.06) { pts[i] = s = star(true); }
        var k = FOCAL / (s.z * FOCAL * 3.2);
        var x = cx + s.x * spread * k, y = cy + s.y * spread * k;
        if (x < -10 || x > W + 10 || y < -10 || y > H + 10) { pts[i] = star(true); continue; }
        var near = 1 - s.z;                          // ближе = крупнее и ярче
        ctx.globalAlpha = (isDark ? 0.85 : 0.42) * (0.25 + near * 0.75);
        ctx.fillStyle = cols[s.c];
        ctx.beginPath(); ctx.arc(x, y, 0.4 + near * 1.9, 0, 6.283); ctx.fill();
      }

      for (var j = 0; j < sparks.length; j++) {
        var sp = sparks[j];
        sp.a += sp.s * dt / 1000;
        ctx.globalAlpha = (isDark ? 0.8 : 0.55) * (0.55 + 0.45 * Math.sin(now / 1100 + j * 1.7));
        ctx.fillStyle = sp.lime ? (isDark ? '#C6F432' : '#8FB800') : (isDark ? '#A996FF' : '#3B47FF');
        sparkle(sp.x * W + px * 30, sp.y * H + py * 30, sp.r, sp.a);
      }
      ctx.globalAlpha = 1;
      loop();
    }
    function loop() { if (!raf && !document.hidden && W) raf = requestAnimationFrame(frame); }

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
    document.addEventListener('visibilitychange', function () { last = 0; loop(); });
    window.addEventListener('resize', function () { size(); loop(); });

    // После загрузки страницы, чтобы не мешать первому экрану
    function start() { size(); loop(); }
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
  })();
})();
