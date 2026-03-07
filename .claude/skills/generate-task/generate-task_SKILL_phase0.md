---
name: generate-task
description: Генерує JSON-завдання для платформи Кодомандри. Use when: створи завдання, згенеруй урок, додай мікроурок або челендж для дня N
allowed-tools: read, write
---

# Skill: generate-task

## Призначення
Генерація JSON-конфігурацій завдань для платформи Кодомандри.
Завдання для дітей 6–9 років. Мова — українська.

**Notion база завдань:** https://www.notion.so/97e704a90a3a405f977e3e4ce0f1b77a
**Data source ID:** `1b30f907-13ea-42bd-97b2-d39e80b03520`

---

## JSON-формат завдання (плоска Notion-схема)

```json
{
  "id": "task_d1_m1",
  "title": "День 1 — Крок вправо",
  "day": 1,
  "order_in_day": 1,
  "type": "microlesson",
  "character": "cat",
  "description": "Котик побачив яскраву зірочку і дуже захотів її дістати.",
  "hint_1": "Бачиш синій блок? Він допомагає рухатись вправо!",
  "hint_2": "Перетягни блок 'вправо' у робочу область.",
  "hint_3": "Постав один блок 'вправо' і натисни прапорець!",
  "available_blocks": ["move_right"],
  "solution": ["move_right"],
  "stars": 1,
  "unlock_condition": "immediate",
  "unlock_after_challenge_id": "",
  "attempt_limit": 0,
  "rollback_to_day": 0,
  "pencil_enabled": false,
  "startX": 50,
  "startY": 300,
  "target_type": "star",
  "target_x": 100,
  "target_y": 300,
  "obstacles": [],
  "audio_intro": "Привіт! Я котик! Допоможи мені дістатися до зірочки!",
  "audio_success": "Ура! Ти зробив це!",
  "audio_hint": "Спробуй перетягнути синій блок зі стрілкою вправо."
}
```

---

## Поля (всі обов'язкові)

| Поле | Тип | Опис |
|------|-----|------|
| `id` | string | `task_dN_mM` для мікроуроків, `challenge_dN` для челенджів |
| `title` | string | `День N — Назва` |
| `day` | number | День курсу (1–10) |
| `order_in_day` | number | Порядок у дні (1–5) |
| `type` | string | `microlesson` або `challenge` |
| `character` | string | Персонаж (cat, dog, parrot, тощо) |
| `description` | string | Короткий опис для дитини (відображається в hintBox) |
| `hint_1` | string | Загальна підказка |
| `hint_2` | string | Конкретніша підказка (показується при провалі) |
| `hint_3` | string | Майже рішення |
| `available_blocks` | array | JSON-масив блоків у Blockly-тулбоксі |
| `solution` | array | Правильне рішення (масив рядків або об'єктів) |
| `stars` | number | 1 для мікроуроків, 3 для челенджів |
| `unlock_condition` | string | `immediate` / `after_previous` / `next_day` |
| `unlock_after_challenge_id` | string | ID попереднього челенджу (або `""`) |
| `attempt_limit` | number | 0 = безліміт, 2 = для челенджів |
| `rollback_to_day` | number | На який день повертати при провалі (0 = не повертати) |
| `pencil_enabled` | boolean | `true` якщо завдання малює, `false` якщо ні |
| `startX` | number | Стартова X-координата героя (50–300) |
| `startY` | number | Стартова Y-координата героя (50–400) |
| `target_type` | string | Тип цілі (star, bone, flower, тощо) |
| `target_x` | number | X-координата цілі (100–550) |
| `target_y` | number | Y-координата цілі (50–450) |
| `obstacles` | array | Масив перешкод `[{"x":N,"y":N,"type":"fence"}]` або `[]` |
| `audio_intro` | string | TTS на початку завдання |
| `audio_success` | string | TTS при успіху |
| `audio_hint` | string | TTS-підказка |

---

## Структура курсу (10 днів × 5 завдань)

Кожен день: **4 мікроуроки + 1 челендж** (order_in_day = 5).

| Параметр | Мікроурок | Челендж |
|----------|-----------|---------|
| `type` | `microlesson` | `challenge` |
| `stars` | 1 | 3 |
| `attempt_limit` | 0 | 2 |
| `rollback_to_day` | 0 | N (поточний день) |
| `unlock_condition` | `immediate` (m1) або `after_previous` | `after_previous` |
| `hint_1/2/3` | 3 підказки | заповнити (челендж дає підказки) |

**Розблокування челенджу:** `unlock_after_challenge_id` = ID челенджу попереднього дня.
Челендж дня 1 — `unlock_after_challenge_id: ""`.

---

## Формат блоків з параметром (ВАЖЛИВО)

Прості блоки — рядок у масиві:
```json
["move_right", "move_up"]
```

Блоки з числовим параметром — об'єкт `{block, steps}`:
```json
[{"block": "move_right_steps", "steps": 3}]
```

Змішаний приклад:
```json
[{"block": "move_up_steps", "steps": 1}, {"block": "move_right_steps", "steps": 5}, {"block": "move_down_steps", "steps": 1}]
```

---

## Доступні блоки

**Базові рухи:**
`move_right`, `move_left`, `move_up`, `move_down`, `jump`

**Рухи з параметром:**
`move_right_steps`, `move_left_steps`, `move_up_steps`, `move_down_steps`
→ використовувати у форматі `{"block": "move_right_steps", "steps": N}`

**Олівець:**
`pencil_down`, `pencil_up`

**Цикли:**
`repeat_2`, `repeat_3`, `repeat_5`, `always`

**Події (Pro):**
`event_flag`, `event_click`

**Умови (Pro):**
`if_obstacle`, `if_touching_sign`, `if_near_creeper`, `if_wall`, `if_dragon_fire`, `if_wind`

**Умови-гілки (Pro):**
`if_else_safe`, `if_else_bridge_ok`

**Дії (Pro):**
`say_alert`, `repair_bridge`, `hit_hammer`, `use_water`, `strike_sword`

---

## Персонажі

`cat` → 🐱, `dog` → 🐶, `parrot` → 🦜, `snail` → 🐌, `frog` → 🐸
`rabbit` → 🐰, `robot` → 🤖, `bee` → 🐝, `turtle` → 🐢, `pixel` → 👾

**pixel** — головний герой Дня 4+ (Minecraft-сюжет).

---

## Цілі (target_type)

`star`, `bone`, `flower`, `branch`, `leaf`, `carrot`, `battery`, `fish`, `ocean`, `ribbon`, `nest`, `farm`, `beach`, `cup`, `ender_sign`, `farmer`, `chest`, `castle_gate`, `safe_zone`, `blacksmith`, `fox_byte`, `pixie`, `anvil`, `ender_dragon`, `station`

## Перешкоди (obstacles[].type)

`fence`, `rock`, `creeper_hole`, `unknown_path`, `arrow`, `fire`, `dragon_fire`, `pixel_wall`, `broken_bridge`, `wind_zone`

---

## Алгоритм генерації

1. Прочитай `data/tasks.json` — визнач останній `id` і `day`
2. Визнач день курсу і тип (мікроурок / челендж)
3. Для мікроуроків: нова концепція = +1 блок, 3 підказки, `stars: 1`
4. Для челенджу: підказки є, `stars: 3`, `attempt_limit: 2`, `rollback_to_day: N`
5. Не повторювати персонажа підряд
6. Перевір: `solution` містить тільки блоки з `available_blocks`
7. Перевір: координати в межах 600×450, крок сітки = 50px
8. Append нові завдання до `data/tasks.json` (не перезаписуй)

---

## Педагогічні правила

- Нова концепція вводиться по одній (не два нових блоки одночасно)
- hint_1 — загальна → hint_2 — конкретніша → hint_3 — майже рішення
- Аудіо-фрази: короткі, радісні, для 6–9 років
- НЕ використовувати слова: "програма", "алгоритм", "код" — тільки "команди", "кроки", "підказки"
- `pencil_enabled: true` ТІЛЬКИ якщо завдання реально використовує `pencil_down`/`pencil_up` у solution
