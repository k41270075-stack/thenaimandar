// Состояние демо: единственный источник правды для всех частей.
// Читать: State.get(). Менять: State.set({...}) или State.addXP(n).
// После каждого изменения на document летит событие 'state' с detail {prev, next}.
(function () {
  var KEY = 'vt5min-v1';
  var XP_PER_LEVEL = 100;

  var DEFAULT = {
    screen: 's0',
    answers: { grade: null, goal: null, field: null }, // goal: 'ent' | 'sat' | 'ielts' | 'unknown'; field: 'it' | 'med' | 'biz'
    profileId: null,                                   // ключ в window.PROFILES
    xp: 0,
    level: 1,
    streak: 0,
    lastActive: null,                                  // 'YYYY-MM-DD'
    plan: 12,                                          // прогресс плана поступления, %
    challenge: { correct: 0, total: 0, done: false },
    lockedUni: true,                                   // 4-й вуз под замком до «завтра»
    badge5min: false,
    notify: { tg: false, wa: false, email: false, contact: '', time: '19:00' },
    tomorrow: false                                    // показан ли экран «Завтра»
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function merge(target, patch) {
    Object.keys(patch).forEach(function (k) {
      var v = patch[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object') {
        merge(target[k], v);
      } else {
        target[k] = v;
      }
    });
    return target;
  }

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY));
      if (saved) return merge(clone(DEFAULT), saved);
    } catch (e) {}
    return clone(DEFAULT);
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function emit(prev) {
    document.dispatchEvent(new CustomEvent('state', { detail: { prev: prev, next: state } }));
  }

  var state = load();

  window.State = {
    XP_PER_LEVEL: XP_PER_LEVEL,

    get: function () { return state; },

    set: function (patch) {
      var prev = clone(state);
      merge(state, patch);
      save();
      emit(prev);
    },

    // Возвращает {levelUp: true/false, level}
    addXP: function (n) {
      var prevLevel = state.level;
      var xp = state.xp + n;
      var level = Math.floor(xp / XP_PER_LEVEL) + 1;
      this.set({ xp: xp, level: level });
      return { levelUp: level > prevLevel, level: level };
    },

    reset: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      var prev = clone(state);
      state = clone(DEFAULT);
      emit(prev);
    }
  };
})();
