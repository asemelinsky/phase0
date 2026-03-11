---
name: deploy
description: Комітить зміни і пушить в master — запускає автодеплой на bajka.pp.ua через GitHub Actions. Use when: задеплой, deploy, запушити, опублікувати зміни, push.
allowed-tools: read, write, bash
---

# Skill: deploy

## Призначення
Коміт + push в `master`. Перед комітом — перевірка і синхронізація тестових URL.

---

## Крок 1 — Перевірити стан

```bash
git status
git diff --stat
```

Якщо змін немає — повідом і зупинись.

---

## Крок 2 — Синхронізувати тестові URL

### 2a. Перевірити чи з'явились нові тестові URL

Переглянь змінені файли (`git diff --name-only`). Якщо серед них є:
- `app/task.html`, `app/task.js` — можливо з'явились нові URL-параметри
- `app/progress.html` — можливо нові параметри онбордингу/warmup
- `data/tasks.json` — нові task ID (нові завдання для тестування)
- `app/animations/*.js` — нові `intro_block` localStorage-ключі

### 2b. Оновити `docs/URL-параметри та тестування.md`

Прочитай поточний файл: `docs/URL-параметри та тестування.md`

Якщо з'явились нові завдання (нові task ID в `data/tasks.json`) — додай рядки в таблицю "Завдання (task.html)":
```
| {Назва завдання} | https://phase0-five.vercel.app/app/task.html?uid=test_user&task={task_id} |
```

Якщо з'явились нові URL-параметри — додай у таблицю "Параметри URL".

Якщо з'явились нові `intro_block` localStorage-ключі — додай у розділ "Скинути стан вручну":
```js
localStorage.removeItem('intro_block_{blockId}_test_user')
```

### 2c. Оновити Notion-сторінку

Після оновлення локального файлу — синхронізувати зміни в Notion:
**Сторінка:** https://www.notion.so/31f3ed9d44bf80a29767f35ceba2c4f4

Повторити зміни з `docs/URL-параметри та тестування.md` у відповідних таблицях Notion.

---

## Крок 3 — Запустити тести

```bash
npm test
```

Якщо тести падають — **зупинись**, повідом про помилки. Не комітити з падаючими тестами.

Якщо тести пройшли — продовжуй.

---

## Крок 4 — Сформувати commit message

На основі `git diff` сформуй короткий опис змін українською або англійською.

Формат: `тип: що зроблено`

Приклади:
- `feat: intro_block animation — BLOCK_DEFS, auto-tagging`
- `fix: task.js — виправлено логіку розблокування`
- `content: tasks.json — додано дні 6-8`
- `refactor: animations — витягнуто в окремі файли`

Якщо користувач передав повідомлення як аргумент — використай його.

---

## Крок 5 — Коміт і push

```bash
git add {змінені файли — конкретно, не git add .}
git commit -m "повідомлення коміту

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```

**Важливо:** додавати файли конкретно, не `git add .` — щоб не захопити тимчасові файли.

---

## Крок 6 — Повідомити результат

- Хеш коміту
- Список закомічених файлів
- Посилання для перевірки деплою: https://github.com/search?q=phase0&type=repositories (або відомий Actions URL)
- Нагадати: деплой на Vercel займає ~30 сек
- Посилання для перевірки: https://phase0-five.vercel.app

---

## Що НЕ робити

- ❌ Не комітити `.env`, секрети, тимчасові файли
- ❌ Не використовувати `git add .` або `git add -A`
- ❌ Не форс-пушити в master
- ❌ Не пропускати hooks (`--no-verify`)
