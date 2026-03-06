#!/usr/bin/env node
/**
 * validate-tasks.js
 * Симулює рух героя за полем solution і перевіряє / виправляє target координати.
 *
 * Використання:
 *   node scripts/validate-tasks.js --check   → звіт без змін
 *   node scripts/validate-tasks.js --fix     → перезаписує target.x/y у tasks.json
 *
 * NOTE про always-задачі:
 *   Блок 'always' семантично означає "рухайся доки не знайдеш ціль".
 *   Скрипт перевіряє що target потрапляє на шлях (в якійсь ітерації),
 *   але НЕ автофіксить такі завдання — їх координати мають бути вірні,
 *   а фікс потрібен у task.html (зупиняти анімацію при досягненні цілі).
 */

const fs = require('fs');
const path = require('path');

const TASKS_PATH = path.join(__dirname, '..', 'data', 'tasks.json');
const STEP = 50;       // px за один крок сітки
const ALWAYS_MAX = 20; // кількість ітерацій 'always' у task.html

const MODE_CHECK = '--check';
const MODE_FIX = '--fix';

// ──────────────────────────────────────────────────────────────
// Визначення чи завдання використовує блок 'always'
// ──────────────────────────────────────────────────────────────
function hasAlways(solution) {
    if (!Array.isArray(solution)) return false;
    for (const item of solution) {
        if (item === 'always') return true;
        if (Array.isArray(item) && hasAlways(item)) return true;
    }
    return false;
}

// ──────────────────────────────────────────────────────────────
// Розгортання solution у плоский список дій
// ──────────────────────────────────────────────────────────────
function flattenSolution(solution, repeatOverride = null) {
    const actions = [];
    let i = 0;
    while (i < solution.length) {
        const item = solution[i];
        const next = solution[i + 1];

        if (item === 'always' && Array.isArray(next)) {
            const times = repeatOverride !== null ? repeatOverride : ALWAYS_MAX;
            for (let r = 0; r < times; r++) actions.push(...flattenSolution(next));
            i += 2;
        } else if (item === 'repeat_2' && Array.isArray(next)) {
            for (let r = 0; r < 2; r++) actions.push(...flattenSolution(next));
            i += 2;
        } else if (item === 'repeat_3' && Array.isArray(next)) {
            for (let r = 0; r < 3; r++) actions.push(...flattenSolution(next));
            i += 2;
        } else if (item === 'repeat_5' && Array.isArray(next)) {
            for (let r = 0; r < 5; r++) actions.push(...flattenSolution(next));
            i += 2;
        } else if (Array.isArray(item)) {
            actions.push(...flattenSolution(item));
            i++;
        } else if (item === 'event_flag' || item === 'event_click') {
            // Пропускаємо сам блок-подію, але рекурсивно розгортаємо наступний масив дій
            if (Array.isArray(next)) {
                actions.push(...flattenSolution(next));
                i += 2;
            } else {
                i++;
            }
        } else if (typeof item === 'string') {
            actions.push(item);
            i++;
        } else {
            i++;
        }
    }
    return actions;
}

// ──────────────────────────────────────────────────────────────
// Застосування однієї дії до позиції
// ──────────────────────────────────────────────────────────────
function applyAction(pos, action) {
    switch (action) {
        case 'move_right': return { x: pos.x + STEP, y: pos.y };
        case 'move_left': return { x: pos.x - STEP, y: pos.y };
        case 'move_up': return { x: pos.x, y: pos.y - STEP };
        case 'move_down': return { x: pos.x, y: pos.y + STEP };
        default: return { ...pos }; // jump та умовні блоки — не змінюють клітинку
    }
}

// ──────────────────────────────────────────────────────────────
// Симуляція для ПРОСТИХ завдань (без always)
// ──────────────────────────────────────────────────────────────
function simulateFinalPos(task) {
    let pos = { x: task.canvas.startX, y: task.canvas.startY };
    const actions = flattenSolution(task.solution || []);
    for (const action of actions) {
        pos = applyAction(pos, action);
    }
    return pos;
}

// ──────────────────────────────────────────────────────────────
// Перевірка для ALWAYS-завдань:
// Чи target знаходиться на шляху хоча б в одній ітерації inner loop
// ──────────────────────────────────────────────────────────────
function checkAlwaysPath(task) {
    const tgt = task.canvas.target;
    let pos = { x: task.canvas.startX, y: task.canvas.startY };

    // Знаходимо inner loop always через рекурсію
    const sol = task.solution || [];
    let innerLoop = null;

    function findAlways(arr) {
        if (!Array.isArray(arr)) return;
        const idx = arr.indexOf('always');
        if (idx !== -1 && Array.isArray(arr[idx + 1])) {
            innerLoop = arr[idx + 1];
            return;
        }
        for (const item of arr) {
            if (Array.isArray(item)) findAlways(item);
            if (innerLoop) return;
        }
    }
    findAlways(sol);

    if (!innerLoop) {
        return { onPath: false, reachAt: null };
    }
    const innerActions = flattenSolution(innerLoop);

    // Перевіряємо позиції ДО і ПІСЛЯ кожного inner-кроку
    for (let iter = 0; iter < ALWAYS_MAX; iter++) {
        for (const action of innerActions) {
            pos = applyAction(pos, action);
            if (pos.x === tgt.x && pos.y === tgt.y) {
                return { onPath: true, reachAt: iter + 1, pos };
            }
        }
    }
    return { onPath: false, finalPos: pos };
}

// ──────────────────────────────────────────────────────────────
// Структурна валідація
// ──────────────────────────────────────────────────────────────
const REQUIRED_FIELDS = [
    'id', 'level', 'title', 'character', 'description',
    'objective', 'availableBlocks', 'solution', 'hints', 'canvas', 'audio'
];
const VALID_LEVELS = ['novice', 'intermediate', 'advanced', 'pro'];
const VALID_CHARS = ['cat', 'dog', 'parrot', 'snail', 'frog', 'rabbit', 'robot', 'bee', 'turtle', 'pixel'];

function validateStructure(task) {
    const errors = [];

    for (const f of REQUIRED_FIELDS) {
        if (task[f] === undefined) errors.push(`  ❌ Відсутнє поле: ${f}`);
    }
    if (task.level && !VALID_LEVELS.includes(task.level))
        errors.push(`  ❌ Невідомий level: "${task.level}" (допустимі: ${VALID_LEVELS.join(', ')})`);
    if (task.character && !VALID_CHARS.includes(task.character))
        errors.push(`  ❌ Невідомий character: "${task.character}"`);
    if (task.hints && task.hints.length !== 3)
        errors.push(`  ❌ hints має бути 3, знайдено: ${task.hints.length}`);
    if (task.canvas) {
        if (task.canvas.startX === undefined) errors.push('  ❌ canvas.startX відсутній');
        if (task.canvas.startY === undefined) errors.push('  ❌ canvas.startY відсутній');
        if (!task.canvas.target) errors.push('  ❌ canvas.target відсутній');
        else {
            if (task.canvas.target.x === undefined) errors.push('  ❌ canvas.target.x відсутній');
            if (task.canvas.target.y === undefined) errors.push('  ❌ canvas.target.y відсутній');
        }
    }
    if (task.audio) {
        for (const k of ['intro', 'success', 'hint']) {
            if (!task.audio[k]) errors.push(`  ❌ audio.${k} відсутній`);
        }
    }
    return errors;
}

// ──────────────────────────────────────────────────────────────
// ГОЛОВНИЙ ЗАПУСК
// ──────────────────────────────────────────────────────────────
function main() {
    const mode = process.argv[2];

    if (mode !== MODE_CHECK && mode !== MODE_FIX) {
        console.log('Використання:');
        console.log('  node scripts/validate-tasks.js --check   # перевірити без змін');
        console.log('  node scripts/validate-tasks.js --fix     # виправити target координати');
        process.exit(0);
    }

    let tasks;
    try {
        tasks = JSON.parse(fs.readFileSync(TASKS_PATH, 'utf-8'));
    } catch (e) {
        console.error('❌ Помилка читання tasks.json:', e.message);
        process.exit(1);
    }

    console.log(`\n📋 Перевірка tasks.json (${tasks.length} завдань)`);
    console.log(`📌 Режим: ${mode === MODE_FIX ? '🔧 FIX — прості задачі будуть виправлені' : '👁  CHECK — тільки звіт'}`);
    console.log('═'.repeat(60));

    let passCount = 0;
    let fixCount = 0;
    let errorCount = 0;
    let alwaysBugCount = 0;

    const seenIds = new Map();
    const seenTitles = new Map();

    for (const task of tasks) {
        const id = task.id || '(без id)';
        process.stdout.write(`\n[${id}] ${task.title || '(без назви)'}\n`);

        // Дублікати
        const dupErrors = [];
        if (seenIds.has(id)) dupErrors.push(`  ❌ Дублікат id`);
        if (seenTitles.has(task.title)) dupErrors.push(`  ❌ Дублікат title`);
        seenIds.set(id, true);
        if (task.title) seenTitles.set(task.title, id);

        const structErrors = validateStructure(task);
        const allErrors = [...dupErrors, ...structErrors];
        allErrors.forEach(e => console.log(e));

        // Математична перевірка координат
        if (task.solution && task.canvas && task.canvas.target) {
            const tgt = task.canvas.target;
            const isAlwaysTask = hasAlways(task.solution);

            if (isAlwaysTask) {
                // Спеціальна перевірка для always-задач
                const { onPath, reachAt } = checkAlwaysPath(task);
                if (onPath) {
                    console.log(`  ✅ ALWAYS OK → target (${tgt.x}, ${tgt.y}) досягається на ітерації ${reachAt}`);
                    if (allErrors.length === 0) passCount++;
                } else {
                    console.log(`  ⚠️  ALWAYS PATH: target (${tgt.x}, ${tgt.y}) не знаходиться на жодній ітерації шляху`);
                    console.log(`  ℹ️  Ці задачі потребують ручного коригування target АБО виправлення логіки task.html`);
                    alwaysBugCount++;
                    errorCount++;
                }
            } else {
                // Проста симуляція
                const simPos = simulateFinalPos(task);
                const coordOk = simPos.x === tgt.x && simPos.y === tgt.y;

                if (coordOk && allErrors.length === 0) {
                    console.log(`  ✅ OK  → (${simPos.x}, ${simPos.y})`);
                    passCount++;
                } else if (!coordOk) {
                    console.log(`  ⚠️  КООРДИНАТИ: solution → (${simPos.x}, ${simPos.y}), target=(${tgt.x}, ${tgt.y})`);
                    if (mode === MODE_FIX) {
                        tgt.x = simPos.x;
                        tgt.y = simPos.y;
                        console.log(`  🔧 ВИПРАВЛЕНО → target тепер (${tgt.x}, ${tgt.y})`);
                        fixCount++;
                    } else {
                        console.log(`  💡 Запусти --fix щоб виправити автоматично`);
                        errorCount++;
                    }
                }
            }
        } else if (allErrors.length === 0) {
            passCount++;
        }
    }

    if (mode === MODE_FIX && fixCount > 0) {
        fs.writeFileSync(TASKS_PATH, JSON.stringify(tasks, null, 4), 'utf-8');
        console.log('\n' + '═'.repeat(60));
        console.log(`\n💾 tasks.json збережено.`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`\n📊 Підсумок:`);
    console.log(`  ✅ Успішно:              ${passCount}`);
    if (mode === MODE_FIX) {
        console.log(`  🔧 Виправлено:          ${fixCount}`);
    }
    if (alwaysBugCount > 0) {
        console.log(`  🔁 Always (ручний фікс): ${alwaysBugCount}  ← потребує уваги`);
    }
    console.log(`  ❌ Помилок:             ${errorCount}`);
    console.log(`  📁 Всього:              ${tasks.length}\n`);

    if (alwaysBugCount > 0) {
        console.log(`💡 Задачі з 'always' потребують виправлення логіки у task.html:`);
        console.log(`   runCode() має зупинятись коли charPos == target (не чекати кінця циклу)\n`);
    }
}

main();
