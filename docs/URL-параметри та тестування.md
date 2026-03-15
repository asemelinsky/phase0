# URL-параметри та тестування

## Спеціальні UID

| UID | Де | Що робить |
|-----|----|-----------|
| `test_user` | `progress.html`, `task.html` | Знімає блокування днів — всі дні і челенджі відкриті одразу, незалежно від дати реєстрації |

---

## URL-параметри

### `progress.html`

| Параметр | Приклад | Що робить |
|----------|---------|-----------|
| `uid` | `?uid=test_user` | Встановлює поточного користувача |
| `debugDay` | `?debugDay=3` | Емулює, ніби пройшло N днів з реєстрації (для перевірки розблокування) |
| `onboarding` | `?onboarding=1` | **Скидає онбординг + розігрів** — показує модал аватара/імені з нуля, потім `warmup_dialog_v2` |
| `warmup` | `?warmup=1` | **Скидає тільки розігрів** — онбординг залишається, одразу відкривається `warmup_dialog_v2` |

### `task.html`

| Параметр | Приклад | Що робить |
|----------|---------|-----------|
| `uid` | `?uid=test_user` | Встановлює поточного користувача |
| `task` | `?task=task_d1_e1` | Відкриває конкретне завдання за його ID |
| `fabDebug` | `?fabDebug` | Знімає ліміт "1 раз на день" з усіх кнопок Скретчика — факт, жарт, питання доступні необмежено |

---

## Типові URL для тестування

```
# Карта пригод — тест-юзер, всі дні відкриті
/app/progress.html?uid=test_user

# Онбординг — показати модал аватара/імені + вітання з нуля
/app/progress.html?uid=test_user&onboarding=1

# Вітання — тільки діалог учитель+учень (онбординг вже пройдено)
/app/progress.html?uid=test_user&warmup=1

# Карта пригод — емуляція 3-го дня
/app/progress.html?uid=test_user&debugDay=3

# Конкретне завдання
/app/task.html?uid=test_user&task=task_d1_e1

# Тест Скретчика — всі 4 кнопки без обмежень
/app/task.html?uid=test_user&task=task_d1_e1&fabDebug

# Профіль учня
/app/profile.html?uid=test_user

# Особистий кабінет (розклад занять)
/app/cabinet.html?uid=test_user

# Таблиця чемпіонів
/app/leaderboard.html?uid=test_user
```

---

## localStorage — ключі профілю

| Ключ | Значення | Опис |
|------|----------|------|
| `profile_${uid}` | `{"name":"Олексій","avatarId":0,"avatarEmoji":"🧑"}` | Ім'я та аватар учня |
| `onboarding_done_${uid}` | `"1"` | Флаг: онбординг пройдено. Видали — покажеться знову |
| `warmup_v2_done_${uid}` | `"1"` | Флаг: розігрів v2 (warmup_dialog_v2) показано. Видали — покажеться знову |
| `progress_${uid}` | `{"completedTasks":[],"streak":0,"stars":0}` | Прогрес учня |
| `reg_${uid}` | ISO-дата | Дата реєстрації (визначає які дні відкриті) |
| `last_uid` | рядок | Останній використаний UID |
| `schedule_${uid}` | `{"days":[1,3,5]}` | Розклад занять: масив днів тижня (1=Пн…7=Нд) |

### Скинути вручну (DevTools → Console):
```js
// Тільки онбординг (аватар/ім'я)
localStorage.removeItem('onboarding_done_test_user')

// Тільки розігрів v2
localStorage.removeItem('warmup_v2_done_test_user')

// Все з нуля
localStorage.removeItem('onboarding_done_test_user')
localStorage.removeItem('warmup_v2_done_test_user')
```

---

## Адмінпанель

### Доступ
```
/app/admin.html
```

### Функції
| Функція | Опис |
|---------|------|
| Вибір голосу TTS | Перемикання між Cartesia Sonic 3 / ElevenLabs / Google Translate |
| Тест голосу | Введи текст → натисни ▶ → чуєш поточний голос + бачиш ms |
| Зберегти на Vercel | Оновлює `TTS_1_PROVIDER` у Vercel env vars + запускає редеплой |

### Перемикання провайдерів
| Провайдер | Env var | Ціна | Затримка |
|-----------|---------|------|----------|
| `cartesia` | `TTS_1_PROVIDER=cartesia` | $15–20/1М | 40ms |
| `elevenlabs` | `TTS_1_PROVIDER=elevenlabs` | $130–220/1М | ~300ms |
| `google_translate` | `TTS_MODE=test` | Безкоштовно | ~300ms |

### Вимоги (.env)
```
VERCEL_TOKEN=...       # vercel.com/account/tokens → Create Token (Full Access)
TTS_1_KEY=...          # Cartesia API key
TTS_2_KEY=...          # ElevenLabs API key
```

### Поведінка
- **Локально**: перемикання миттєве (in-memory), скидається після рестарту сервера
- **На Vercel**: кнопка "🚀 Зберегти на Vercel" — оновлює env var + редеплой (~30 сек)
- Якщо `VERCEL_TOKEN` не вказано — кнопка деплою прихована, перемикання лише локально

---

## Аватари

| ID | Емодзі | Підпис |
|----|--------|--------|
| 0 | 🧑 | Хлопчик 1 |
| 1 | 🧒 | Хлопчик 2 |
| 2 | 👧 | Дівчинка 1 |
| 3 | 👩 | Дівчинка 2 |
