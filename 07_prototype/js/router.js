// Роутер экранов.
// Screens.register('s3', { enter: function (el, state) {...}, leave: function (el) {...} })
// go('s4') — прячет текущий экран, показывает следующий (выезжает справа за 280 мс).
(function () {
  var defs = {};
  var current = null;

  function el(id) { return document.querySelector('[data-screen="' + id + '"]'); }

  window.Screens = {
    register: function (id, def) { defs[id] = def; },
    current: function () { return current; },

    // Заглушка: экран с заголовком и кнопкой «дальше». Части заменяют её своим кодом.
    stub: function (id, title, next) {
      defs[id] = defs[id] || {
        enter: function (node) {
          node.innerHTML =
            '<div class="stub"><span class="stub-id">' + id.toUpperCase() + '</span>' +
            '<h2>' + title + '</h2><p>Заглушка. Этот экран делает другая часть.</p>' +
            (next ? '<button class="btn btn-primary" data-go="' + next + '">Дальше</button>' : '') +
            '</div>';
        }
      };
    }
  };

  window.go = function (id) {
    var next = el(id);
    if (!next || id === current) return;
    var prevId = current;
    var prev = prevId && el(prevId);

    if (prev) {
      if (defs[prevId] && defs[prevId].leave) defs[prevId].leave(prev);
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      setTimeout(function () { prev.classList.remove('is-leaving'); }, 300);
    }

    current = id;
    next.scrollTop = 0;
    if (defs[id] && defs[id].enter) defs[id].enter(next, State.get());
    // Кадр задержки, чтобы сработал переход
    requestAnimationFrame(function () { next.classList.add('is-active'); });
    State.set({ screen: id });
  };

  // Любая кнопка с data-go="sX" переводит на экран
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-go]');
    if (t) go(t.getAttribute('data-go'));
  });
})();
