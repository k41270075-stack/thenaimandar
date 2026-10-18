// Реферальная программа: за каждого друга, который зарегистрировался по ссылке, обоим +100 XP и 3 дня Pro.
// Приглашённый: пришёл с ?ref=<код> → на S0 баннер «Тебя позвал друг».
// Пригласивший: на S5 блок «Приглашай друзей» со ссылкой и счётчиком.
// Демо для жюри: в демо-меню кнопка «Друг зарегистрировался» начисляет награду на глазах.
(function () {
  var XP_PER_FRIEND = 100;
  var PRO_DAYS_PER_FRIEND = 3;
  var FRIEND_NAMES = ['Айдана', 'Тимур', 'Алина', 'Нурсултан', 'Дана', 'Арман'];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Код берём тот же, что на сторис-карточке (part2 кладёт его в State.refCode)
  function code() {
    var s = State.get();
    if (s.refCode) return s.refCode;
    var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', c = '';
    for (var i = 0; i < 6; i++) c += abc[Math.floor(Math.random() * abc.length)];
    State.set({ refCode: c });
    return c;
  }
  function link() { return 'ventorme.ai/register?ref=' + code(); }

  function toast(text) {
    var app = document.getElementById('app');
    var t = document.createElement('div');
    t.className = 'ref-toast';
    t.setAttribute('role', 'status');
    t.textContent = text;
    app.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('is-on'); });
    setTimeout(function () { t.classList.remove('is-on'); setTimeout(function () { t.remove(); }, 400); }, 3200);
  }

  // ---------- приглашённый ----------
  var invitedBy = (/[?&]ref=([A-Za-z0-9]{4,16})\b/.exec(location.search) || [])[1];
  if (invitedBy && !State.get().invitedBy) State.set({ invitedBy: invitedBy });

  function friendBanner(node) {
    if (!State.get().invitedBy || node.querySelector('.ref-invited')) return;
    var b = document.createElement('div');
    b.className = 'ref-invited';
    b.innerHTML = '<span class="ref-ico" aria-hidden="true">🎁</span><p><b>Тебя позвал друг.</b> Сделай первый шаг — и вы оба получите +' + XP_PER_FRIEND + ' XP и ' + PRO_DAYS_PER_FRIEND + ' дня Pro.</p>';
    node.insertBefore(b, node.firstChild);
  }

  // ---------- пригласивший ----------
  function inviteBox(node) {
    if (node.querySelector('.ref-box')) return;
    var n = State.get().refFriends || 0;
    var box = document.createElement('section');
    box.className = 'ref-box';
    box.innerHTML =
      '<div class="ref-head"><span class="ref-ico" aria-hidden="true">🤝</span><div>' +
        '<p class="ref-title">Приглашай друзей</p>' +
        '<p class="ref-sub">За каждого, кто зарегистрируется по твоей ссылке, — тебе и другу +' + XP_PER_FRIEND + ' XP и ' + PRO_DAYS_PER_FRIEND + ' дня Pro</p>' +
      '</div></div>' +
      '<div class="ref-stats">' +
        '<p><b class="ref-n">' + n + '</b><span>друзей пришло</span></p>' +
        '<p><b class="ref-xp">+' + n * XP_PER_FRIEND + '</b><span>XP получено</span></p>' +
        '<p><b class="ref-pro">' + n * PRO_DAYS_PER_FRIEND + '</b><span>дней Pro</span></p>' +
      '</div>' +
      '<button class="btn btn-ghost ref-copy" type="button"><span>Скопировать ссылку</span></button>' +
      '<p class="ref-link">' + esc(link()) + '</p>';
    // Ставим блок сразу под карточкой сторис, над главной кнопкой «дальше»
    var share = node.querySelector('.s5-share');
    var goBtn = node.querySelector('[data-go="s6"]');
    if (share) share.parentNode.insertBefore(box, share.nextSibling);
    else if (goBtn) goBtn.parentNode.insertBefore(box, goBtn);
    else node.appendChild(box);
    box.querySelector('.ref-copy').addEventListener('click', function () {
      var text = 'https://' + link();
      try { navigator.clipboard.writeText(text).then(function () { toast('Ссылка скопирована'); }, function () { toast(text); }); }
      catch (e) { toast(text); }
    });
  }

  function refreshBox() {
    var n = State.get().refFriends || 0;
    document.querySelectorAll('.ref-box').forEach(function (box) {
      box.querySelector('.ref-n').textContent = n;
      box.querySelector('.ref-xp').textContent = '+' + n * XP_PER_FRIEND;
      box.querySelector('.ref-pro').textContent = n * PRO_DAYS_PER_FRIEND;
      box.classList.remove('ref-bump'); void box.offsetWidth; box.classList.add('ref-bump');
    });
  }

  function friendJoined() {
    var n = (State.get().refFriends || 0) + 1;
    State.set({ refFriends: n });
    var name = FRIEND_NAMES[(n - 1) % FRIEND_NAMES.length];
    toast(name + ' зарегистрировался(-ась) по твоей ссылке · +' + XP_PER_FRIEND + ' XP и ' + PRO_DAYS_PER_FRIEND + ' дня Pro');
    var from = document.querySelector('.screen.is-active .ref-box') || document.getElementById('hud-logo');
    if (window.HUD && HUD.flyXP) HUD.flyXP(from, XP_PER_FRIEND); else State.addXP(XP_PER_FRIEND);
    if (window.FX) { FX.sound && FX.sound('ding'); FX.vibrate && FX.vibrate([20, 40, 60]); }
    refreshBox();
  }

  // Экраны пересобираются при каждом входе — дорисовываем блоки после enter()
  document.addEventListener('state', function (e) {
    var id = e.detail.next.screen;
    if (id === e.detail.prev.screen && id !== 's5' && id !== 's0') return;
    setTimeout(function () {
      var node = document.querySelector('[data-screen="' + id + '"]');
      if (!node) return;
      if (id === 's0') friendBanner(node);
      if (id === 's5') inviteBox(node);
    }, 60);
  });
  setTimeout(function () {
    var s0 = document.querySelector('[data-screen="s0"].is-active');
    if (s0) friendBanner(s0);
  }, 300);

  // Кнопка в демо-меню
  document.addEventListener('demo:menu', function () {
    setTimeout(function () {
      var other = document.querySelector('#overlay-root [data-demo]');
      if (!other || other.parentNode.querySelector('.ref-demo')) return;
      var b = document.createElement('button');
      b.className = 'btn btn-ghost ref-demo';
      b.type = 'button';
      b.innerHTML = '<span>Друг зарегистрировался по ссылке</span>';
      b.addEventListener('click', friendJoined);
      other.parentNode.insertBefore(b, other);
    }, 50);
  });

  window.Referral = { friendJoined: friendJoined };
})();
