// Полировка поверх всех частей (стили в css/polish.css): заголовки по словам, волна от нажатия,
// свечение карточек под курсором, огонь серии в шапке, искры за верный ответ, счёт процентов на S2,
// наклон карточки профессии от гироскопа. Разметку экранов не меняет, только дополняет.
(function () {
  'use strict';

  var app = document.getElementById('app');
  var screens = document.getElementById('screens');
  var reduced = window.FX && FX.reduced;
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Заголовки появляются по словам ---------- */
  function splitWords(h) {
    if (h.dataset.plSplit) return;
    h.dataset.plSplit = '1';
    var i = 0;
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { walk(n); return; }
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var w = document.createElement('span');
          w.className = 'pl-w';
          w.style.setProperty('--wi', i++);
          w.textContent = part;
          frag.appendChild(w);
        });
        n.parentNode.replaceChild(frag, n);
      });
    })(h);
  }

  /* ---------- S2: проценты набегают, кольца вузов по очереди, наклон от гироскопа ---------- */
  function countPct(b, delay) {
    var to = parseInt(b.textContent, 10);
    if (!to || reduced) return;
    b.textContent = '0%';
    setTimeout(function () { FX.countUp(b, to, { ms: 800, suffix: '%' }); }, delay);
  }
  function enhanceResult(scr) {
    if (scr.dataset.plResult) return;
    scr.dataset.plResult = '1';
    scr.querySelectorAll('.s2-prof-top b').forEach(function (b, i) { countPct(b, 1100 + i * 120); });
    scr.querySelectorAll('.s2-uni-m').forEach(function (m, i) {
      var f = m.querySelector('.s2-mini-f');
      if (f) f.style.setProperty('--pl-i', i);
      countPct(m.querySelector('b'), 900 + i * 140);
    });
  }

  function scan() {
    screens.querySelectorAll('.h1').forEach(splitWords);
    var s2 = screens.querySelector('[data-screen="s2"]');
    if (s2) {
      if (s2.querySelector('.s2-card')) enhanceResult(s2); else delete s2.dataset.plResult;
    }
  }
  if (!reduced) {
    new MutationObserver(scan).observe(screens, { childList: true, subtree: true });
    scan();
  }

  // Гироскоп: на телефоне карточка профессии наклоняется вслед за телефоном
  var base = null;
  window.addEventListener('deviceorientation', function (e) {
    if (reduced || e.beta == null) return;
    var card = document.querySelector('[data-screen="s2"].is-active .s2-card.is-live');
    if (!card || card.classList.contains('is-hover')) { base = null; return; }
    if (!base) base = { b: e.beta, g: e.gamma };
    var rx = Math.max(-10, Math.min(10, (base.b - e.beta) * 0.5));
    var ry = Math.max(-12, Math.min(12, (e.gamma - base.g) * 0.6));
    card.style.setProperty('--rx', rx.toFixed(1) + 'deg');
    card.style.setProperty('--ry', ry.toFixed(1) + 'deg');
    card.style.setProperty('--mx', (50 + ry * 4).toFixed(0) + '%');
    card.style.setProperty('--my', (50 - rx * 4).toFixed(0) + '%');
    card.classList.add('pl-gyro');
  });

  /* ---------- Волна от точки нажатия ---------- */
  document.addEventListener('pointerdown', function (e) {
    if (reduced) return;
    var t = e.target.closest('.btn, .chip, .s4-opt, .bg-opt');
    if (!t || t.disabled) return;
    var r = t.getBoundingClientRect();
    var size = Math.max(r.width, r.height) * 2.2;
    var dot = document.createElement('span');
    dot.className = 'pl-ripple';
    dot.style.setProperty('--rx', (e.clientX - r.left) + 'px');
    dot.style.setProperty('--ry', (e.clientY - r.top) + 'px');
    dot.style.setProperty('--rs', size + 'px');
    t.appendChild(dot);
    setTimeout(function () { dot.remove(); }, 600);
  }, { passive: true });

  /* ---------- Искры за верный ответ (S4) ---------- */
  var COLORS = ['#C6F432', '#3B47FF', '#7B5CFF', '#FFFFFF', '#FF8A3D'];
  function burst(node) {
    if (reduced) return;
    var a = app.getBoundingClientRect(), r = node.getBoundingClientRect();
    var b = document.createElement('span');
    b.className = 'pl-burst';
    b.style.left = (r.left - a.left + r.width / 2) + 'px';
    b.style.top = (r.top - a.top + r.height / 2) + 'px';
    var h = '';
    for (var i = 0; i < 16; i++) {
      var ang = i / 16 * Math.PI * 2 + (i % 2) * 0.2;
      var d = 60 + (i * 37) % 70;
      h += '<i style="--dx:' + Math.round(Math.cos(ang) * d * 1.6) + 'px;--dy:' + Math.round(Math.sin(ang) * d) +
        'px;--s:' + (8 + (i % 3) * 4) + 'px;--c:' + COLORS[i % COLORS.length] + ';animation-delay:' + (i % 4) * 25 + 'ms"></i>';
    }
    b.innerHTML = h;
    app.appendChild(b);
    setTimeout(function () { b.remove(); }, 900);
  }
  document.addEventListener('click', function (e) {
    var opt = e.target.closest('.s4-opt');
    if (opt && (opt.classList.contains('is-right') || opt.classList.contains('is-picked'))) burst(opt);
  });

  /* ---------- Свечение карточки и фона за курсором (ноутбук) ---------- */
  if (fine && !reduced) {
    var glow = document.createElement('span');
    glow.className = 'pl-glow';
    glow.setAttribute('aria-hidden', 'true');
    app.insertBefore(glow, screens);
    var lit = null, raf = 0, gx = 0, gy = 0;
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var a = app.getBoundingClientRect();
      gx = e.clientX - a.left; gy = e.clientY - a.top;
      if (!raf) raf = requestAnimationFrame(function () {
        raf = 0;
        glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px)';
        glow.classList.add('is-on');
      });
      var c = e.target.closest && e.target.closest('.card, .panel, .s4-card');
      if (lit && lit !== c) lit.classList.remove('pl-lit');
      lit = c;
      if (!c) return;
      var r = c.getBoundingClientRect();
      c.style.setProperty('--pl-mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--pl-my', (e.clientY - r.top) + 'px');
      c.classList.add('pl-lit');
    }, { passive: true });
    document.addEventListener('pointerleave', function () { glow.classList.remove('is-on'); });
  }

  /* ---------- Огонь серии в шапке горит, когда серия больше нуля ---------- */
  var streak = document.getElementById('hud-streak');
  function fireOn(s) { streak.classList.toggle('pl-lit', s.streak > 0); }
  document.addEventListener('state', function (e) { fireOn(e.detail.next); });
  fireOn(State.get());
})();
