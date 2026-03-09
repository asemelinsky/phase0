---
name: broadcast
description: Відправка тестового повідомлення боту — всім або конкретному chatId. Тригери: "тестове повідомлення", "розсилка", "broadcast", "надіслати боту", "test broadcast".
---

# Broadcast — Кодомандри

Скрипт: `bot/scripts/broadcast.js`
Юзери: `bot/data/users.json`

## Відправити всім

```bash
node bot/scripts/broadcast.js
```

## Відправити конкретному chatId

```bash
node bot/scripts/broadcast.js <chatId>
```

---

## Операція: запустити

1. Прочитай `bot/data/users.json` — виведи список chatId + uid
2. Запитай: **"Надіслати всім або конкретному chatId?"**
3. Виконай відповідну команду
4. Виведи підсумок: які chatId отримали повідомлення + який лінк
