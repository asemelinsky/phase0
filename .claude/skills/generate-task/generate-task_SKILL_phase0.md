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

## JSON-формат завдання (всі поля)

```json
{
  "id": "task_001",
  "day": 1,
  "order_in_day": 1,
  "type": "microlesson",
  "level": "novice",
  "title": "Котик і зірка",
  "character": "cat",
  "description": "Допоможи котику дістатися до зірки!",
  "objective": "Склади команди щоб котик пройшов до зірки",
  "pencil_enabled": "__NO__",
  "availableBlocks": ["move_right", "move_up"],
  "solution": ["move_right", "move_right"],
  "hints": [
    "Котику потрібно рухатися вправо",
    "Спробуй два кроки вправо",
    "Вправо → вправо — і він у цілі!"
  ],
  "stars": 1,
  "unlock_condition": "immediate",
  "unlock_after_challenge_id": "",
  "attempt_limit": 0,
  "rollback_to_day": 0,
  "canvas": {
    "character": "cat",
    "startX": 50,
    "startY": 200,
    "target": { "type": "star", "x": 150, "y": 200 },
    "obstacles": []
  },
  "audio": {
    "intro": "Привіт! Допоможи мені дістатися до зірочки!",
    "success": "Ура! Ти зробив це!",
    "hint": "Спробуй рухатися вправо"
  }
}
```

---

## Нові поля (обов'язково заповнювати)

| Поле | Тип | Опис |
|------|-----|------|
| `day` | number | День курсу (1–10) |
| `order_in_day` | number | Порядок у дні (1–5) |
| `type` | select | `microlesson` або `challenge` або `final` |
| `pencil_enabled` | text | `"__YES__"` якщо завдання малює, `"__NO__"` якщо ні |
| `stars` | number | 1 для мікроуроків, 3 для челенджів |
| `unlock_condition` | select | `immediate` / `after_previous` / `next_day` |
| `unlock_after_challenge_id` | text | ID челенджу-попередника (для `next_day`) |
| `attempt_limit` | number | 0 = безліміт, 2 = челендж |
| `rollback_to_day` | number | На який день повертати при провалі (0 = не повертати) |

---

## Структура курсу (10 днів × 5 завдань)

Кожен день: **4 мікроуроки + 1 челендж** (order_in_day = 5).

| Параметр | Мікроурок | Челендж |
|----------|-----------|---------|
| `type` | `microlesson` | `challenge` |
| `stars` | 1 | 3 |
| `attempt_limit` | 0 | 2 |
| `rollback_to_day` | 0 | N-1 (попередній день) |
| `unlock_condition` | `immediate` або `after_previous` | `next_day` |
| `hints` | 3 підказки | порожній масив `[]` (для дитини без підказок) |

**Розблокування челенджу:** `unlock_after_challenge_id` = ID челенджу попереднього дня.
Челендж дня 1 — `unlock_condition: "immediate"`, `unlock_after_challenge_id: ""`.

---

## Формат блоків з параметром (ВАЖЛИВО)

Прості блоки — рядок:
```json
["move_right", "pencil_down", "pencil_up"]
```

Блоки з числовим параметром — об'єкт `{block, steps}`:
```json
[{"block": "move_right_steps", "steps": 3}]
```

Змішаний приклад (намалювати лінію):
```json
["pencil_down", {"block": "move_right_steps", "steps": 4}, "pencil_up"]
```

---

## Доступні блоки

**Базові рухи:**
`move_right`, `move_left`, `move_up`, `move_down`, `jump`

**Рухи з параметром (нові):**
`move_right_steps`, `move_left_steps`, `move_up_steps`, `move_down_steps`
→ використовувати у форматі `{"block": "move_right_steps", "steps": N}`

**Олівець (нові):**
`pencil_down` — починає малювати
`pencil_up` — зупиняє малювання

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

**СТРУКТУРА solution для Pro-рівнів:**
```json
"solution": [
    "event_flag",
    [
        "always",
        [
            "move_right",
            "if_wall",
            [ "jump" ]
        ]
    ]
]
```

---

## Персонажі

`cat` → 🐱, `dog` → 🐶, `parrot` → 🦜, `snail` → 🐌, `frog` → 🐸
`rabbit` → 🐰, `robot` → 🤖, `bee` → 🐝, `turtle` → 🐢, `pixel` → 👾

**pixel** — головний герой Pro-рівнів (Minecraft-сюжет).

---

## Цілі (canvas.target.type)

`star`, `bone`, `flower`, `branch`, `leaf`, `carrot`, `battery`, `ocean`, `ribbon`, `nest`, `farm`, `beach`, `cup`, `ender_sign`, `farmer`, `chest`, `castle_gate`, `safe_zone`, `blacksmith`, `fox_byte`, `pixie`, `anvil`, `ender_dragon`, `station`

## Перешкоди (canvas.obstacles[].type)

`fence`, `rock`, `creeper_hole`, `unknown_path`, `arrow`, `fire`, `dragon_fire`, `pixel_wall`, `broken_bridge`, `wind_zone`

---

## Алгоритм генерації

1. Прочитай `data/tasks.json` — визнач останній `id` і `day`
2. Визнач день курсу і тип (мікроурок / челендж)
3. Для мікроуроків: нова концепція = +1 блок, 3 підказки, `stars: 1`
4. Для челенджу: без підказок, `stars: 3`, `attempt_limit: 2`, `rollback_to_day: N-1`
5. Не повторювати персонажа підряд
6. Перевір: `solution` містить тільки блоки з `availableBlocks`
7. Перевір: координати canvas в межах 600×450 (startX 50–300, targetX 100–550)
8. Збережи нові завдання (append до `data/tasks.json`, не перезаписуй)

---

## Педагогічні правила

- Нова концепція вводиться по одній (не два нових блоки одночасно)
- Мікроурок має 3 підказки: загальна → конкретніша → майже рішення
- Аудіо-фрази: короткі, радісні, для 6–9 років
- НЕ використовувати слова: "програма", "алгоритм", "код" — тільки "команди", "кроки", "підказки"
- `pencil_enabled: "__YES__"` ТІЛЬКИ якщо завдання реально використовує `pencil_down`/`pencil_up` у solution
