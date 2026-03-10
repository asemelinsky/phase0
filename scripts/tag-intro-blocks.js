// Сімейства блоків — перший блок з нового сімейства отримує intro_block
// Наступні блоки з того ж сімейства — без інтро (концепція вже знайома)
const BLOCK_FAMILIES = {
    movement:        ['move_right', 'move_left', 'move_up', 'move_down', 'jump'],
    movement_steps:  ['move_right_steps', 'move_left_steps', 'move_up_steps', 'move_down_steps'],
    pencil:          ['pencil_down', 'pencil_up'],
    loops:           ['repeat_2', 'repeat_3', 'repeat_5', 'always'],
    events:          ['event_flag', 'event_click'],
    conditions:      ['if_obstacle', 'if_wall', 'if_touching_sign', 'if_near_creeper', 'if_dragon_fire', 'if_wind'],
    cond_branches:   ['if_else_safe', 'if_else_bridge_ok'],
    actions:         ['say_alert', 'repair_bridge', 'hit_hammer', 'use_water', 'strike_sword'],
};

// Зворотній маппінг: block_id → family_id
const BLOCK_TO_FAMILY = {};
for (const [family, blocks] of Object.entries(BLOCK_FAMILIES)) {
    for (const b of blocks) BLOCK_TO_FAMILY[b] = family;
}

const fs = require('fs');
const path = require('path');
const tasksPath = path.join(__dirname, '../data/tasks.json');
const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));

const seenFamilies = new Set();
let tagged = 0;
let skipped = 0;

for (const task of tasks) {
    // Пропускаємо якщо вже є intro_block або intro_block_group
    if (task.intro_block || task.intro_block_group) {
        const b = task.intro_block ? task.intro_block.id : task.intro_block_group.id;
        // Позначити сімейство як вже показане
        const fam = BLOCK_TO_FAMILY[b] || b;
        seenFamilies.add(fam);
        skipped++;
        continue;
    }

    const blocks = (task.available_blocks || []).map(b => typeof b === 'object' ? b.block : b);

    // Знайти блоки з нових сімейств
    const newFamilyBlocks = {};
    for (const b of blocks) {
        const fam = BLOCK_TO_FAMILY[b];
        if (!fam) continue; // невідомий блок — пропускаємо
        if (seenFamilies.has(fam)) continue; // сімейство вже знайоме
        if (!newFamilyBlocks[fam]) newFamilyBlocks[fam] = [];
        newFamilyBlocks[fam].push(b);
    }

    const newFamilies = Object.keys(newFamilyBlocks);

    if (newFamilies.length === 0) continue;

    if (newFamilies.length === 1) {
        const fam = newFamilies[0];
        const famBlocks = newFamilyBlocks[fam];

        if (famBlocks.length === 1) {
            // Один новий блок з нового сімейства → intro_block
            task.intro_block = { id: famBlocks[0] };
            console.log(`✅ ${task.id}: intro_block = ${famBlocks[0]}`);
        } else {
            // Кілька нових блоків з одного нового сімейства → intro_block_group
            task.intro_block_group = {
                id: fam,
                blocks: famBlocks.map(id => ({ id })),
            };
            console.log(`✅ ${task.id}: intro_block_group = ${fam} [${famBlocks.join(', ')}]`);
        }

        seenFamilies.add(fam);
        tagged++;
    } else {
        // Кілька різних нових сімейств в одному завданні — беремо перше
        // (педагогічне правило: не більше 1 нової концепції за раз)
        const fam = newFamilies[0];
        const famBlocks = newFamilyBlocks[fam];
        task.intro_block = { id: famBlocks[0] };
        console.log(`⚠️  ${task.id}: кілька нових сімейств (${newFamilies.join(', ')}) — взято першe: ${famBlocks[0]}`);
        seenFamilies.add(fam);
        tagged++;
    }
}

fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2), 'utf8');
console.log(`\nГотово: ${tagged} завдань позначено, ${skipped} вже мали intro_block`);
