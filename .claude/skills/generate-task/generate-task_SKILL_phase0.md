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

## Три режими валідації (КРИТИЧНО ВАЖЛИВО)

Перш ніж генерувати поля — визнач режим завдання:

| Режим | Коли використовувати | Умова успіху |
|-------|---------------------|--------------|
| **navigation** | звичайне переміщення до зірки | досягти `target_x/target_y` |
| **drawing_navigation** | малювати лінію до зірки (тягнути олівець до цілі) | досягти цілі + `requirePen: true` |
| **drawing_shape** | малювати фігуру (квадрат, сходинки тощо) — ціль не потрібна | коректний малюнок (drawingPattern) |

### Правила для кожного режиму

**navigation** — стандартний:
- `target_type`: будь-яка ціль
- `target_x/target_y`: обов'язкові
- `drawingPattern`: НЕ додавати

**drawing_navigation** — навігація з олівцем:
- `target_type`: будь-яка ціль (відображається на сцені)
- `target_x/target_y`: обов'язкові — фінальна точка маршруту
- `drawingPattern`: `{"requirePen": true}` — лише перевірка олівця
- ⚠️ Ціль має бути кінцевою точкою маршруту, а НЕ на проміжному шляху

**drawing_shape** — малювання фігури:
- `target_type`: `"none"` — ціль НЕ відображається
- `target_x/target_y`: `0, 0` — ігноруються рушієм
- `drawingPattern`: обов'язкове, із `figureType` або `figures`
- ⚠️ НЕ вимагати від дитини "дійти до зірки" — її немає

---

## Поля

| Поле | Тип | Обов'язкове | Опис |
|------|-----|-------------|------|
| `id` | string | ✅ | `task_dN_mM` для мікроуроків, `challenge_dN` для челенджів |
| `title` | string | ✅ | `День N — Назва` |
| `day` | number | ✅ | День курсу (1–10) |
| `order_in_day` | number | ✅ | Порядок у дні (1–5) |
| `type` | string | ✅ | `microlesson` або `challenge` |
| `character` | string | ✅ | Персонаж |
| `description` | string | ✅ | Короткий опис для дитини |
| `hint_1/2/3` | string | ✅ | Підказки (загальна → конкретна → рішення) |
| `available_blocks` | array | ✅ | Блоки у тулбоксі |
| `solution` | array | ✅ | Правильне рішення |
| `stars` | number | ✅ | 1 для мікроуроків, 3 для челенджів |
| `unlock_condition` | string | ✅ | `immediate` / `after_previous` / `next_day` |
| `unlock_after_challenge_id` | string | ✅ | ID попереднього челенджу (або `""`) |
| `attempt_limit` | number | ✅ | 0 = безліміт, 2 = для челенджів |
| `rollback_to_day` | number | ✅ | На який день повертати при провалі (0 = не повертати) |
| `pencil_enabled` | boolean | ✅ | `true` якщо є `pencil_down`/`pencil_up` у solution |
| `startX/startY` | number | ✅ | Стартова позиція героя (крок сітки 50px) |
| `target_type` | string | ✅ | Ціль або `"none"` для drawing_shape |
| `target_x/target_y` | number | ✅ | Позиція цілі (0,0 якщо `target_type: "none"`) |
| `obstacles` | array | ✅ | `[]` або `[{"x":N,"y":N,"type":"fence"}]` |
| `audio_intro/success/hint` | string | ✅ | TTS фрази |
| `drawingPattern` | object | тільки для олівцевих | Об'єкт перевірки малюнку (див. нижче) |
| `drawing_guide` | array | необов'язкове | Контури-підказки на сцені для трасування (масив штрихів) |

### drawingPattern — структура

```json
{"requirePen": true}                                   // drawing_navigation — олівець обов'язковий
{"requirePen": true, "figureType": "stairs", "stairCount": 2}   // сходинки (2 кути)
{"requirePen": true, "figureType": "stairs", "stairCount": 3}   // сходинки (3 кути)
{"requirePen": true, "figureType": "closedShape"}               // одна замкнена фігура
{"requirePen": true, "figures": 2, "requireGap": true, "figureType": "closedShape"}  // 2 окремі фігури
{"requirePen": true, "figures": 3, "requireGap": true, "penZones": [...]}            // літери/слово — зони
```

| Поле | Значення | Опис |
|------|----------|------|
| `requirePen` | `true` | олівець має бути опущений під час руху |
| `figureType` | `"stairs"` / `"closedShape"` | тип фігури для перевірки |
| `stairCount` | число | кількість кутів у сходинках |
| `figures` | число | кількість окремих фігур |
| `requireGap` | `true` | між фігурами має бути підйом олівця |
| `penZones` | масив зон | кожна зона обов'язково має мати pen-down рух (для літер/слів) |

**penZones** — використовувати для завдань типу "намалюй слово/літери". Кожна зона відповідає одній літері або фігурі. Перевіряє що дитина правильно тримала олівець вниз у кожній зоні:

```json
"penZones": [
  {"xMin": 0,   "xMax": 150, "msg": "✏️ Намалюй букву К — олівець має бути вниз в лівій частині!"},
  {"xMin": 200, "xMax": 400, "msg": "✏️ Намалюй букву О — олівець має бути вниз в середині!"},
  {"xMin": 400, "xMax": 600, "msg": "✏️ Намалюй букву Д — олівець має бути вниз в правій частині!"}
]
```

**Правило розбиття зон:** ширина canvas = 600px. Для N літер: ділити рівномірно з невеликим gap між зонами (щоб переходи не потрапляли в зону сусідньої літери).

### drawing_guide — структура

Масив штрихів (stroke = один відрізок з олівцем вниз). Кожен штрих — масив `[x, y]` вузлів по сітці (крок 50px):

```json
"drawing_guide": [
  [[50,50],[50,350]],                                    // штрих 1 — ліва вертикаль К
  [[50,150],[100,150],[100,50]],                         // штрих 2 — верхня рука К
  [[50,200],[100,200],[100,350]],                        // штрих 3 — нижня рука К
  [[200,50],[350,50],[350,350],[200,350],[200,50]],      // штрих 4 — літера О
  [[400,50],[550,50],[550,350],[400,350],[400,50]],      // штрих 5 — тіло Д
  [[400,350],[400,400]],                                 // штрих 6 — ліва ніжка Д
  [[550,350],[550,400]]                                  // штрих 7 — права ніжка Д
]
```

**Правила:**
- ⚠️ **КРИТИЧНО: x ≤ 550, y ≤ 400** (canvas 600×450, рендер +25 → максимум x=575, y=425)
- Координати кратні 50px — тільки прямі кути (горизонтальні та вертикальні лінії)
- Штрихи виводяться блідо-фіолетовими лініями під pencil trail
- Для drawing_shape: guide показує форму літери/фігури — не обов'язково повторює solution точно
- Використовувати для: літери, цифри, складні фігури де потрібна підказка форми

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
3. **Визнач режим валідації** → `navigation` / `drawing_navigation` / `drawing_shape`
4. Задай поля відповідно до режиму:
   - `drawing_shape` → `target_type: "none"`, `target_x: 0`, `target_y: 0`, додай `drawingPattern` з `figureType`
   - `drawing_navigation` → звичайна ціль + `drawingPattern: {requirePen: true}`
   - `navigation` → звичайна ціль, без `drawingPattern`
5. Для мікроуроків: нова концепція = +1 блок, `stars: 1`
6. Для челенджу: `stars: 3`, `attempt_limit: 2`, `rollback_to_day: N`
7. Не повторювати персонажа підряд
8. Перевір: `solution` містить тільки блоки з `available_blocks`
9. Перевір координати в межах 600×450, крок сітки = 50px
10. Append нові завдання до `data/tasks.json` (не перезаписуй)

---

## Педагогічні правила

- Нова концепція вводиться по одній (не два нових блоки одночасно)
- hint_1 — загальна → hint_2 — конкретніша → hint_3 — майже рішення
- Аудіо-фрази: короткі, радісні, для 6–9 років
- НЕ використовувати слова: "програма", "алгоритм", "код" — тільки "команди", "кроки", "підказки"
- `pencil_enabled: true` ТІЛЬКИ якщо є `pencil_down`/`pencil_up` у solution
- Для `drawing_shape`: description і hints НЕ згадують "дійди до зірки" — тільки про малювання фігури
- Для `drawing_navigation`: description пояснює що потрібно малювати І дійти до цілі
