/* Логика лендинга. Язык не хардкодим: все тексты лежат в HTML, скрипт только
   подставляет ссылки, показывает нужные блоки и считает события.

   Что здесь делается и почему:
   1. Все кнопки регистрации ведут на ссылку команды (и только на неё).
   2. Определяем встроенный браузер Instagram/Facebook. В нём вход через
      Google ломается (Google блокирует OAuth в webview приложений), а через
      Google идёт 55,3% всех регистраций Ventorme (Т11). Android уводим в
      Chrome одним нажатием, iPhone - копируем ссылку и подсказываем почту.
   3. Мини-вопрос на первом экране: подставляет персональный текст.
   4. Считаем события для себя (Метрика и/или свой лог).
*/

(function () {
  "use strict";

  var C = window.VENTORME_CONFIG || {};
  var ua = navigator.userAgent || "";

  /* ------------------------------------------------- ссылка команды */

  // Обязательный формат из условий кейса. Лишние параметры сознательно НЕ
  // добавляем: организаторы считают регистрации по этой ссылке, и ломать её
  // ради своей аналитики нельзя. Какую кнопку нажали - пишем в свой лог.
  function regUrl() {
    var url = C.REGISTER_BASE +
      "?utm_source=hacknext" +
      "&utm_campaign=" + encodeURIComponent(C.TEAM);
    // Метка школы, если пришли по школьной ссылке (?school=42) - в свой лог,
    // в ссылку регистрации не подмешиваем.
    return url;
  }

  function teamOk() {
    return /^team-\d+$/.test(String(C.TEAM || ""));
  }

  /* ------------------------------------------------------ аналитика */

  var sent = {};

  function track(name, extra) {
    if (C.METRIKA_ENABLED && C.METRIKA_ID && window.ym) {
      try { window.ym(C.METRIKA_ID, "reachGoal", name); } catch (e) {}
    }
    if (C.LOG_URL) {
      var payload = {
        goal: name,
        team: C.TEAM,
        lang: document.documentElement.lang || "",
        inapp: state.inApp ? state.app : "",
        os: state.os,
        school: param("school"),
        ref: document.referrer || "",
        src: param("utm_source") || param("src") || "",
        w: window.innerWidth,
        t: Date.now()
      };
      if (extra) { for (var k in extra) payload[k] = extra[k]; }
      try {
        var body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          navigator.sendBeacon(C.LOG_URL, new Blob([body], { type: "text/plain" }));
        } else {
          fetch(C.LOG_URL, { method: "POST", body: body, mode: "no-cors", keepalive: true });
        }
      } catch (e) {}
    }
  }

  function trackOnce(name, extra) {
    if (sent[name]) return;
    sent[name] = 1;
    track(name, extra);
  }

  function param(name) {
    try {
      return new URLSearchParams(location.search).get(name) || "";
    } catch (e) { return ""; }
  }

  /* -------------------------------------- встроенный браузер и платформа */

  var state = {
    os: /Android/i.test(ua) ? "android"
      : /iPhone|iPad|iPod/i.test(ua) ? "ios"
      : "other",
    app: /Instagram/i.test(ua) ? "instagram"
      : /FBAN|FBAV|FB_IAB|FBIOS/i.test(ua) ? "facebook"
      : "",
    inApp: false
  };
  state.inApp = !!state.app;

  // Ссылка, которая открывает Chrome прямо из встроенного браузера Android.
  // На iOS такого способа нет - там только копирование ссылки и подсказка.
  function chromeIntent(url) {
    return "intent://" + url.replace(/^https?:\/\//, "") +
      "#Intent;scheme=https;package=com.android.chrome;action=android.intent.action.VIEW;end";
  }

  function setupInApp() {
    var box = document.querySelector("[data-inapp]");
    if (!box || !state.inApp) return;

    box.hidden = false;
    document.querySelectorAll("[data-inapp-os]").forEach(function (el) {
      el.hidden = el.getAttribute("data-inapp-os") !== state.os;
    });

    // Внутри Instagram/Facebook первой кнопкой делаем регистрацию по почте:
    // она работает везде, в отличие от входа через Google.
    document.querySelectorAll("[data-cta-label-inapp]").forEach(function (el) {
      setLabel(el, el.getAttribute("data-cta-label-inapp"));
    });

    var escape = document.querySelector("[data-escape]");
    if (escape && state.os === "android") {
      escape.href = chromeIntent(regUrl());
      escape.addEventListener("click", function () { track("escape_chrome"); });
    }

    var copy = document.querySelector("[data-copy]");
    if (copy) {
      copy.addEventListener("click", function () {
        var done = copy.getAttribute("data-copied") || "Скопировано";
        var text = regUrl();
        var finish = function () {
          setLabel(copy, done);
          track("copy_link");
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(finish, function () { prompt(done, text); });
        } else {
          prompt(done, text);
        }
      });
    }

    trackOnce("inapp_view", { app: state.app });
  }

  /* ----------------------------------------------------- мини-вопрос */

  function setupQuiz() {
    var chips = document.querySelectorAll("[data-answer]");
    var out = document.querySelector("[data-answer-out]");
    if (!chips.length || !out) return;

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
        chip.setAttribute("aria-pressed", "true");
        out.textContent = chip.getAttribute("data-answer");
        out.hidden = false;
        try { sessionStorage.setItem("vq", chip.getAttribute("data-value") || ""); } catch (e) {}
        trackOnce("quiz_answer", { answer: chip.getAttribute("data-value") || "" });
      });
    });
  }

  /* ------------------------------------------------------ кнопки CTA */

  function setupCta() {
    var url = regUrl();
    document.querySelectorAll("[data-cta]").forEach(function (a) {
      a.href = url;
      a.addEventListener("click", function () {
        track("cta_click", { place: a.getAttribute("data-cta") });
      });
    });

    // Защита от самой дорогой ошибки: если номер команды не заполнен,
    // кнопки не ведут в никуда, но мы это громко видим на самой странице.
    if (!teamOk()) {
      var warn = document.querySelector("[data-team-warning]");
      if (warn) warn.hidden = false;
      console.error("VENTORME: номер команды не заполнен! config.js -> TEAM");
    }
  }

  /* -------------------------------------------- родителям: отправить ребёнку */

  function setupShare() {
    var btn = document.querySelector("[data-share]");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-share-text") || "";
      var url = location.origin + location.pathname;
      track("share_click");
      if (navigator.share) {
        navigator.share({ title: "Ventorme", text: text, url: url }).catch(function () {});
      } else {
        window.open("https://wa.me/?text=" + encodeURIComponent(text + " " + url), "_blank");
      }
    });
  }

  /* ---------------------------------------------- Метрика и полоска cookie */

  function setupMetrika() {
    if (!C.METRIKA_ENABLED || !C.METRIKA_ID) return;

    var bar = document.querySelector("[data-cookie]");
    var agreed = false;
    try { agreed = localStorage.getItem("v-cookie") === "1"; } catch (e) {}

    function load() {
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://mc.yandex.ru/metrika/tag.js";
      document.head.appendChild(s);
      window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
      window.ym.l = +new Date();
      window.ym(C.METRIKA_ID, "init", { webvisor: true, clickmap: true, trackLinks: true, accurateTrackBounce: true });
    }

    if (agreed) { load(); return; }
    if (!bar) { load(); return; }

    bar.hidden = false;
    bar.querySelector("button").addEventListener("click", function () {
      try { localStorage.setItem("v-cookie", "1"); } catch (e) {}
      bar.hidden = true;
      load();
    });
  }

  /* ------------------------------------------------- вспомогательное */

  /* У кнопок текст лежит в отдельном span, рядом с ним — круг со стрелкой.
     Если писать в textContent самой кнопки, стрелка затрётся. */
  function setLabel(el, text) {
    var label = el.querySelector(".btn-label");
    if (label) label.textContent = text;
    else el.textContent = text;
  }

  /* Появление секций на прокрутке. Только transform и opacity, через
     IntersectionObserver: обработчиков скролла нет принципиально, они
     дёргают кадры во встроенном браузере Instagram. */
  function setupReveal() {
    var items = document.querySelectorAll(".reveal, .reveal-stagger");
    if (!items.length) return;

    var reduced = window.matchMedia &&
                  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------ заголовок по словам */

  /* Разбиваем заголовок на слова и прячем каждое под свою маску, чтобы при
     открытии они выезжали по очереди. Делаем это скриптом, а не руками в
     разметке: иначе текст нельзя будет просто отредактировать, а его править
     будут в последний день. Структура тегов сохраняется, выделенная часть
     остаётся выделенной. */
  function setupHeadline() {
    var h1 = document.querySelector("h1");
    if (!h1) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var n = 0;

    function walk(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      kids.forEach(function (child) {
        if (child.nodeType === 1) { walk(child); return; }
        if (child.nodeType !== 3) return;
        var parts = child.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var mask = document.createElement("span");
          mask.className = "w";
          var inner = document.createElement("i");
          inner.textContent = part;
          mask.style.setProperty("--i", n++);
          mask.appendChild(inner);
          frag.appendChild(mask);
        });
        node.replaceChild(frag, child);
      });
    }

    walk(h1);
    h1.classList.add("split-words");
    // следующий кадр, иначе браузер не заметит смену состояния
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { h1.classList.add("is-in"); });
    });
  }

  /* --------------------------------------------- 3D-наклон панели */

  /* Панель с мини-вопросом поворачивается вслед за курсором. Включаем только
     при настоящей мыши: на тач-экране наклон либо не нужен, либо дёргается.
     Значения кладём в CSS-переменные, трансформ считает браузер. */
  function setupTilt() {
    var panel = document.querySelector(".panel");
    if (!panel || !window.matchMedia) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var MAX = 6;          // градусов, дальше выглядит как аттракцион
    var frame = null;

    function apply(e) {
      frame = null;
      var box = panel.getBoundingClientRect();
      var x = (e.clientX - box.left) / box.width - 0.5;
      var y = (e.clientY - box.top) / box.height - 0.5;
      panel.style.setProperty("--ry", (x * MAX * 2).toFixed(2) + "deg");
      panel.style.setProperty("--rx", (-y * MAX * 2).toFixed(2) + "deg");
    }

    panel.addEventListener("pointermove", function (e) {
      panel.classList.add("is-tilting");
      if (frame === null) frame = requestAnimationFrame(function () { apply(e); });
    });

    panel.addEventListener("pointerleave", function () {
      panel.classList.remove("is-tilting");
      if (frame !== null) { cancelAnimationFrame(frame); frame = null; }
      panel.style.setProperty("--rx", "0deg");
      panel.style.setProperty("--ry", "0deg");
    });
  }

  /* ------------------------------------- показ закреплённой кнопки */

  function setupSticky() {
    var sticky = document.querySelector(".sticky");
    var hero = document.querySelector('[data-cta="hero"]');
    if (!sticky || !hero || !("IntersectionObserver" in window)) return;

    new IntersectionObserver(function (entries) {
      sticky.classList.toggle("is-hidden", entries[0].isIntersecting);
    }, { threshold: 0.6 }).observe(hero);
  }

  /* ------------------------------------------------------------- старт */

  function init() {
    setupCta();
    setupHeadline();
    setupReveal();
    setupTilt();
    setupSticky();
    setupInApp();
    setupQuiz();
    setupShare();
    setupMetrika();

    trackOnce("page_view");

    // Долистал ли человек дальше первого экрана: на главной Ventorme те, кто
    // не прокручивал, регистрировались в 3,6% случаев с телефона (Т6).
    var scrolled = false;
    window.addEventListener("scroll", function () {
      if (!scrolled && window.scrollY > window.innerHeight * 0.5) {
        scrolled = true;
        trackOnce("scroll_50");
      }
    }, { passive: true });

    // ?debug=1 - показать, что страница видит про браузер. Нужно во время
    // ручного теста на реальных телефонах.
    if (param("debug") === "1") {
      var d = document.querySelector("[data-debug]");
      if (d) {
        d.hidden = false;
        d.textContent = "os=" + state.os + " | inapp=" + (state.app || "нет") +
          " | team=" + C.TEAM + " | " + ua;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
