// Собирает bot.html — бота для демо в одном файле: npm run build:demo
// Берёт шаблон bot/demo.html и вставляет в него код бота из bot/demo.js (вместе с handlers, faq, tasks…).
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const path = (p) => fileURLToPath(new URL(p, import.meta.url));
const stubs = path('./demo-stubs.js');

const result = await build({
  entryPoints: [path('./demo.js')],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  charset: 'utf8',
  legalComments: 'none',
  // Код бота читает переменные из process.env; в браузере это просто объект
  banner: { js: 'globalThis.process = { env: { VT_LOCAL: "1" } };' },
  alias: { '@upstash/redis': stubs, '@anthropic-ai/sdk': stubs }
});

const code = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const template = await readFile(path('./demo.html'), 'utf8');
const page = template
  .replace('<!-- Шаблон. Готовая страница — ../bot.html, собирается командой npm run build:demo -->\n',
    '<!-- Собрано из bot/demo.html и bot/demo.js командой npm run build:demo. Не править вручную. -->\n')
  .replace('<!-- BOT_BUNDLE -->', () => '<script>\n' + code + '</script>');

await writeFile(path('../bot.html'), page);
console.log(`bot.html собран: ${Math.round(page.length / 1024)} КБ`);
