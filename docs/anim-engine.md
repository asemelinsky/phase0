# AnimEngine — логіка двіжка анімацій

## Архітектура

`AnimEngine` — глобальний синглтон (`app/animations/engine.js`). Всі анімації реєструються в ньому і запускаються через єдину точку входу.

```
engine.js          ← реєстр
├── onboarding.js  ← register('onboarding', ...)
├── warmup_dialog.js ← register('warmup_dialog', ...)
├── tour.js        ← register('tour', ...)
├── fab_tooltip.js ← register('fab_tooltip', ...)
└── intro_overlay.js ← register('intro_overlay', ...)
```

---

## API двіжка

### `AnimEngine.register(id, anim)`

Реєструє анімацію. `anim` — об'єкт з трьома полями:

| Поле | Тип | Обов'язкове | Опис |
|---|---|---|---|
| `meta` | object | так | Метадані (id, name, description, where, trigger, showRule) |
| `shouldShow(ctx)` | function | ні | Умова показу. Якщо повертає `false` — `show()` не викликається |
| `show(ctx)` | function | так | Запускає анімацію |

### `AnimEngine.trigger(id, ctx = {})`

Запускає анімацію за id:
1. Знаходить анімацію в реєстрі
2. Якщо є `shouldShow` — перевіряє умову
3. Якщо умова пройдена (або `shouldShow` відсутній) — викликає `show(ctx)`

```js
AnimEngine.trigger('onboarding', { uid, onDone: () => startWarmupDialog(uid) });
AnimEngine.trigger('intro_overlay', { blockId, uid, onClose });
AnimEngine.trigger('tour');
```

### `AnimEngine.getAll()`

Повертає масив мета-даних всіх зареєстрованих анімацій. Використовується в `preview.html`.

---

## Як створити нову анімацію

1. Створити файл `app/animations/my_anim.js`
2. Зареєструвати:

```js
AnimEngine.register('my_anim', {
    meta: {
        id: 'anim_my_anim',
        name: 'Назва',
        description: 'Опис',
        where: ['День 1'],
        trigger: 'Перший запуск',
        showRule: 'Тільки один раз',
    },

    shouldShow({ uid } = {}) {
        return !localStorage.getItem(`my_anim_done_${uid}`);
    },

    show({ uid } = {}) {
        // показати UI
    }
});
```

3. Підключити в `app/progress.html` (CSS + JS)
4. Додати тест-картку в `app/animations/preview.html`

---

## Зареєстровані анімації

| ID | Файл | shouldShow | Запускається з |
|---|---|---|---|
| `onboarding` | onboarding.js | `!onboarding_done_{uid}` + uid≠guest | `checkOnboarding()` в progress.html |
| `warmup_dialog` | warmup_dialog.js | `!dialog_done_{uid}` | після onboarding або напряму з `checkOnboarding()` |
| `tour` | tour.js | немає (завжди) | `warmup_dialog._wuFinish()` |
| `fab_tooltip` | fab_tooltip.js | `!fab_tooltip_seen` + не показувався сьогодні | вручну / preview |
| `intro_overlay` | intro_overlay.js | `!intro_block_{blockId}_{uid}` | `task.js` при завантаженні нового блоку |

---

## Ланцюжок першого запуску

```
checkOnboarding(uid)
  │
  ├─ onboarding_done відсутній
  │     └─→ AnimEngine.trigger('onboarding')
  │               └─→ finishOnboarding()
  │                       └─→ startWarmupDialog(uid)
  │                               └─→ _wuFinish()
  │                                       └─→ AnimEngine.trigger('tour')
  │
  └─ onboarding_done є, dialog_done відсутній
        └─→ startWarmupDialog(uid)  ← напряму, без AnimEngine
                └─→ AnimEngine.trigger('tour')
```

> **Увага:** `warmup_dialog` запускається через `startWarmupDialog()` напряму, а не через `AnimEngine.trigger()`. Це виняток з загального патерну.

---

## Логіка shouldShow

Кожна анімація сама вирішує чи показуватись — через `localStorage`:

| Анімація | Ключ | Скидається через |
|---|---|---|
| onboarding | `onboarding_done_{uid}` | URL `?onboarding` |
| warmup_dialog | `dialog_done_{uid}` | URL `?onboarding` або `?warmup` |
| tour | — | немає стану |
| fab_tooltip | `fab_tooltip_seen` | вручну |
| intro_overlay | `intro_block_{blockId}_{uid}` | вручну |

---

## Preview-режим

`app/animations/preview.html` — окрема сторінка для тестування. Отримує список анімацій через `AnimEngine.getAll()` і рендерить картки з кнопками **Run** / **Reset**.

Reset зазвичай очищає localStorage-ключ і знімає overlay з DOM.
