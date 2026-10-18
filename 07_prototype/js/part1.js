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
      var h = '<div class="s0-l">' +
        '<div class="s0-progress s0-rise" style="--i:0" role="progressbar" aria-valuenow="90" aria-valuemin="0" aria-valuemax="100" aria-label="Анкета почти готова"><span></span></div>' +
        '<h1 class="h1 s0-rise" style="--i:1">Последний <em>вопрос</em>, и результат готов</h1>' +
        '<p class="lead s0-rise" style="--i:2">Ответы меняют результат. Можно попробовать разные.</p>' +
        '<ul class="s0-perks s0-rise" style="--i:3"><li>Профессии, которые тебе подходят</li><li>Вузы и шанс на грант</li><li>Первый шаг за 60 секунд</li></ul>' +
        '</div><div class="s0-r">' +
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
        '<p class="s0-hint" id="s0-hint" aria-live="polite"></p></div></div>';
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
  // Вузы на кольцах радара: [название, угол по часовой от верха, кольцо 0–2]
  // Расставлены так, чтобы надписи не наезжали друг на друга и на вузы ученика (48°, 200°, 258° на среднем кольце)
  var RADAR = [['ETH', 15, 2], ['KAIST', 85, 2], ['Seoul', 130, 2], ['TUM', 175, 2], ['SDU', 225, 2], ['Toronto', 285, 2],
    ['Monash', 330, 2], ['NUS', 110, 1], ['Bocconi', 150, 1], ['Leiden', 320, 1]];
  var RX = [62, 104, 146], SWEEP = 1100, SWEEP_START = 200;

  // Радар под ширину сцены. На узком телефоне кольца сжимаются по горизонтали (--kx), чтобы крайние вузы
  // не обрезались краем. Вузы ученика ставятся первыми: если место занято центром или другим вузом,
  // берётся ближайший свободный угол на среднем или внешнем кольце. Фоновые вузы, которым места нет,
  // прячутся: они декоративные.
  function layoutRadar(stage) {
    if (!stage) return;
    var W = stage.clientWidth, H = stage.clientHeight;
    var chips = [].slice.call(stage.querySelectorAll('.s1-chip'));
    if (!W || !chips.length) return;
    var k = parseFloat(getComputedStyle(stage).getPropertyValue('--k')) || 0.92;
    var kx = Math.min(1, Math.max(0.55, (W / 2 - 44) / (RX[2] * k)));
    stage.style.setProperty('--kx', kx.toFixed(3));
    var placed = [], PAD = 3, core = 50 * k / 0.92;
    function spot(ang, ring) {
      var a = ang * Math.PI / 180;
      return { x: Math.sin(a) * RX[ring] * kx, y: -Math.cos(a) * RX[ring] * 0.72 };
    }
    function box(c, p, mine) {
      var w = c.offsetWidth * (mine ? 1.08 : 1), h = c.offsetHeight * (mine ? 1.08 : 1);
      var x = W / 2 + p.x * k, y = H / 2 + p.y * k;
      return { l: x - w / 2 - PAD, r: x + w / 2 + PAD, t: y - h / 2 - PAD, b: y + h / 2 + PAD };
    }
    function free(r) {
      if (r.l < 6 || r.r > W - 6 || r.t < 6 || r.b > H - 6) return false;
      if (r.l < W / 2 + core && r.r > W / 2 - core && r.t < H / 2 + core && r.b > H / 2 - core) return false;
      return !placed.some(function (p) { return r.l < p.r && r.r > p.l && r.t < p.b && r.b > p.t; });
    }
    function put(c, ang, ring) {
      var p = spot(ang, ring);
      c.style.setProperty('--x', Math.round(p.x) + 'px');
      c.style.setProperty('--y', Math.round(p.y) + 'px');
      c.style.setProperty('--hit', Math.round(SWEEP_START + ((ang % 360) + 360) % 360 / 360 * SWEEP) + 'ms');
    }
    chips.sort(function (a, b) { return b.classList.contains('is-mine') - a.classList.contains('is-mine'); });
    chips.forEach(function (c) {
      var mine = c.classList.contains('is-mine');
      var ang = +c.dataset.a, ring = +c.dataset.r;
      var tries = [[ang, ring]];
      if (mine) for (var d = 15; d <= 180; d += 15) tries.push([ang + d, 1], [ang - d, 1], [ang + d, 2], [ang - d, 2]);
      for (var i = 0; i < tries.length; i++) {
        var r = box(c, spot(tries[i][0], tries[i][1]), mine);
        if (free(r)) { put(c, tries[i][0], tries[i][1]); placed.push(r); return; }
      }
      if (!mine) { c.hidden = true; return; }
      // На кольцах места нет (узкий телефон): ставим вуз ученика в свободный угол сцены
      var hw = (W / 2 - c.offsetWidth * 0.54 - PAD - 9) / k, hh = (H / 2 - c.offsetHeight * 0.54 - PAD - 9) / k;
      var grid = [[1, -1], [-1, 1], [-1, -1], [1, 1], [0, -1], [0, 1], [1, -.55], [-1, .55], [-1, -.55], [1, .55]];
      for (var j = 0; j < grid.length; j++) {
        var p = { x: grid[j][0] * hw, y: grid[j][1] * hh }, rg = box(c, p, true);
        if (!free(rg)) continue;
        c.style.setProperty('--x', Math.round(p.x) + 'px');
        c.style.setProperty('--y', Math.round(p.y) + 'px');
        var deg = (Math.atan2(p.x, -p.y) * 180 / Math.PI + 360) % 360;
        c.style.setProperty('--hit', Math.round(SWEEP_START + deg / 360 * SWEEP) + 'ms');
        placed.push(rg);
        return;
      }
      put(c, ang, ring);
      placed.push(box(c, spot(ang, ring), true));
    });
  }

  var s1Timers = [];
  Screens.register('s1', {
    enter: function (el, state) {
      var a = state.answers;
      var p = window.PROFILES[state.profileId] || window.PROFILES.it;
      // Вузы ученика из профиля: их радар «находит», они остаются гореть лаймом
      var mine = p.unis.filter(function (u) { return !u.locked; }).slice(0, 3).map(function (u, i) {
        return [u.name.split(/[\s,]/)[0], [48, 200, 258][i], 1, u.match];
      });
      var chips = RADAR.concat(mine).map(function (c) {
        var ang = c[1] * Math.PI / 180, rx = RX[c[2]];
        var hit = SWEEP_START + c[1] / 360 * SWEEP;    // момент, когда луч проходит над вузом
        return '<span class="s1-chip' + (c[3] ? ' is-mine' : '') + '" data-a="' + c[1] + '" data-r="' + c[2] + '" style="--x:' + Math.round(Math.sin(ang) * rx) + 'px;--y:' + Math.round(-Math.cos(ang) * rx * 0.72) +
          'px;--hit:' + Math.round(hit) + 'ms">' + esc(c[0]) + (c[3] ? '<b>' + c[3] + '%</b>' : '') + '</span>';
      }).join('');
      el.innerHTML = '' +
        '<div class="s1-l"><h1 class="h1 s0-rise s1-title" style="--i:0">Venti подбирает <em>вузы</em> под тебя</h1>' +
        '<div class="s1-stage" aria-hidden="true">' +
          '<span class="s1-radar"><span class="s1-ring s1-ring-0"></span><span class="s1-ring s1-ring-1"></span><span class="s1-ring s1-ring-2"></span>' +
          '<span class="s1-sweep"></span></span>' +
          chips +
          '<span class="s1-wave"></span><span class="s1-wave s1-wave-2"></span>' +
          '<span class="s1-core"><span class="s1-core-in">V</span></span></div>' +
        '<div class="s1-stats s0-rise" style="--i:1"><div><b id="s1-u">0</b><span>вузов</span></div><div><b id="s1-g">0</b><span>грантов</span></div></div>' +
        '<div class="s1-prog s0-rise" style="--i:2"><div class="s1-prog-top"><span>Анализ</span><b id="s1-pct">0%</b></div><span class="s1-prog-bar"><i></i></span></div>' +
        '<ul class="s1-lines" aria-live="polite">' +
          '<li style="--d:300ms">Сравниваю 1 000+ вузов</li>' +
          '<li style="--d:900ms">Ищу гранты под ' + (GOAL_LABEL[a.goal] || 'твою цель') + '</li>' +
          '<li style="--d:1500ms">Считаю шанс для ' + (GRADE_LABEL[a.grade] || 'тебя') + '</li>' +
        '</ul>' +
        '<p class="s1-skip">Нажми, чтобы пропустить</p></div>';

      layoutRadar(el.querySelector('.s1-stage'));
      // Цифры совпадения набраны шрифтом Unbounded: после его загрузки чипы шире, раскладываем заново
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (Screens.current() === 's1') layoutRadarAgain(); });

      countFmt(el.querySelector('#s1-pct'), 100, 2300, '%');
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

  // Палитра графиков проверена validate_palette.js (скилл dataviz): база синяя, прирост лаймовый,
  // в тёмной теме свои шаги. Подписи всегда текстом, цвет не единственный носитель смысла.
  function grantWhatIf(p) {
    var total = Math.min(95, p.grantChance + p.levers.reduce(function (a, l) { return a + l[1]; }, 0));
    var segs = '<i class="s2-seg s2-seg-base" style="--w:' + p.grantChance + '" title="Сейчас: ' + p.grantChance + '%"></i>' +
      p.levers.map(function (l, i) {
        return '<i class="s2-seg s2-seg-gain" style="--w:' + l[1] + ';--d:' + (i + 1) + '" title="' + esc(l[0]) + ': +' + l[1] + '%"></i>';
      }).join('');
    return '<div class="s2-whatif">' +
      '<div class="s2-whatif-top"><span>Если подтянуть</span><b>до ' + total + '%</b></div>' +
      '<div class="s2-stack" role="img" aria-label="Сейчас ' + p.grantChance + '%, ' +
        p.levers.map(function (l) { return esc(l[0]) + ' плюс ' + l[1] + '%'; }).join(', ') + ', итого до ' + total + '%">' + segs + '</div>' +
      '<ul class="s2-legend">' +
        '<li><span class="s2-key s2-key-base"></span>Сейчас <b>' + p.grantChance + '%</b></li>' +
        p.levers.map(function (l) { return '<li><span class="s2-key s2-key-gain"></span>' + esc(l[0]) + ' <b>+' + l[1] + '%</b></li>'; }).join('') +
      '</ul></div>';
  }

  // Ширина самого длинного слова при текущем шрифте. Меряем невидимой копией без переносов в body:
  // там нет анимации карточки (scale, rotateY), а scrollWidth не видит долей пикселя.
  // После дефиса браузер переносит сам, поэтому «Врач-исследователь» — это «Врач-» и «исследователь».
  function longestWord(node) {
    var cs = getComputedStyle(node);
    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;';
    ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'fontStyle'].forEach(function (k) { probe.style[k] = cs[k]; });
    document.body.appendChild(probe);
    var max = 0;
    node.textContent.split(/\s+|(?<=-)/).forEach(function (w) {
      if (!w) return;
      probe.textContent = w;
      max = Math.max(max, probe.getBoundingClientRect().width);
    });
    probe.remove();
    return max;
  }

  // Длинное название уменьшает шрифт, пока самое длинное слово не влезет целиком (без переноса посередине)
  function fitText(node, min) {
    if (!node || !node.isConnected) return;
    node.style.fontSize = '';
    var size = parseFloat(getComputedStyle(node).fontSize);
    min = min || 17;
    while (longestWord(node) > node.clientWidth - 2 && size > min) {
      size -= 1;
      node.style.fontSize = size + 'px';
    }
  }
  window.addEventListener('resize', function () {
    fitText(document.querySelector('[data-screen="s2"] .s2-card-t'));
    if (Screens.current() === 's1') layoutRadarAgain();
  });
  function layoutRadarAgain() {
    var stage = document.querySelector('[data-screen="s1"] .s1-stage');
    if (!stage) return;
    stage.querySelectorAll('.s1-chip[hidden]').forEach(function (c) { c.hidden = false; });
    layoutRadar(stage);
  }

  function renderResult(el, p) {
    var profs = p.professions.map(function (pr, i) {
      return '<li class="s2-prof' + (i === 0 ? ' is-top' : '') + '" title="' + esc(pr[0]) + ': ' + pr[1] + '% совпадения">' +
        '<span class="s2-rank">' + (i + 1) + '</span>' +
        '<span class="s2-prof-main"><span class="s2-prof-top"><span>' + esc(pr[0]) + '</span><b>' + pr[1] + '%</b></span>' +
        '<span class="s2-bar"><i style="--w:' + (pr[1] / 100) + ';--d:' + (420 + i * 120) + 'ms"></i></span></span></li>';
    }).join('');
    var unis = p.unis.map(function (u, i) {
      if (u.locked) {
        return '<li class="s2-uni s2-uni-locked s2-late" style="--i:' + (i + 3) + '"><span class="s2-uni-name" aria-hidden="true">' + esc(u.name) + '</span>' +
          '<span class="s2-lock">' + Icon.svg('lock') + 'Откроется завтра</span></li>';
      }
      return '<li class="s2-uni s2-late" style="--i:' + (i + 3) + '" title="' + esc(u.name) + ': ' + u.match + '% совпадения">' +
        '<span class="s2-uni-txt"><span class="s2-uni-name">' + esc(u.name) + '</span><span class="s2-uni-c">' + esc(u.country) + '</span></span>' +
        '<span class="s2-uni-m"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="s2-mini-t"/><circle cx="18" cy="18" r="15" class="s2-mini-f" style="--p:' + u.match + '"/></svg><b>' + u.match + '%</b></span></li>';
    }).join('');

    el.innerHTML = '' +
      '<div class="s2-l">' +
        '<div class="s2-hero">' +
          '<span class="s2-rays" aria-hidden="true"></span>' +
          '<div class="s2-card" role="img" aria-label="Профессия: ' + esc(p.title) + ', совпадение ' + p.match + '%, редкость ' + esc(p.rarity) + '">' +
            '<span class="s2-foil" aria-hidden="true"></span><span class="s2-shine" aria-hidden="true"></span>' +
            '<span class="s2-rarity">' + esc(p.rarity) + '</span>' +
            '<span class="s2-card-k">Твоя профессия №1</span>' +
            '<span class="s2-card-t">' + esc(p.title) + '</span>' +
            '<span class="s2-card-m"><b>' + p.match + '%</b> совпадения</span>' +
          '</div>' +
        '</div>' +
        '<section class="card s2-block s2-grant s2-late" style="--i:7">' +
          '<div class="s2-grant-row"><div class="s2-ring-wrap">' + ringSvg() + '<b class="s2-grant-v" id="s2-grant" aria-live="polite">0%</b></div>' +
          '<div class="s2-grant-txt"><h2 class="h2">Шанс на грант</h2><span class="s2-grant-k">с твоими баллами сейчас</span></div></div>' +
          grantWhatIf(p) +
        '</section>' +
        '<p class="tag-example s2-late s2-tag" style="--i:8">Пример: цифры в прототипе демонстрационные</p>' +
        '<div class="s2-late s2-next" style="--i:9"><button type="button" class="btn" data-go="s3"><span>Дальше</span><span class="btn-arrow"></span></button></div>' +
      '</div>' +
      '<div class="s2-r">' +
        '<section class="card s2-block s2-late s2-profs" style="--i:0"><h2 class="h2">Профессии под тебя</h2><ol class="s2-prof-list">' + profs + '</ol></section>' +
        '<section class="card s2-block s2-late s2-unis-card" style="--i:2"><h2 class="h2">Вузы под тебя</h2><ul class="s2-unis">' + unis + '</ul></section>' +
      '</div>';

    // Длинное название профессии («Врач-исследователь») не должно вылезать за карточку:
    // уменьшаем шрифт, пока самое длинное слово не влезет. Пересчёт после загрузки шрифта и при смене ширины.
    var title = el.querySelector('.s2-card-t');
    fitText(title);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitText(title); });

    // Голографическая карта: после вылета наклоняется за мышкой, по ней бежит радужный блик
    var card = el.querySelector('.s2-card');
    var hero = el.querySelector('.s2-hero');
    card.addEventListener('animationend', function (e) {
      if (e.animationName === 's2-card-out') card.classList.add('is-live');
    });
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || FX.reduced || !card.classList.contains('is-live')) return;
      var r = card.getBoundingClientRect();
      var x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      var y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      card.style.setProperty('--rx', ((0.5 - y) * 16).toFixed(1) + 'deg');
      card.style.setProperty('--ry', ((x - 0.5) * 20).toFixed(1) + 'deg');
      card.style.setProperty('--mx', (x * 100).toFixed(0) + '%');
      card.style.setProperty('--my', (y * 100).toFixed(0) + '%');
      card.classList.add('is-hover');
    });
    hero.addEventListener('pointerleave', function () {
      card.classList.remove('is-hover');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });

    // Кольцо и счёт идут одновременно: одна длительность, одна кривая (правило парных элементов)
    var fill = el.querySelector('#s2-ring-fill');
    var C = 2 * Math.PI * 50;
    fill.style.strokeDasharray = C;
    fill.style.strokeDashoffset = C;
    s2Timers.push(setTimeout(function () {
      void fill.getBoundingClientRect();
      fill.style.strokeDashoffset = C * (1 - p.grantChance / 100);
      FX.countUp(el.querySelector('#s2-grant'), p.grantChance, { ms: el.classList.contains('s2-skip') ? 0 : 1200, suffix: '%' });
      el.querySelector('.s2-whatif').classList.add('is-on');
    }, FX.reduced ? 0 : 1100));
  }

  Screens.register('s2', {
    enter: function (el, state) {
      var p = window.PROFILES[state.profileId] || window.PROFILES.it;
      el.classList.remove('s2-skip', 's2-open');
      // Искры, которые вылетают из сундука при открытии: у каждой свой вектор и задержка
      var burst = '';
      for (var b = 0; b < 14; b++) {
        var ang = -Math.PI / 2 + (b / 13 - 0.5) * Math.PI * 1.15;
        var dist = 110 + (b % 4) * 28;
        burst += '<span class="s2-fly" style="--dx:' + Math.round(Math.cos(ang) * dist) + 'px;--dy:' + Math.round(Math.sin(ang) * dist) +
          'px;--fd:' + (b % 5) * 30 + 'ms;--fs:' + (0.6 + (b % 3) * 0.25) + '"></span>';
      }
      el.innerHTML = '' +
        '<div class="s2-intro">' +
          '<h1 class="h1 s0-rise" style="--i:0">Твой результат <em>готов</em></h1>' +
          '<p class="lead s0-rise" style="--i:1">Профессия, вузы и шанс на грант уже внутри.</p>' +
          '<button type="button" class="s2-chest s0-rise" style="--i:2" aria-label="Открыть сундук с результатом">' +
            '<span class="s2-floor" aria-hidden="true"></span>' +
            '<span class="s2-burst" aria-hidden="true"><span class="s2-burst-rays"></span><span class="s2-burst-core"></span>' + burst + '</span>' +
            '<span class="s2-rig" aria-hidden="true"><span class="s2-hop"><span class="s2-box">' +
              '<span class="s2-f s2-front"></span><span class="s2-f s2-back"></span>' +
              '<span class="s2-f s2-left"></span><span class="s2-f s2-right"></span>' +
              '<span class="s2-f s2-bottom"></span><span class="s2-f s2-glow"></span>' +
              '<span class="s2-lid">' +
                '<span class="s2-f s2-lid-top"></span><span class="s2-f s2-lid-front"><span class="s2-plate"></span></span>' +
                '<span class="s2-f s2-lid-back"></span><span class="s2-f s2-lid-left"></span>' +
                '<span class="s2-f s2-lid-right"></span><span class="s2-f s2-lid-under"></span>' +
              '</span>' +
            '</span></span></span>' +
            '<span class="s2-spark" style="--sx:-104px;--sy:-78px;--sd:0s"></span>' +
            '<span class="s2-spark" style="--sx:100px;--sy:-58px;--sd:.7s"></span>' +
            '<span class="s2-spark" style="--sx:-92px;--sy:34px;--sd:1.3s"></span>' +
            '<span class="s2-spark" style="--sx:108px;--sy:26px;--sd:1.9s"></span>' +
          '</button>' +
          '<p class="s2-tap s0-rise" style="--i:3">Нажми на сундук</p>' +
        '</div>';

      var chest = el.querySelector('.s2-chest');
      var rig = el.querySelector('.s2-rig');
      var opened = false;

      // На ноутбуке сундук поворачивается за мышкой: видно, что он объёмный
      el.onpointermove = function (e) {
        if (e.pointerType !== 'mouse' || opened || FX.reduced) return;
        var r = chest.getBoundingClientRect();
        var nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
        var ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
        rig.style.setProperty('--py', (nx * 22).toFixed(1) + 'deg');
        rig.style.setProperty('--px', (-ny * 10).toFixed(1) + 'deg');
      };

      chest.addEventListener('click', function (e) {
        e.stopPropagation();
        if (opened) return;
        opened = true;
        FX.vibrate([30, 50, 80]);
        FX.sound('ding');
        // Крышка распахивается, изнутри бьёт свет и летят искры; вспышка в момент, когда свет максимальный
        chest.classList.add('is-opening');
        rig.style.removeProperty('--py');
        rig.style.removeProperty('--px');
        s2Timers.push(setTimeout(function () { FX.flash(); FX.sound('levelup'); }, FX.reduced ? 0 : 620));
        s2Timers.push(setTimeout(function () {
          el.classList.add('s2-open');
          el.onpointermove = null;
          renderResult(el, p);
          el.scrollTop = 0;
          // Фокус на карточку: экранный диктор сразу читает результат
          var card = el.querySelector('.s2-card');
          card.setAttribute('tabindex', '-1');
          card.focus({ preventScroll: true });
        }, FX.reduced ? 0 : 820));
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
      el.onpointermove = null;
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
