---
name: tts-switch
description: Перемикач режиму голосу Скретчика між test і real — локально або на Vercel. Тригери: "перемкнути голос", "tts режим", "голос тест", "голос прод", "tts switch", "переключити tts".
---

Покажи меню і запитай цифру:

```
🎙️ Голос Скретчика — оберіть режим:

  1  →  🧪 TEST  локально       (Google Translate, безкоштовно)
  2  →  🔊 REAL  локально       (ElevenLabs, платний)
  3  →  🧪 TEST  на Vercel      (Google Translate + redeploy)
  4  →  🔊 REAL  на Vercel      (ElevenLabs + redeploy)

Введіть цифру:
```

Після того як користувач написав цифру — виконай відповідну команду:

| Цифра | Команда |
|-------|---------|
| 1 | `npm run tts:test` |
| 2 | `npm run tts:real` |
| 3 | `npm run tts:test:vercel` |
| 4 | `npm run tts:real:vercel` |

Виконай через Bash в директорії `d:/aiscratch/claude/phase0`.

Після виконання покажи результат команди і нагадай:
- для 1 або 2: `⚠️ Перезапусти сервер: npm run dev`
- для 3 або 4: `🚀 Vercel деплоїть — зачекай 1–2 хвилини`

Потім покажи посилання для перевірки:

```
🔍 Перевірити що спрацювало:

  Статус режиму:   https://phase0-five.vercel.app/api/tts-status
  Тест голосу:     https://phase0-five.vercel.app/app/task.html?uid=challenge_d1_a&fabDebug
```

Поясни що шукати:
- `/api/tts-status` → має показати `"providers":["google_translate"]` для TEST або `["elevenlabs",...]` для REAL
- `?fabDebug` знімає ліміти — натисни 💡 щоб почути голос одразу
