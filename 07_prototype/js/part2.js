// Участник 1, часть 2: S3, S4, S5.
// Анимации по скиллам web-animation-design и make-interfaces-feel-better (см. css/part2.css).
(function () {
  'use strict';

  var GOAL_LABEL = { ent: 'ЕНТ', sat: 'SAT', ielts: 'IELTS', unknown: 'профессиям' };
  var FIELD_LABEL = { it: 'IT', med: 'медицина', biz: 'бизнес' };
  var PLAN_STEPS = ['Анкета', 'Результат', 'Первый шаг', 'Пробный тест', 'Вузы', 'Гранты', 'Документы'];
  var FEATURES = [['Профтест', 'Какие профессии тебе подходят'], ['Подбор вузов', 'Казахстан и зарубеж'], ['IELTS и SAT', 'Подготовка и пробники'],
    ['Калькулятор гранта', 'Шанс на грант по баллам ЕНТ'], ['Помощь с эссе', 'Мотивационные письма'], ['Venti', 'ИИ-помощник на любой вопрос']];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // План поступления: 7 сегментов с зазором 2px (скилл dataviz: зазор между заливками),
  // пройденные залиты, следующий обведён; одна строка «пройдено / дальше» вместо мелких подписей.
  // from задаёт, сколько сегментов было до анимации (на S5 план растёт 12% → 25%).
  function planBar(pct, from) {
    function count(v) { return Math.round(v / 100 * PLAN_STEPS.length) + 1; }   // 12% → 2 шага, 25% → 3
    var doneCount = count(pct), wasCount = count(from == null ? pct : from);
    var segs = PLAN_STEPS.map(function (st, i) {
      var cls = i < wasCount ? 'is-done' : i < doneCount ? 'is-new' : i === doneCount ? 'is-next' : '';
      return '<li class="' + cls + '" title="' + st + (i < doneCount ? ': пройдено' : '') + '" style="--k:' + (i - wasCount) + '"></li>';
    }).join('');
    var next = PLAN_STEPS[doneCount];
    return '<div class="s3-plan"><div class="s3-plan-top"><span>План поступления</span><b class="s3-plan-v">' + pct + '%</b></div>' +
      '<ol class="s3-segs" role="img" aria-label="План поступления: пройдено ' + doneCount + ' шага из ' + PLAN_STEPS.length + '">' + segs + '</ol>' +
      '<p class="s3-plan-txt">Пройдено ' + doneCount + ' из ' + PLAN_STEPS.length + (next ? '. Дальше: ' + next.toLowerCase() : '') + '</p></div>';
  }

  /* ======================================================================
     S3. Одна кнопка
     ====================================================================== */
  Screens.register('s3', {
    enter: function (el, state) {
      var goal = GOAL_LABEL[state.answers.goal] || 'твоей цели';
      el.innerHTML = '<div class="s3-l">' +
        '<h1 class="h1 s3-rise" style="--i:0">Твой первый <em>шаг</em></h1>' +
        '<p class="lead s3-rise" style="--i:1">Три вопроса по ' + goal + ' за минуту. Узнаешь свой уровень и откроешь ещё один вуз.</p>' +
        '<div class="s3-go-wrap s3-rise" style="--i:2"><button type="button" class="btn btn-lime btn-glow s3-go" data-go="s4">' +
          '<span>Первый шаг за 60 секунд</span><span class="btn-arrow"></span></button></div>' +
        '</div><div class="s3-r">' +
        '<div class="card s3-rise" style="--i:3">' + planBar(state.plan || 12) + '</div>' +
        '<details class="s3-all s3-rise" style="--i:4"><summary>Все возможности Ventorme</summary><ul>' +
          FEATURES.map(function (f) { return '<li><b>' + f[0] + '</b><span>' + f[1] + '</span></li>'; }).join('') +
        '</ul></details></div>';
      // На ноутбуке места хватает: «Все возможности» сразу раскрыты
      if (window.matchMedia('(min-width: 900px)').matches) el.querySelector('.s3-all').open = true;
    }
  });

  /* ======================================================================
     S4. Мини-вызов 60 секунд
     ====================================================================== */
  var s4 = { timers: [], tick: 0 };

  Screens.register('s4', {
    enter: function (el, state) {
      var goal = state.answers.goal || 'ent';
      var qs = (window.QUESTIONS[goal] && window.QUESTIONS[goal].length ? window.QUESTIONS[goal] : window.QUESTIONS.ent).slice(0, 3);
      var isTest = goal === 'unknown';
      var idx = 0, correct = 0, combo = 0, fields = {}, left = 60, finished = false;

      // Вызов каждый раз начинается заново: XP и счёт считаются с нуля
      State.set({ xp: 0, level: 1, challenge: { correct: 0, total: qs.length, done: false } });
      el.classList.remove('s4-hurry');

      el.innerHTML = '' +
        '<div class="s4-top s3-rise" style="--i:0">' +
          '<ol class="s4-dots" aria-hidden="true">' + qs.map(function () { return '<li></li>'; }).join('') + '</ol>' +
          '<span class="s4-count" id="s4-count">Вопрос 1 из ' + qs.length + '</span>' +
          '<span class="s4-time" id="s4-time" aria-label="Осталось 60 секунд">1:00</span></div>' +
        '<span class="s4-timer s3-rise" style="--i:0"><i id="s4-bar"></i></span>' +
        '<div class="s4-combo" id="s4-combo" aria-live="polite"></div>' +
        '<div class="s4-body" id="s4-body"></div>' +
        '<span class="s4-vignette" id="s4-vignette" aria-hidden="true"></span>';

      var body = el.querySelector('#s4-body');
      var bar = el.querySelector('#s4-bar');
      var timeEl = el.querySelector('#s4-time');
      var comboEl = el.querySelector('#s4-combo');
      var vignette = el.querySelector('#s4-vignette');
      var dots = el.querySelectorAll('.s4-dots li');

      // Полоса таймера: linear, это визуализация времени (единственное место, где скилл разрешает linear)
      void bar.offsetWidth;
      bar.style.transitionDuration = '60s';
      bar.style.transform = 'scaleX(0)';
      s4.tick = setInterval(function () {
        left--;
        timeEl.textContent = '0:' + String(Math.max(0, left)).padStart(2, '0');
        if (left % 10 === 0) timeEl.setAttribute('aria-label', 'Осталось ' + left + ' секунд');
        if (left === 10) el.classList.add('s4-hurry');
        if (left <= 0) finish();
      }, 1000);

      function render() {
        var q = qs[idx];
        el.querySelector('#s4-count').textContent = 'Вопрос ' + (idx + 1) + ' из ' + qs.length;
        dots.forEach(function (d, i) { d.classList.toggle('is-now', i === idx); });
        body.innerHTML = '<div class="s4-card" id="s4-card"><p class="s4-q" id="s4-q">' + esc(q.q) + '</p>' +
          '<div class="s4-opts" role="group" aria-labelledby="s4-q">' +
          q.options.map(function (o, i) { return '<button type="button" class="s4-opt" data-i="' + i + '" style="--i:' + i + '">' + esc(o) + '</button>'; }).join('') +
          '</div><p class="s4-why" id="s4-why" role="status" hidden></p></div>' +
          '<div class="s4-next" id="s4-next" hidden><button type="button" class="btn"><span>' + (idx < qs.length - 1 ? 'Следующий вопрос' : 'Мой результат') + '</span><span class="btn-arrow"></span></button></div>';

        body.querySelectorAll('.s4-opt').forEach(function (b) { b.addEventListener('click', function () { pick(+b.dataset.i, b); }); });
        body.querySelector('#s4-next button').addEventListener('click', function () {
          if (idx < qs.length - 1) { idx++; render(); } else finish();
        });
      }

      function pick(i, btn) {
        var q = qs[idx];
        var card = body.querySelector('#s4-card');
        var why = body.querySelector('#s4-why');
        body.querySelectorAll('.s4-opt').forEach(function (b) { b.disabled = true; });

        if (isTest) {
          btn.classList.add('is-picked');
          var f = q.fields[i];
          fields[f] = (fields[f] || 0) + 1;
          dots[idx].classList.add('is-ok');
          FX.sound('ding');
          HUD.flyXP(btn, 10);
          why.textContent = 'Ответ учтён: ' + FIELD_LABEL[f] + ' +1';
        } else if (i === q.correct) {
          btn.classList.add('is-right');
          dots[idx].classList.add('is-ok');
          correct++; combo++;
          FX.sound('ding');
          FX.vibrate(15);
          HUD.flyXP(btn, 10);
          why.textContent = 'Верно. ' + q.why;
          if (combo >= 2) showCombo();
        } else {
          btn.classList.add('is-wrong');
          body.querySelector('.s4-opt[data-i="' + q.correct + '"]').classList.add('is-right');
          dots[idx].classList.add('is-bad');
          combo = 0;
          FX.shake(card);
          FX.vibrate([40, 30, 40]);
          FX.sound('error');
          vignette.classList.remove('is-on'); void vignette.offsetWidth; vignette.classList.add('is-on');
          why.textContent = 'Правильно: ' + q.options[q.correct] + '. ' + q.why;
        }
        why.hidden = false;
        var next = body.querySelector('#s4-next');
        next.hidden = false;
        next.querySelector('button').focus({ preventScroll: true });
        next.scrollIntoView({ block: 'nearest', behavior: FX.reduced ? 'auto' : 'smooth' });
      }

      function showCombo() {
        comboEl.innerHTML = '<span>×' + combo + ' КОМБО</span>';
        comboEl.classList.remove('is-on'); void comboEl.offsetWidth; comboEl.classList.add('is-on');
      }

      function finish() {
        if (finished) return;
        finished = true;
        clearInterval(s4.tick);
        var top = null;
        if (isTest) top = Object.keys(fields).sort(function (a, b) { return fields[b] - fields[a]; })[0] || state.answers.field;
        State.set({ challenge: { correct: isTest ? qs.length : correct, total: qs.length, done: true, field: top } });
        s4.timers.push(setTimeout(function () { go('s5'); }, 250));
      }

      render();
    },
    leave: function (el) {
      clearInterval(s4.tick);
      s4.timers.forEach(clearTimeout);
      s4.timers = [];
      el.classList.remove('s4-hurry');
    }
  });

  /* ======================================================================
     Карточка для сторис (S5): картинка 1080×1920 на canvas, отправка через navigator.share
     с файлом, запасной вариант — скачать PNG. Дизайн как на слайде «Сторис = реклама».
     Реферальная ссылка ведёт в бота: t.me/VentormeAI_bot?start=ref_<код> («Тебя позвал друг»).
     ====================================================================== */
  var BOT_USERNAME = 'VentormeAI_bot';
  var SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  var DISPLAY = '"Unbounded", ' + SANS;
  var shareSheet = null;

  // Код ученика: 6 знаков без похожих букв (O/0, I/1). Живёт в State до сброса демо
  function refCode() {
    var s = State.get();
    if (s.refCode) return s.refCode;
    var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', code = '', rnd = new Uint32Array(6), i;
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(rnd);
    else for (i = 0; i < 6; i++) rnd[i] = Math.floor(Math.random() * 1e9);
    for (i = 0; i < 6; i++) code += abc[rnd[i] % abc.length];
    State.set({ refCode: code });
    return code;
  }
  function botRefLink(code) { return 'https://t.me/' + BOT_USERNAME + '?start=ref_' + code; }

  function dayWord(n) {
    var m10 = n % 10, m100 = n % 100;
    return m10 === 1 && m100 !== 11 ? 'день' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'дня' : 'дней';
  }

  // Шрифт цифр (Unbounded) должен успеть загрузиться до рисования; ждём не дольше 1,5 с
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.race([
      document.fonts.load('800 200px Unbounded', '0123456789%'),
      new Promise(function (r) { setTimeout(r, 1500); })
    ]).catch(function () {});
  }

  function rrect(x, X, Y, W, H, R) {
    x.beginPath();
    x.moveTo(X + R, Y);
    x.arcTo(X + W, Y, X + W, Y + H, R);
    x.arcTo(X + W, Y + H, X, Y + H, R);
    x.arcTo(X, Y + H, X, Y, R);
    x.arcTo(X, Y, X + W, Y, R);
    x.closePath();
  }

  function glow(x, cx, cy, r, color) {
    var g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    x.fillStyle = g;
    x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // Перенос по пробелам и дефисам («Врач-исследователь» → «Врач-» / «исследователь»)
  function wrapLines(x, text, maxW) {
    var parts = String(text).replace(/-/g, '-\u0000').split(/\s+|\u0000/).filter(Boolean);
    var lines = [], line = '';
    parts.forEach(function (w) {
      var sep = line && !/-$/.test(line) ? ' ' : '';
      if (line && x.measureText(line + sep + w).width > maxW) { lines.push(line); line = w; }
      else line += sep + w;
    });
    if (line) lines.push(line);
    return lines;
  }

  // Плашка «Уровень 2» / «Серия 1 день» с огоньком; возвращает правый край
  function pill(x, X, Y, text, icon) {
    x.font = '700 50px ' + SANS;
    var padL = icon ? 104 : 40, w = padL + x.measureText(text).width + 40, h = 100;
    rrect(x, X, Y, w, h, 50);
    x.fillStyle = 'rgba(255, 255, 255, 0.14)';
    x.fill();
    x.lineWidth = 3;
    x.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    x.stroke();
    if (icon) {
      x.save();
      x.translate(X + 32, Y + 22);
      x.scale(56 / 256, 56 / 256);
      x.fillStyle = '#FF8A3D';
      x.fill(icon);
      x.restore();
    }
    x.fillStyle = '#F4F5FF';
    x.fillText(text, X + padL, Y + 67);
    return X + w;
  }

  function firePath() {
    var m = /d="([^"]+)"/.exec(Icon.svg('fire'));
    try { return m && window.Path2D ? new Path2D(m[1]) : null; } catch (e) { return null; }
  }

  // d: { title, match, level, streak, code } → Promise<Blob> (PNG 1080×1920)
  function drawStory(d) {
    var W = 1080, H = 1920, PAD = 96, c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    var x = c.getContext('2d');

    // Фон: синий Ventorme уходит в ночной, лаймовое и фиолетовое свечение, звёзды
    var g = x.createLinearGradient(0, 0, W * 0.6, H);
    g.addColorStop(0, '#3B47FF');
    g.addColorStop(0.75, '#00033E');
    g.addColorStop(1, '#00033E');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    glow(x, 930, 380, 620, 'rgba(198, 244, 50, 0.20)');
    glow(x, 140, 1700, 760, 'rgba(123, 92, 255, 0.38)');
    var seed = 7;
    x.fillStyle = '#FFFFFF';
    for (var i = 0; i < 70; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      var sx = seed / 233280 * W;
      seed = (seed * 9301 + 49297) % 233280;
      var sy = seed / 233280 * H;
      if (sy > 560 && sy < 1720) continue;            // звёзды только сверху и снизу, не под текстом
      x.globalAlpha = 0.2 + (i % 5) * 0.12;
      x.beginPath();
      x.arc(sx, sy, 1.5 + (i % 3), 0, Math.PI * 2);
      x.fill();
    }
    x.globalAlpha = 1;

    // Верх и низ оставляем свободными: там интерфейс сторис
    x.fillStyle = '#C6F432';
    x.font = '700 64px ' + SANS;
    x.fillText('ventorme.ai', PAD, 300);

    var y = 700;
    x.fillStyle = '#C9CCF5';
    x.font = '500 60px ' + SANS;
    x.fillText('Моя профессия будущего', PAD, y);

    var size = 120, lines;
    do {
      x.font = '800 ' + size + 'px ' + SANS;
      lines = wrapLines(x, d.title, W - PAD * 2);
      size -= 6;
    } while (lines.length > 2 && size > 60);
    var two = lines.length > 1;
    x.fillStyle = '#F4F5FF';
    lines.slice(0, 2).forEach(function (l) { y += two ? 118 : 140; x.fillText(l, PAD, y); });

    y += two ? 250 : 290;
    x.fillStyle = '#C6F432';
    x.font = '800 ' + (two ? 220 : 260) + 'px ' + DISPLAY;
    x.fillText(d.match + '%', PAD - 10, y);
    y += 80;
    x.fillStyle = '#C9CCF5';
    x.font = '600 52px ' + SANS;
    x.fillText('совпадения по тесту Ventorme', PAD, y);

    y += 64;
    var right = pill(x, PAD, y, 'Уровень ' + d.level, null);
    pill(x, right + 20, y, 'Серия ' + d.streak + ' ' + dayWord(d.streak), firePath());

    var qy = Math.max(1560, y + 100 + 150);
    x.fillStyle = '#FFFFFF';
    x.font = '800 96px ' + SANS;
    x.fillText('А какая у тебя?', PAD, qy);
    x.fillStyle = '#C9CCF5';
    x.font = '600 48px ' + SANS;
    x.fillText('ventorme.ai/register?ref=' + d.code, PAD, qy + 80);

    return new Promise(function (res, rej) {
      c.toBlob(function (b) { if (b) res(b); else rej(new Error('toBlob')); }, 'image/png');
    });
  }

  function storyData(state) {
    var p = window.PROFILES[state.profileId] || window.PROFILES.it;
    return { title: p.title, match: p.match, level: state.level, streak: Math.max(1, state.streak), code: refCode() };
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) {
      var t = document.createElement('textarea');
      t.value = text;
      t.setAttribute('readonly', '');
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      t.remove();
      if (ok) res(); else rej(new Error('copy'));
    });
  }

  function closeShare(instant) {
    if (!shareSheet) return;
    var s = shareSheet;
    shareSheet = null;
    s.node.classList.add('is-out');
    setTimeout(function () {
      s.node.remove();
      URL.revokeObjectURL(s.url);
      if (!instant && s.opener && document.contains(s.opener)) s.opener.focus({ preventScroll: true });
    }, instant || FX.reduced ? 0 : 220);
  }

  // Шторка с предпросмотром: «Поделиться» (если телефон умеет делиться файлами), «Скачать», «Скопировать ссылку»
  function showShare(opener, d, blob) {
    var url = URL.createObjectURL(blob);
    var file = null;
    try { file = new File([blob], 'ventorme-' + d.code + '.png', { type: 'image/png' }); } catch (e) {}
    var canShare = false;
    try { canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) {}
    var link = botRefLink(d.code);
    var text = 'Моя профессия будущего — ' + d.title + ', ' + d.match + '% совпадения. А какая у тебя? Пройди тест за 5 минут: ' + link;

    var node = document.createElement('div');
    node.className = 's5-share';
    node.innerHTML =
      '<div class="s5-share-back"></div>' +
      '<div class="s5-share-sheet" role="dialog" aria-modal="true" aria-labelledby="s5-share-t">' +
        '<p class="s5-share-t" id="s5-share-t">Карточка для сторис</p>' +
        '<button type="button" class="s5-share-x" data-share="close" aria-label="Закрыть">×</button>' +
        '<img class="s5-share-img" src="' + url + '" width="1080" height="1920" alt="Карточка: ' + esc(d.title) + ', ' + d.match + '% совпадения">' +
        '<div class="s5-share-actions">' +
          (canShare ? '<button type="button" class="btn btn-lime" data-share="go"><span>Поделиться</span><span class="btn-arrow"></span></button>' : '') +
          '<button type="button" class="btn ' + (canShare ? 'btn-ghost' : 'btn-lime') + '" data-share="png"><span>Скачать картинку</span></button>' +
          '<button type="button" class="btn btn-ghost" data-share="copy"><span>Скопировать ссылку</span></button>' +
        '</div>' +
        '<p class="s5-share-note">Ссылка для друзей ведёт в Venti: t.me/' + BOT_USERNAME + '?start=ref_' + esc(d.code) + '</p>' +
      '</div>';
    document.getElementById('overlay-root').appendChild(node);
    shareSheet = { node: node, url: url, opener: opener };

    node.addEventListener('click', function (e) {
      if (e.target.classList.contains('s5-share-back')) { closeShare(); return; }
      var b = e.target.closest('[data-share]');
      if (!b) return;
      var what = b.getAttribute('data-share');
      if (what === 'close') closeShare();
      if (what === 'go') navigator.share({ files: [file], title: 'Ventorme', text: text }).catch(function () {});
      if (what === 'png') {
        var a = document.createElement('a');
        a.href = url;
        a.download = 'ventorme-story.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      if (what === 'copy') {
        var label = b.querySelector('span');
        copyText(link).then(function () { label.textContent = 'Ссылка скопирована'; }, function () { label.textContent = link; });
        setTimeout(function () { label.textContent = 'Скопировать ссылку'; }, 2200);
      }
    });
    node.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeShare(); return; }
      if (e.key !== 'Tab') return;
      var items = node.querySelectorAll('button');
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    node.querySelector('.s5-share-actions .btn').focus({ preventScroll: true });
  }

  function openShare(btn, state) {
    if (shareSheet || btn.disabled) return;
    var label = btn.querySelector('span');
    var was = label.textContent;
    btn.disabled = true;
    label.textContent = 'Готовлю карточку…';
    var d = storyData(state);
    fontsReady().then(function () { return drawStory(d); }).then(function (blob) {
      btn.disabled = false;
      label.textContent = was;
      if (Screens.current() === 's5') showShare(btn, d, blob);
    }, function () {
      btn.disabled = false;
      label.textContent = 'Не получилось, попробуй ещё раз';
    });
  }

  /* ======================================================================
     S5. Награда: level up, серия, замок на 4-м вузе
     ====================================================================== */
  var s5Timers = [];
  // Ребро монеты: 12 тонких дисков друг за другом дают толщину при повороте
  function coinEdge() {
    var h = '';
    for (var i = 1; i <= 12; i++) h += '<span class="s5-edge" style="--z:' + i + '"></span>';
    return h;
  }
  function levelName(c, t) {
    var r = t ? c / t : 0;
    return r === 1 ? 'сильный' : r >= 0.66 ? 'уверенный' : r > 0 ? 'базовый' : 'стартовый';
  }

  Screens.register('s5', {
    enter: function (el, state) {
      var ch = state.challenge || { correct: 0, total: 3 };
      var isTest = state.answers.goal === 'unknown';
      var p = window.PROFILES[state.profileId] || window.PROFILES.it;
      var locked = p.unis.filter(function (u) { return u.locked; })[0] || p.unis[p.unis.length - 1];
      var today = (new Date().getDay() + 6) % 7;
      var days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
      var title = isTest
        ? 'Тебе ближе всего: <em>' + (FIELD_LABEL[ch.field] || FIELD_LABEL[state.answers.field] || 'IT') + '</em>'
        : ch.correct + ' из ' + ch.total + '. Твой уровень: <em>' + levelName(ch.correct, ch.total) + '</em>';
      // Бейдж всегда доводит до следующего уровня: «после вызова уровень 2»
      var bonus = State.XP_PER_LEVEL - (state.xp % State.XP_PER_LEVEL) + 10;

      el.innerHTML = '<div class="s5-l">' +
        '<h1 class="h1 s3-rise" style="--i:0">' + title + '</h1>' +
        '<div class="card s5-streak s3-rise" style="--i:1">' +
          '<span class="s5-fire" aria-hidden="true">' + Icon.svg('fire') + '</span>' +
          '<div class="s5-streak-txt"><span class="s5-flip" aria-hidden="true"><span class="s5-flip-in"><b>0</b><b>1</b></span></span><span>день подряд</span></div>' +
          '<span class="s5-sr">Серия: 1 день подряд</span>' +
          '<ol class="s5-week" aria-hidden="true">' + days.map(function (d, i) { return '<li class="' + (i === today ? 'is-today' : '') + '">' + d + '</li>'; }).join('') + '</ol>' +
        '</div>' +
        // Мягкий тизер Pro под наградой: ничего не закрывает, первые 5 минут бесплатны
        '<div class="card s5-pro s3-rise" style="--i:2"><span class="s5-pro-ico" aria-hidden="true">' + Icon.svg('sparkle') + '</span>' +
          '<div><b>Хочешь глубже? Ventorme Pro</b><span>Полный профтест и AI Match с вузами. Всё, что ты прошёл сейчас, бесплатно.</span></div></div>' +
        '</div><div class="s5-r">' +
        '<div class="card s3-rise" style="--i:3">' + planBar(25, 12) + '</div>' +
        '<div class="card s5-locked s3-rise" style="--i:4"><span class="s5-lock" aria-hidden="true">' + Icon.svg('lock') + '</span>' +
          '<div><b class="s5-locked-name">' + esc(locked.name) + '</b><span>Откроется завтра после задания</span></div></div>' +
        '<div class="card s5-story s3-rise" style="--i:5"><div><b>Поделись результатом</b><span>Карточка для сторис со ссылкой: друзья пройдут тест по ней</span></div>' +
          '<button type="button" class="btn btn-ghost s5-story-btn"><span>Поделиться в сторис</span></button></div>' +
        '<p class="tag-example s3-rise" style="--i:6">Пример: цифры в прототипе демонстрационные</p>' +
        '<div class="s5-cta s3-rise" style="--i:7"><button type="button" class="btn s5-next" data-go="s6"><span>Не потерять серию</span><span class="btn-arrow"></span></button></div></div>' +
        // Слой level up поверх экрана
        '<div class="s5-dim" id="s5-dim" role="dialog" aria-modal="true" aria-labelledby="s5-lvl" tabindex="-1">' +
          '<div class="s5-badge-wrap"><span class="s5-badge-rays" aria-hidden="true"></span>' +
          '<div class="s5-badge" id="s5-badge"><span class="s5-coin">' + coinEdge() +
            '<span class="s5-face s5-face-back">' + Icon.svg('sparkle') + '</span>' +
            '<span class="s5-face s5-face-front"><span class="s5-badge-t">Первые 5 минут</span><span class="s5-badge-xp">+' + bonus + ' XP</span><span class="s5-glare"></span></span>' +
          '</span></div></div>' +
          '<p class="s5-lvl" id="s5-lvl">Уровень 2</p>' +
          '<p class="s5-tap">Нажми, чтобы продолжить</p>' +
        '</div>';

      State.set({ streak: 1, lastActive: new Date().toISOString().slice(0, 10), plan: 25, badge5min: true });

      var storyBtn = el.querySelector('.s5-story-btn');
      storyBtn.addEventListener('click', function () { openShare(storyBtn, State.get()); });

      var dim = el.querySelector('#s5-dim');
      dim.focus({ preventScroll: true });
      var closed = false;
      function close() {
        if (closed) return;
        closed = true;
        dim.classList.add('is-out');
        s5Timers.push(setTimeout(function () { dim.remove(); }, FX.reduced ? 0 : 260));
        function reveal() {
          if (Screens.current() !== 's5') return;
          el.classList.add('s5-go');             // запускает серию и полосу плана
          HUD.bump('streak');
          el.querySelector('.s5-next').focus({ preventScroll: true });
        }
        // Мощная сцена серии участника 2 (DEV_PLAN 3.5), если она уже есть; иначе своя анимация
        if (window.StreakFX && typeof window.StreakFX.play === 'function') window.StreakFX.play(0, 1).then(reveal, reveal);
        else reveal();
      }
      dim.addEventListener('click', close);
      dim.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); close(); }
      });

      FX.sound('levelup');
      FX.confetti();
      FX.vibrate([30, 40, 90]);
      s5Timers.push(setTimeout(function () {
        HUD.flyXP(el.querySelector('#s5-badge'), bonus).then(function (r) {
          if (r.levelUp) HUD.bump('level');
          var lvl = el.querySelector('#s5-lvl');
          if (lvl) lvl.textContent = 'Уровень ' + r.level;
        });
      }, FX.reduced ? 0 : 500));
      s5Timers.push(setTimeout(close, FX.reduced ? 900 : 2400));
    },
    leave: function (el) {
      s5Timers.forEach(clearTimeout);
      s5Timers = [];
      el.classList.remove('s5-go');
      closeShare(true);
    }
  });
})();
