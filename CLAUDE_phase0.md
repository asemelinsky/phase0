# Scratch Learning — CLAUDE.md

## Що це за проєкт
AI-платформа для навчання дітей 6–9 років програмуванню через Blockly-блоки.
AI-тьютор "Скретчик" (Claude API) дає контекстні підказки. Голос — ElevenLabs (Ярослава).
Мова інтерфейсу — українська.

## Поточна фаза
**Фаза 0, Sprint 1** — валідація продукту.
Ціль: сторінка завдання з uid, 30 JSON-завдань, система "завдання дня".
Sprint Board: https://www.notion.so/40a4258990e84e2ea9c34ffacc1fdcd1

## Технічний стек
- **Frontend:** Vanilla HTML/CSS/JS (без фреймворків — це Фаза 0)
- **Blockly:** CDN (https://unpkg.com/blockly)
- **Backend:** Node.js + Express (server.js)
- **AI:** Anthropic SDK (@anthropic-ai/sdk), модель claude-haiku-* для підказок
- **TTS:** ElevenLabs API (через node-fetch)
- **Хостинг:** Vercel
- **Змінні:** .env (ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID)

## Структура проєкту
```
phase0/
├── .claude/
│   ├── CLAUDE.md           ← цей файл
│   └── skills/
│       ├── generate-task/  ← генерація JSON завдань
│       └── validate-task/  ← валідація JSON завдань
├── .env                    ← НІКОЛИ не комітити
├── .gitignore
├── server.js               ← Express API сервер
├── package.json
├── vercel.json             ← конфіг деплою
├── app/
│   ├── index.html          ← головна сторінка (список завдань)
│   └── task.html           ← сторінка завдання (?uid=...)
├── lessons/
│   ├── lesson-engine.js    ← єдиний engine (не дублювати!)
│   ├── lesson-config.json
│   └── jumping-game/       ← структура уроку
│       ├── lesson-info.json
│       └── steps/
├── data/
│   └── tasks.json          ← всі 30 завдань
├── blocks/
│   └── SCRATCH_BLOCKS_LIBRARY.json
└── audio/                  ← кешовані MP3 (не генерувати повторно)
```

## ПРАВИЛА — завжди дотримуйся

### Критичні (ніколи не порушувати)
- НІКОЛИ не комітити .env файл
- НЕ чіпати гілку `phase0-demo` — це робочий деплой
- lesson-engine.js існує ТІЛЬКИ в `lessons/` — не дублювати в корені
- audio/*.mp3 — не видаляти, вони кешовані (платний API)

### Архітектурні
- Один server.js (не server_v2.js, не server_old.js)
- Один task.html (не index_modular, не index_with_loader)
- Всі завдання — в data/tasks.json єдиному файлі
- API endpoints мають CORS headers (вже є через cors package)

### Контент
- Мова інтерфейсу — тільки українська
- Підказки від Скретчика — дружні, для 6–9 років, без технічних термінів
- JSON завдань — валідувати перед збереженням (запусти skill validate-task)

### Модель Claude для підказок
- Використовуй claude-haiku для AI-підказок (дешевше, достатньо для простих підказок)
- Системний промпт Скретчика: "Ти дружній помічник для дітей 6–9 років..."

## Поточний стан (березень 2026)
✅ Зроблено:
- 3 тестові завдання (котик, песик, папуга) — в гілці phase0-demo
- Blockly інтеграція
- Claude API підказки
- ElevenLabs TTS
- Деплой на Vercel

🔜 В роботі (Sprint 1):
- US-1.4: task.html з параметром ?uid=abc123
- US-1.1–1.3: 30 завдань (3 рівні × 10)
- US-1.5: система "завдання дня"

## Як генерувати завдання
Використовуй skill `generate-task` — він знає правильний JSON формат і рівні складності.
Команда: опиши тип завдання → Claude генерує пачку з 10 JSON → збережи в data/tasks.json

## Vercel деплой
```bash
vercel --prod   # або push в main → автодеплой
```
vercel.json має маршрутизувати /api/* до server.js

## Типові помилки яких треба уникати
- НЕ використовуй require() для Blockly — тільки CDN в HTML
- НЕ зберігай uid у URL без localStorage fallback
- НЕ генеруй аудіо якщо файл вже є в audio/ (перевіряй перед запитом до ElevenLabs)
- НЕ хардкодь API ключі — тільки через process.env
