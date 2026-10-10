/* Автопроверка лендинга: открывает обе версии в настоящем браузере на трёх
   размерах экрана и с тремя разными браузерами (включая встроенный браузер
   Instagram) и проверяет то, за что снимают баллы.
 *
 * Нужен один раз:
 *     npm install playwright && npx playwright install chromium
 * Запуск из корня репозитория:
 *     node 03_landing/check-landing.js
 *
 * Скриншоты кладутся в 03_landing/screenshots/ - их можно вставлять прямо
 * в презентацию (слайд "Наш лендинг").
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SITE = path.join(__dirname, "site");
const SHOTS = path.join(__dirname, "screenshots");

const UAS = {
  "обычный Chrome":
    "Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  "Instagram Android":
    "Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 Instagram 320.0.0.25.103 Android",
  "Instagram iPhone":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0.0.25.103 (iPhone12,1; iOS 17_5; ru_RU)",
};

const SIZES = [
  { w: 320, h: 568, n: "мелкий телефон 320x568" },
  { w: 360, h: 640, n: "обычный телефон 360x640" },
  { w: 390, h: 844, n: "iPhone 14 390x844" },
];

const PAGES = [
  ["RU", "index.html"],
  ["KZ", "kz/index.html"],
];

let failed = 0;
function ok(cond, msg) {
  console.log((cond ? "  ок    " : "  ПЛОХО ") + msg);
  if (!cond) failed++;
}

(async () => {
  // Сначала проверяем самое дорогое: заполнен ли номер команды. Если нет,
  // нет смысла проверять вёрстку - на странице висит красное предупреждение,
  // оно сдвигает весь первый экран, и все остальные проверки врут.
  const cfg = fs.readFileSync(path.join(SITE, "config.js"), "utf8");
  const team = (cfg.match(/TEAM:\s*"([^"]*)"/) || [])[1] || "";
  if (!/^team-\d+$/.test(team)) {
    console.error(
      "\nНЕ ЗАПОЛНЕН НОМЕР КОМАНДЫ.\n" +
      `  Сейчас в 03_landing/site/config.js: TEAM = "${team}"\n` +
      '  Нужно: TEAM: "team-17" (свой номер из списка организаторов).\n' +
      "  Ошибка в номере = регистрации уйдут другой команде.\n" +
      "  Пока номер не заполнен, остальные проверки запускать бессмысленно.\n"
    );
    process.exit(1);
  }
  console.log(`Номер команды: ${team}\n`);

  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();

  for (const size of SIZES) {
    for (const [uaName, ua] of Object.entries(UAS)) {
      for (const [lang, file] of PAGES) {
        const ctx = await browser.newContext({
          userAgent: ua,
          viewport: { width: size.w, height: size.h },
          isMobile: true,
          hasTouch: true,
          deviceScaleFactor: 2,
        });
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e)));
        page.on("console", (m) => {
          if (m.type() === "error" && !/номер команды не заполнен/.test(m.text())) {
            errors.push(m.text());
          }
        });

        await page.goto("file://" + path.join(SITE, file));
        await page.waitForTimeout(200);

        console.log(`\n[${size.n} / ${uaName} / ${lang}]`);
        ok(errors.length === 0, "нет ошибок JavaScript" + (errors.length ? ": " + errors[0] : ""));

        // Самое дорогое: куда ведёт кнопка.
        const href = await page.getAttribute('[data-cta="hero"]', "href");
        ok(
          /^https:\/\/ventorme\.ai\/register\?utm_source=hacknext&utm_campaign=team-\d+$/.test(href),
          "кнопка ведёт на ссылку команды: " + href
        );

        // Кнопка на первом экране и её размер.
        const hero = await page.locator('[data-cta="hero"]').boundingBox();
        ok(hero.y + hero.height <= size.h, `кнопка целиком в первом экране (низ ${Math.round(hero.y + hero.height)} из ${size.h})`);
        ok(hero.height >= 48, `высота кнопки ${Math.round(hero.height)}px (нужно от 48)`);

        // Мини-вопрос виден без прокрутки.
        const chips = await page.locator(".chips").boundingBox();
        ok(chips.y + chips.height < size.h, "мини-вопрос виден без прокрутки");

        // Текст читается без увеличения.
        const fs_ = await page.evaluate(() =>
          parseFloat(getComputedStyle(document.querySelector(".lead")).fontSize)
        );
        ok(fs_ >= 16, `шрифт основного текста ${fs_}px (нужно от 16)`);

        // Ничего не вылезает вбок.
        const over = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth
        );
        ok(over <= 0, "нет горизонтальной прокрутки");

        // Закреплённая кнопка появляется после прокрутки и видна.
        await page.evaluate(() => window.scrollTo(0, 1200));
        await page.waitForTimeout(300);
        const sticky = await page.locator(".sticky .btn").boundingBox();
        ok(sticky.y + sticky.height <= size.h + 1, "после прокрутки закреплённая кнопка видна");

        // Подсказка про встроенный браузер - только там, где она нужна.
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(200);
        const inapp = await page.isVisible("[data-inapp]");
        const expect = /Instagram/.test(ua);
        ok(inapp === expect, `подсказка про встроенный браузер ${inapp ? "показана" : "скрыта"} (ожидали ${expect ? "показана" : "скрыта"})`);

        if (expect && /Android/.test(ua)) {
          const esc = await page.getAttribute("[data-escape]", "href");
          ok(/^intent:\/\/.*package=com\.android\.chrome/.test(esc), "есть ссылка, открывающая Chrome");
        }

        // Мини-вопрос отвечает.
        await page.locator(".chip").nth(2).click();
        await page.waitForTimeout(150);
        const answer = (await page.textContent("[data-answer-out]")).trim();
        ok(answer.length > 20, "мини-вопрос подставляет текст");

        if (size.w === 360) {
          const tag = `${lang}-${uaName.replace(/\s+/g, "-")}`;
          await page.screenshot({ path: path.join(SHOTS, tag + ".png") });
        }
        await ctx.close();
      }
    }
  }

  await browser.close();
  console.log(
    "\n" + (failed ? `ПРОВАЛЕНО проверок: ${failed}` : "Все проверки прошли") +
    `\nСкриншоты: ${SHOTS}`
  );
  process.exit(failed ? 1 : 0);
})();
