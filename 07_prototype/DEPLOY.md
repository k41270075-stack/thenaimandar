# Деплой: прототип и бот Ventorme AI на Vercel

Один проект Vercel отдаёт всё сразу:

| Что | Где | Как работает |
|---|---|---|
| Прототип S0–S7 | `index.html`, `css/`, `js/`, `data/`, `img/` | Статика, без сборки |
| Вебхук бота | `api/telegram.js` → `POST /api/telegram` | Telegram присылает сюда каждое сообщение и нажатие кнопки |
| Напоминания | `api/remind.js` → `GET /api/remind` | Vercel Cron, каждый день в 14:00 UTC (19:00 Астана) |
| Логика бота | `bot/*` | Тексты, задания, хранилище (Upstash Redis), ИИ Venti (Claude API) |

Секреты живут только в переменных окружения Vercel. В коде и в git их нет.

---

## 1. Бот в Telegram

1. Напишите [@BotFather](https://t.me/BotFather) → `/newbot`.
   Имя: `Ventorme AI`. Юзернейм должен заканчиваться на `bot`. Наш бот: [@VentormeAI_bot](https://t.me/VentormeAI_bot).
2. BotFather пришлёт **токен**. Это `TG_BOT_TOKEN`, никому его не показывайте.
3. Впишите юзернейм (без `@`) в константу `BOT_USERNAME` в начале `js/part3.js`. Туда ведёт кнопка «Подключить Venti» на S6.
4. Оформление в @BotFather (выбрать `@VentormeAI_bot`, затем вставить текст):

   `/setdescription` — видно в пустом чате до нажатия «Старт» (до 512 символов):
   ```
   Привет! Я Venti, ИИ-помощник Ventorme.

   Каждый день в 19:00 присылаю задание на 60 секунд: ЕНТ, SAT или IELTS. Отвечаю на вопросы про поступление: вузы, гранты, экзамены, эссе.

   Одно сообщение в день, отписка командой /stop.

   Нажми «Старт» 👇
   ```

   `/setabouttext` — видно в профиле бота (до 120 символов):
   ```
   ИИ-помощник Ventorme: задание на 60 секунд каждый день и ответы про поступление. ventorme.ai
   ```

   `/setuserpic` — картинка `img/ventorme-icon.png`.

   `/setcommands` — меню команд, 26 штук. Проще отправить боту `/sync_commands` после деплоя (раздел 5): он сам запишет этот список из `bot/commands.js`. Или вставить вручную:
   ```
   task - Задание дня за 60 секунд
   ent - 3 вопроса ЕНТ
   sat - 3 вопроса SAT Math
   ielts - 3 вопроса IELTS
   proftest - Профтест: какое направление тебе ближе
   tip - Совет дня
   ask - Задать вопрос Venti
   grant - Как поднять шанс на грант
   unis - Какие вузы мне подходят
   professions - Профессии под моё направление
   essay - Как написать мотивационное эссе
   week - План подготовки на неделю
   new - Начать новый диалог с Venti
   plan - Мой план поступления
   me - Мой профиль, серия и XP
   goal - Сменить цель: ЕНТ, SAT, IELTS
   field - Сменить направление
   grade - Указать класс
   remind - Включить напоминания в 19:00
   stop - Отключить напоминания
   privacy - Какие данные хранит бот
   delete - Удалить мои данные
   feedback - Написать команде Ventorme
   site - Открыть ventorme.ai
   start - Начать сначала
   help - Все команды
   ```
   Служебные команды для команды Ventorme в меню не показываются: `/demo_tomorrow`, `/stats`, `/sync_commands`.

## 2. Хранилище: Upstash Redis

Проще всего через Vercel: **Storage → Marketplace → Upstash → Redis → Create**, затем **Connect** к проекту.
Vercel сам добавит `KV_REST_API_URL` и `KV_REST_API_TOKEN`. Бот понимает и их, и `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, если базу создали прямо на upstash.com. Бесплатного тарифа хватает.

## 3. Ключ Claude API

[platform.claude.com](https://platform.claude.com) → **API Keys** → создать ключ. Это `ANTHROPIC_API_KEY`.
Пополните баланс и поставьте лимит расходов в настройках организации. В коде уже есть лимит: до 20 ИИ-ответов на ученика в день.

## 4. Проект на Vercel

1. **Add New → Project** → импортировать репозиторий.
2. **Root Directory: `07_prototype`**. Framework Preset: **Other**. Build Command и Output Directory оставить пустыми.
3. **Settings → Environment Variables** (окружение Production):

| Переменная | Значение | Обязательна |
|---|---|---|
| `TG_BOT_TOKEN` | Токен из @BotFather | Да |
| `TG_WEBHOOK_SECRET` | Случайная строка: `openssl rand -hex 32` | Да |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Из Upstash (или `KV_REST_API_*` из шага 2) | Да |
| `ANTHROPIC_API_KEY` | Ключ Claude API | Без него бот работает, но на вопросы отвечает заготовкой «Venti сейчас не на связи» |
| `CRON_SECRET` | Ещё одна случайная строка: `openssl rand -hex 32` | Да, для `/api/remind` |
| `TG_ADMIN_IDS` | Telegram id команды через запятую | Для `/demo_tomorrow`, `/stats`, `/sync_commands` и чтобы получать отзывы из `/feedback` |
| `VENTI_MODEL` | По умолчанию `claude-opus-5-5`. Если важна цена: `claude-haiku-5-5` | Нет |

4. **Deploy**. Адрес проекта дальше обозначен как `https://<проект>.vercel.app`.

Если переменной не хватает, функция отвечает `503` и пишет в лог (**Deployments → Functions → Logs**), каких имён нет. Страница прототипа при этом работает.

## 5. Подключить вебхук

Выполните один раз со своего компьютера (подставьте токен, секрет и адрес):

```bash
export TG_BOT_TOKEN='...'          # из @BotFather
export TG_WEBHOOK_SECRET='...'     # то же значение, что в Vercel
export APP='https://<проект>.vercel.app'

curl -s "https://api.telegram.org/bot$TG_BOT_TOKEN/setWebhook" \
  -H 'content-type: application/json' \
  -d "{\"url\":\"$APP/api/telegram\",\"secret_token\":\"$TG_WEBHOOK_SECRET\",\"allowed_updates\":[\"message\",\"callback_query\"],\"drop_pending_updates\":true}"

# Проверка: url ваш, last_error_message пустой
curl -s "https://api.telegram.org/bot$TG_BOT_TOKEN/getWebhookInfo"
```

Меню команд: напишите боту `/sync_commands` (нужно быть в `TG_ADMIN_IDS`). Он запишет в Telegram все 26 команд из `bot/commands.js`. После любой правки списка команд — снова `/sync_commands`.

Telegram будет присылать заголовок `X-Telegram-Bot-Api-Secret-Token`. Запрос без него или с чужим секретом получит `401`.

## 6. Проверка

**Защита:**

```bash
curl -i -X POST "$APP/api/telegram" -d '{}'     # 401: нет секрета
curl -i "$APP/api/remind"                       # 401: нет CRON_SECRET
```

**Бот, с чужого телефона:**

1. Пройдите прототип до S6 и нажмите «Подключить Venti». Откроется Telegram, после «Старт» бот пишет результат: «AI-аналитик, 96% совпадения. Серия: 1 день 🔥».
2. «Задание сейчас»: 3 вопроса кнопками, после каждого правильный ответ и объяснение, в конце «2 из 3, +30 XP».
3. Напишите «Как поднять шанс на грант?», Venti отвечает за пару секунд.
4. `/stop` отвечает «Готово, больше не пишу», напоминания прекращаются.
5. `/demo_tomorrow` присылает вечернее напоминание сразу. Если вы не в `TG_ADMIN_IDS`, бот ответит вашим id: добавьте его в переменную и сделайте **Redeploy**.
6. `/help` показывает все 26 команд. Пройдитесь по ним: `/sat`, `/proftest`, `/grant`, `/me`, `/goal`, `/privacy`, `/delete`.
7. `/stats` (только команда): сколько было `/start`, заданий, вопросов Venti, отписок и отзывов сегодня и за всё время. Цифры для слайда «Данные» после теста бота на площадке.

**Напоминания (cron):** в **Settings → Cron Jobs** должна быть задача `/api/remind` с расписанием `0 14 * * *`. Vercel сам подставляет `Authorization: Bearer <CRON_SECRET>`. Ручной запуск:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" "$APP/api/remind"
# {"ok":true,"total":3,"sent":1,"skipped":2,"failed":0}
```

Кому напоминание **не** уходит: тем, кто отписался (`/stop`), подключился сегодня, уже сделал задание сегодня или уже получил напоминание сегодня. В тихие часы (22:00–08:00 по Астане) рассылка не идёт вовсе. Если ученик заблокировал бота, он отписывается автоматически. На бесплатном тарифе Vercel cron срабатывает в пределах указанного часа, то есть между 19:00 и 19:59.

## 7. Перед защитой

- [ ] Проверить номер детской линии доверия Казахстана в `bot/texts.js` (`HELPLINE`). Venti даёт его, если ученик пишет о беде.
- [ ] `BOT_USERNAME` в `js/part3.js` совпадает с юзернеймом бота.
- [ ] На телефоне спикера бот подключён заранее, `/demo_tomorrow` проверена.
- [ ] Ответ на «Как поднять шанс на грант?» приходит, баланс Claude API пополнен.
- [ ] Ссылка на прототип открывается с чужого телефона, QR-код на последнем слайде.

## Если что-то пошло не так

| Симптом | Где смотреть |
|---|---|
| Бот молчит | `getWebhookInfo` → `last_error_message`; логи функции `api/telegram` в Vercel |
| `503` | В логе перечислены недостающие переменные. После добавления нужен **Redeploy** |
| Venti отвечает «не на связи» | Нет `ANTHROPIC_API_KEY`, кончился баланс или лимит; в логе строка `[venti] …` |
| Токен утёк | @BotFather → `/revoke`, новый токен в Vercel, Redeploy, снова `setWebhook` |

Локально код проверяется так: `npm install && npm run check` (синтаксис всех функций и модулей бота).
