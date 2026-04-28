# PromptForge — генератор промптов для нейронок

## Структура проекта

```
prompt-service/
├── index.html           ← интерфейс
├── style.css            ← стили (тёмная тема)
├── app.js               ← логика + Supabase
├── api/
│   └── proxy.js         ← прокси для Gemini API
├── supabase-setup.sql   ← SQL для создания таблицы
└── README.md
```

---

## Пошаговая настройка

### 1. Supabase (база данных — бесплатно)

1. Зайди на **https://supabase.com** → Sign Up (через GitHub)
2. **New Project** → выбери имя и пароль → подожди ~2 мин
3. Перейди в **SQL Editor** (левое меню)
4. Нажми **New Query**
5. Скопируй содержимое файла `supabase-setup.sql` → вставь → нажми **Run**
6. Перейди в **Settings → API** и скопируй:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbG...`
7. Открой `app.js` и замени в первых строках:
   ```js
   const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
   ```

### 2. Gemini API (бесплатно — 1500 запросов/день)

1. Зайди на **https://aistudio.google.com**
2. **Get API Key** → **Create API key**
3. Скопируй ключ `AIza...`

### 3. GitHub

1. Создай репозиторий на **github.com**
2. Залей все файлы (index.html, style.css, app.js, api/proxy.js)
3. НЕ заливай `supabase-setup.sql` и `README.md` (не нужны на сервере)

### 4. Vercel (хостинг — бесплатно)

1. Зайди на **https://vercel.com** → войди через GitHub
2. **New Project** → выбери репозиторий
3. В **Environment Variables** добавь:
   - `GEMINI_API_KEY` = твой ключ Gemini
4. Нажми **Deploy**

Сайт будет доступен по адресу `имя-проекта.vercel.app`

---

## Как это работает

```
Пользователь                          Supabase
     │                                    │
     │── загрузка страницы ──────────────→│ SELECT * FROM templates
     │←── список шаблонов ───────────────│
     │                                    │
     │── добавить свой шаблон ───────────→│ INSERT INTO templates
     │←── ок ────────────────────────────│
     │                                    │
     │── сгенерировать промпт ──→ Vercel Proxy ──→ Gemini API
     │←── готовый промпт ────────────────│
```

---

## Стоимость

| Сервис | Стоимость |
|--------|-----------|
| Supabase | Бесплатно (500MB, 50K запросов/мес) |
| Gemini API | Бесплатно (1500 запросов/день) |
| Vercel | Бесплатно (100GB трафика/мес) |
| GitHub | Бесплатно |
| Свой домен | ~$10/год (опционально) |

---

## FAQ

**Можно добавить новую нейронку?**
Да — добавь её в массив `MODELS` в `app.js` и в CHECK constraint в SQL.

**Как удалить шаблон пользователя?**
Через Supabase Dashboard → Table Editor → templates → удали строку.

**Как ограничить добавление шаблонов?**
Убери политику "Anyone can insert" в Supabase и добавь авторизацию.

**Можно использовать Claude вместо Gemini?**
Да — замени содержимое `api/proxy.js` на версию с Anthropic API (платно, $5+ на баланс).
