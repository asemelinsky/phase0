# Engagement Engine — Система утримання учнів

Документ описує логіку системи пропусків, заморозки, детекції «застряг» та розумної розсилки нагадувань.

**Вихідні картки Sprint Board:**
- [Бот не надіслав вранішнє повідомлення](https://www.notion.so/31e3ed9d44bf80529547ee87aed9b226)
- [Flow «потрібна допомога»: виявити що дитина застрягла](https://www.notion.so/31d3ed9d44bf814984f6c9d4927d2f71)
- [Система утримання: 3 пропущених дні → заморозка](https://www.notion.so/31d3ed9d44bf818194dfd25af58f245b)

---

## Архітектура

```
Client (task.js)       →  POST /api/activity      →  data/user-states.json
Client (progress.html) →  GET  /api/user-state     →  data/user-states.json
Bot (bot/index.js)     →  GET  /api/user-state     →  data/user-states.json
Bot                    →  POST /api/freeze-action  →  data/user-states.json
```

---

## Стан учня (`data/user-states.json`)

```json
{
  "uid_xyz": {
    "lastActivityDate": "2026-03-11",
    "missedDays": 0,
    "frozenUntil": null,
    "frozenAt": null,
    "skippedHard": ["task_d3_e2"]
  }
}
```

| Поле | Тип | Опис |
|------|-----|------|
| `lastActivityDate` | `YYYY-MM-DD` | Дата останнього відкриття або завершення завдання |
| `missedDays` | `number` | Лічильник пропущених запланованих занять підряд |
| `frozenUntil` | `YYYY-MM-DD \| null` | До якої дати заморожено доступ |
| `frozenAt` | `YYYY-MM-DD \| null` | Коли була застосована заморозка |
| `skippedHard` | `string[]` | ID завдань, пропущених через складність |

---

## API Endpoints

### `GET /api/user-state?uid=xxx`
Повертає стан учня + розклад занять для бота і progress.html.

```json
{
  "lastActivityDate": "2026-03-10",
  "missedDays": 1,
  "frozenUntil": null,
  "frozenAt": null,
  "skippedHard": [],
  "schedule": { "days": [1, 3, 5] }
}
```
Якщо розклад не налаштовано — повертає `{ "days": [1,2,3,4,5,6,7] }` (щодня).

---

### `POST /api/activity`
Клієнт (`task.js`) звітує про дії учня.

```json
{ "uid": "...", "action": "task_open|task_done|skip_hard|stuck", "taskId": "task_d3_e1" }
```

| `action` | Що відбувається |
|----------|-----------------|
| `task_open` | `lastActivityDate = today` |
| `task_done` | `lastActivityDate = today`, `missedDays = 0`, `frozenUntil = null` (авторозморозка) |
| `skip_hard` | `skippedHard.push(taskId)` |
| `stuck` | Логується (для аналітики) |

**Ключово:** `task_done` автоматично скидає заморозку — достатньо завершити одне завдання.

---

### `POST /api/freeze-action`
Бот керує заморозкою і лічильником.

```json
{ "uid": "...", "action": "freeze|unfreeze|increment_missed", "missedDays": 2 }
```

| `action` | Що відбувається |
|----------|-----------------|
| `freeze` | `frozenUntil = today + 5 днів`, `missedDays = 3` |
| `unfreeze` | `frozenUntil = null`, `frozenAt = null`, `missedDays = 0` |
| `increment_missed` | `missedDays = <передане значення>` |

---

## Логіка пропусків і заморозки

### Що рахується пропуском
**Тільки варіант A:** учень не відкрив жодного завдання протягом запланованого дня.
Зайшов але не завершив — **НЕ** пропуск (бо `lastActivityDate` оновлюється при `task_open`).

### Лічильник (`missedDays`)

| `missedDays` | Повідомлення бота |
|---|---|
| 0 | `⏰ Час для заняття! Твоє завдання вже чекає:` |
| 1 | `😔 Вчора ти не займався. Залишилось 2 пропуски 😉` |
| 2 | `⚠️ Увага! Вже 2 пропуски. Ще один — і доступ заморозиться на 5 днів!` |
| ≥ 3 | Заморозка: `❄️ Вибач, ти не займаєшся вже 3 заняття поспіль. Заморожую доступ на 5 днів.` |

### Логіка визначення пропуску в боті
Бот запускається щодня о 09:00. Для кожного користувача:

```
1. Чи сьогодні є в розкладі учня? → НІ: пропустити
2. Чи frozen і термін ще не вийшов? → ТАК: пропустити
3. Чи frozen і термін вийшов? → авторозморозка + повідомлення «Повертайся!» → continue
4. Чи вже займався сьогодні (lastActivityDate == today)? → ТАК: пропустити
5. Чи є lastReminderDate < today І lastActivityDate < lastReminderDate?
   → ТАК: missedDays++ (не займався після минулого нагадування)
6. Надіслати повідомлення відповідно до missedDays
7. Зберегти lastReminderDate = today
```

`lastReminderDate` зберігається в `bot/data/users.json` (поруч з chatId → uid).

---

## Заморозка в UI (`progress.html`)

Коли `frozenUntil > today`:
- Показується синій банер: `❄️ Доступ заморожено до {дата}. Щоб відновити — просто займися будь-яким відкритим завданням.`
- `currentDayIdx` обрізається до `frozenDayIdx` — нові дні не відкриваються
- Вже відкриті (на момент заморозки) та завершені дні залишаються доступними

`test_user` ігнорує заморозку (обхідний шлях для тестування).

---

## Детекція «застряг» (`task.js`)

### Тригери

| Умова | Дія |
|-------|-----|
| 3 невдалих спроби підряд | `checkStuck()` |
| 8 хвилин без успіху | `checkStuck()` (таймер) |

### Поведінка `checkStuck()`
1. Скидає таймер
2. Звітує серверу: `POST /api/activity { action: 'stuck' }`
3. Показує в `hintBox`: `«Схоже, це завдання дається важко 😟 Це нормально! [⏩ Пропустити без штрафу]»`
4. Через 12 секунд повідомлення зникає (якщо завдання ще не вирішено)

### `skipHard()` — пропуск без штрафу

1. Додає `taskId` до `progress.skippedHard[]` в localStorage
2. Звітує серверу: `POST /api/activity { action: 'skip_hard' }`
3. **НЕ** інкрементує `missedDays` — пропуск через складність не карається
4. Переходить до наступного завдання (тієї ж логіки що і після успіху)

### Статус у progress.html
Пропущені через складність завдання відображаються як **⏩** (варіант A).
Розблоковують наступне завдання в ланцюжку. Можна повернутися і закрити нормально.

---

## Файли реалізації

| Файл | Що зроблено |
|------|-------------|
| `server.js` | Три нові ендпоінти: `/api/user-state`, `/api/activity`, `/api/freeze-action` |
| `data/user-states.json` | Персистентне сховище стану учнів |
| `app/task.js` | `failCount`, `stuckTimer`, `reportActivity()`, `checkStuck()`, `showStuckHelper()`, `skipHard()` |
| `app/progress.html` | Freeze banner + cap `currentDayIdx` під час заморозки |
| `bot/index.js` | Розумна `runDailyBroadcast()` з урахуванням розкладу, пропусків, заморозки |

---

## Фаза 1 (після Фаза 0)

- Перенести `user-states.json` → Supabase
- Синхронізація між пристроями
- Налаштовуваний час нагадування (зараз фіксовано 09:00)
- Inline-кнопки «Так/Ні» в Telegram при розморозці замість авторозморозки
