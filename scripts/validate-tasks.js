#!/usr/bin/env node
/**
 * validate-tasks.js
 * Симулює рух героя за полем solution і перевіряє / виправляє target координати.
 * Схема: плоска Notion-схема (startX/Y, target_x/y, available_blocks, hint_1/2/3)
 *
 * Використання:
 *   node scripts/validate-tasks.js --check   → звіт без змін
 *   node scripts/validate-tasks.js --fix     → перезаписує target_x/y у tasks.json
 */

const fs = require('fs');
const path = require('path');
const { simulateTask } = require('../lib/engine');

const TASKS_PATH = path.join(__dirname, '..', 'data', 'tasks.json');

const MODE_CHECK = '--check';
const MODE_FIX = '--fix';

// ──────────────────────────────────────────────────────────────
// Структурна валідація (нова плоска схема)
// ──────────────────────────────────────────────────────────────
const REQUIRED_FIELDS = [
    'id', 'title', 'day', 'order_in_day', 'type', 'character', 'description',
    'hint_1', 'hint_2', 'hint_3',
    'available_blocks', 'solution',
    'stars', 'pencil_enabled',
    'startX', 'startY', 'target_type', 'target_x', 'target_y',
    'obstacles',
    'audio_intro', 'audio_success', 'audio_hint'
];

const VALID_CHARS = ['cat', 'dog', 'parrot', 'snail', 'frog', 'rabbit', 'robot', 'bee', 'turtle', 'pixel'];
const VALID_TYPES = ['microlesson', 'challenge'];

function validateStructure(task) {
    const errors = [];

    for (const f of REQUIRED_FIELDS) {
        if (task[f] === undefined) errors.push(`  ❌ Відсутнє поле: ${f}`);
    }
    if (task.character && !VALID_CHARS.includes(task.character))
        errors.push(`  ❌ Невідомий character: "${task.character}"`);
    if (task.type && !VALID_TYPES.includes(task.type))
        errors.push(`  ❌ Невідомий type: "${task.type}"`);
    if (task.pencil_enabled === true && task.solution) {
        const hasPencil = task.solution.some(s =>
            s === 'pencil_down' || s === 'pencil_up' ||
            (typeof s === 'object' && (s.block === 'pencil_down' || s.block === 'pencil_up'))
        );
        if (!hasPencil) errors.push('  ⚠️  pencil_enabled=true але в solution немає pencil_down/pencil_up');
    }

    return errors;
}

// ──────────────────────────────────────────────────────────────
// Чи завдання є pencil-only (ціль не потрібна для перевірки координат)
// ──────────────────────────────────────────────────────────────
function isPencilOnly(task) {
    if (!task.pencil_enabled) return false;
    // Якщо target_type відсутній або target_x/y дорівнюють startX/Y — малювальне завдання без руху до цілі
    return task.target_x === task.startX && task.target_y === task.startY;
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
    console.log(`📌 Режим: ${mode === MODE_FIX ? '🔧 FIX — координати будуть виправлені' : '👁  CHECK — тільки звіт'}`);
    console.log('═'.repeat(60));

    let passCount = 0;
    let fixCount = 0;
    let errorCount = 0;
    let warnCount = 0;

    const seenIds = new Set();

    for (const task of tasks) {
        const id = task.id || '(без id)';
        process.stdout.write(`\n[${id}] ${task.title || '(без назви)'}\n`);

        // Дублікат id
        const dupErrors = [];
        if (seenIds.has(id)) dupErrors.push(`  ❌ Дублікат id: ${id}`);
        seenIds.add(id);

        const structErrors = validateStructure(task);
        const allErrors = [...dupErrors, ...structErrors];
        allErrors.forEach(e => console.log(e));

        if (allErrors.some(e => e.includes('❌'))) {
            errorCount++;
            continue;
        }

        // Пропустити перевірку координат для pencil-only завдань (малюють, не рухаються до цілі)
        if (isPencilOnly(task)) {
            console.log(`  🎨 PENCIL-ONLY — координати не перевіряються`);
            passCount++;
            continue;
        }

        // Симуляція координат
        const simPos = simulateTask(task).finalPos;
        const coordOk = simPos.x === task.target_x && simPos.y === task.target_y;

        if (coordOk) {
            console.log(`  ✅ OK  → (${simPos.x}, ${simPos.y})`);
            passCount++;
        } else {
            console.log(`  ⚠️  КООРДИНАТИ: solution → (${simPos.x}, ${simPos.y}), target=(${task.target_x}, ${task.target_y})`);
            if (mode === MODE_FIX) {
                task.target_x = simPos.x;
                task.target_y = simPos.y;
                console.log(`  🔧 ВИПРАВЛЕНО → target тепер (${task.target_x}, ${task.target_y})`);
                fixCount++;
                passCount++;
            } else {
                console.log(`  💡 Запусти --fix щоб виправити автоматично`);
                warnCount++;
            }
        }
    }

    if (mode === MODE_FIX && fixCount > 0) {
        fs.writeFileSync(TASKS_PATH, JSON.stringify(tasks, null, 2), 'utf-8');
        console.log('\n' + '═'.repeat(60));
        console.log(`\n💾 tasks.json збережено (${fixCount} виправлень).`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`\n📊 Підсумок:`);
    console.log(`  ✅ Успішно:    ${passCount}`);
    if (mode === MODE_FIX) console.log(`  🔧 Виправлено: ${fixCount}`);
    console.log(`  ⚠️  Координати: ${warnCount}`);
    console.log(`  ❌ Помилок:    ${errorCount}`);
    console.log(`  📁 Всього:     ${tasks.length}\n`);
}

main();
