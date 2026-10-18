// Шапка: серия, уровень, полоса XP. Обновляется сама по событию 'state'.
// HUD.flyXP(fromNode, 30) — «+30 XP» летит от элемента к шапке, затем начисляет XP.
// Тройной тап по логотипу шлёт событие 'demo:menu' (меню делает часть 3).
(function () {
  var streakEl = document.querySelector('#hud-streak b');
  var levelEl = document.querySelector('#hud-level b');
  var xpEl = document.getElementById('hud-xp');
  var xpText = xpEl.querySelector('b');
  var xpFill = xpEl.querySelector('.hud-xp-fill');

  // XP набегает от старого значения к новому: видно, сколько начислили (300 мс, сильный ease-out)
  var shownXP = null, xpRaf = 0;
  function countXP(to) {
    var from = shownXP == null || window.FX && FX.reduced ? to : shownXP;
    var start = performance.now();
    cancelAnimationFrame(xpRaf);
    (function tick(now) {
      var t = Math.min(1, (now - start) / 300);
      shownXP = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 4)));
      xpText.textContent = shownXP + ' XP';
      if (t < 1) xpRaf = requestAnimationFrame(tick);
    })(start);
  }

  function render(s) {
    streakEl.textContent = s.streak;
    levelEl.textContent = s.level;
    countXP(s.xp);
    xpFill.style.width = ((s.xp % State.XP_PER_LEVEL) / State.XP_PER_LEVEL * 100) + '%';
  }

  document.addEventListener('state', function (e) { render(e.detail.next); });
  render(State.get());

  window.HUD = {
    bump: function (which) {
      var node = { streak: streakEl.parentNode, level: levelEl.parentNode, xp: xpEl }[which];
      if (!node) return;
      node.classList.remove('hud-bump');
      void node.offsetWidth;
      node.classList.add('hud-bump');
    },

    flyXP: function (fromNode, amount) {
      var app = document.getElementById('app');
      var a = app.getBoundingClientRect();
      var f = fromNode.getBoundingClientRect();
      var t = xpEl.getBoundingClientRect();
      var chip = document.createElement('div');
      chip.className = 'fx-xp-chip';
      chip.textContent = '+' + amount + ' XP';
      chip.style.left = (f.left - a.left + f.width / 2) + 'px';
      chip.style.top = (f.top - a.top + f.height / 2) + 'px';
      app.appendChild(chip);
      var dx = (t.left - f.left) + t.width / 2 - f.width / 2;
      var dy = (t.top - f.top) + t.height / 2 - f.height / 2;
      return new Promise(function (done) {
        requestAnimationFrame(function () {
          chip.style.transform = 'translate(-50%, -50%) translate(' + dx + 'px,' + dy + 'px) scale(0.6)';
          chip.style.opacity = '0.2';
        });
        setTimeout(function () {
          chip.remove();
          var r = State.addXP(amount);
          HUD.bump('xp');
          done(r);
        }, FX.reduced ? 0 : 620);
      });
    }
  };

  // Тройной тап по логотипу
  var taps = [];
  document.getElementById('hud-logo').addEventListener('click', function () {
    var now = Date.now();
    taps = taps.filter(function (t) { return now - t < 600; });
    taps.push(now);
    if (taps.length >= 3) {
      taps = [];
      document.dispatchEvent(new CustomEvent('demo:menu'));
    }
  });
})();
