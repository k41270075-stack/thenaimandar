// Общие эффекты. Свои особые эффекты каждая часть пишет в своём partN.js.
(function () {
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var audio = null;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  window.FX = {
    reduced: reduced,
    easeOutCubic: easeOutCubic,

    wait: function (ms) { return new Promise(function (r) { setTimeout(r, reduced ? 0 : ms); }); },

    // Счёт от from до to: FX.countUp(el, 34, {ms: 1200, suffix: '%'})
    countUp: function (node, to, opts) {
      opts = opts || {};
      var from = opts.from || 0, ms = reduced ? 0 : (opts.ms || 1000), suffix = opts.suffix || '';
      var start = performance.now();
      return new Promise(function (done) {
        function tick(now) {
          var t = ms ? Math.min(1, (now - start) / ms) : 1;
          node.textContent = Math.round(from + (to - from) * easeOutCubic(t)) + suffix;
          if (t < 1) requestAnimationFrame(tick); else done();
        }
        requestAnimationFrame(tick);
      });
    },

    // Конфетти: FX.confetti() — два залпа с краёв
    confetti: function (opts) {
      if (reduced || !window.confetti) return;
      var base = Object.assign({ particleCount: 70, spread: 70, startVelocity: 45, colors: ['#3B47FF', '#C6F432', '#7B5CFF', '#FF8A3D'] }, opts || {});
      window.confetti(Object.assign({}, base, { angle: 60, origin: { x: 0, y: 0.7 } }));
      window.confetti(Object.assign({}, base, { angle: 120, origin: { x: 1, y: 0.7 } }));
    },

    vibrate: function (pattern) {
      try { if (navigator.vibrate) navigator.vibrate(pattern || [20, 40, 20]); } catch (e) {}
    },

    // Короткие звуки без файлов (Web Audio). Работают только после первого тапа.
    // FX.sound('ding' | 'pop' | 'error' | 'levelup')
    sound: function (name) {
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        var notes = {
          ding: [[880, 0, 0.12], [1320, 0.08, 0.2]],
          pop: [[600, 0, 0.06]],
          error: [[220, 0, 0.15], [180, 0.1, 0.2]],
          levelup: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1046, 0.3, 0.3]]
        }[name] || [[700, 0, 0.08]];
        notes.forEach(function (n) {
          var o = audio.createOscillator(), g = audio.createGain();
          var t0 = audio.currentTime + n[1];
          o.type = 'triangle';
          o.frequency.value = n[0];
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[2]);
          o.connect(g).connect(audio.destination);
          o.start(t0);
          o.stop(t0 + n[2] + 0.02);
        });
      } catch (e) {}
    },

    // Белая вспышка на весь экран телефона
    flash: function () {
      if (reduced) return;
      var f = document.createElement('div');
      f.className = 'fx-flash';
      document.getElementById('app').appendChild(f);
      setTimeout(function () { f.remove(); }, 400);
    },

    // Тряска элемента (ошибка, сундук)
    shake: function (node) {
      if (reduced || !node) return;
      node.classList.remove('fx-shake');
      void node.offsetWidth;
      node.classList.add('fx-shake');
    }
  };
})();
