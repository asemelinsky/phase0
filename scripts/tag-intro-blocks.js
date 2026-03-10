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
const overlayPath = path.join(__dirname, '../app/animations/intro_overlay.js');

const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));

// --- Зчитати існуючі ключі BLOCK_DEFS з intro_overlay.js ---
const overlaySource = fs.readFileSync(overlayPath, 'utf8');
const existingKeys = new Set();
const keyRegex = /^\s{4}(\w+):\s+\{/gm;
let m;
// Знаходимо тільки рядки всередині BLOCK_DEFS (між { і першим };)
const blockDefsMatch = overlaySource.match(/const BLOCK_DEFS\s*=\s*\{([\s\S]*?)\};/);
if (blockDefsMatch) {
    const inner = blockDefsMatch[1];
    const lineRegex = /^\s{4}(\w+):/gm;
    let lm;
    while ((lm = lineRegex.exec(inner)) !== null) existingKeys.add(lm[1]);
}

// --- Зібрати всі block_id що зустрічаються в tasks.json ---
const allBlockIds = new Set();
for (const task of tasks) {
    for (const b of (task.available_blocks || [])) {
        allBlockIds.add(typeof b === 'object' ? b.block : b);
    }
}

// --- Знайти блоки яких немає в BLOCK_DEFS і додати плейсхолдери ---
const missing = [...allBlockIds].filter(id => id && !existingKeys.has(id));
if (missing.length > 0) {
    let newSource = overlaySource;
    const insertPoint = '};  // END BLOCK_DEFS' in overlaySource
        ? '};  // END BLOCK_DEFS'
        : null;

    // Формуємо рядки для вставки
    const newLines = missing.map(id =>
        `    ${id}: { label: '${id.replace(/_/g, ' ')}', hex: '#4C97FF', desc: 'TODO: опис блоку ${id}' },`
    ).join('\n');

    // Вставляємо перед закриваючою дужкою BLOCK_DEFS
    if (insertPoint) {
        newSource = newSource.replace(insertPoint, `${newLines}\n${insertPoint}`);
    } else {
        // Знаходимо кінець BLOCK_DEFS по закриваючій }; після const BLOCK_DEFS
        newSource = newSource.replace(
            /^(const BLOCK_DEFS\s*=\s*\{[\s\S]*?)(^};)/m,
            (_, body, closing) => `${body}${newLines}\n${closing}`
        );
    }

    fs.writeFileSync(overlayPath, newSource, 'utf8');
    console.log(`\n➕ Додано в BLOCK_DEFS (потребує TODO):`);
    missing.forEach(id => console.log(`   - ${id}`));
    console.log(`   Відкрий app/animations/intro_overlay.js і заповни поля label/hex/desc`);
}

// --- Тегування tasks.json ---
const seenFamilies = new Set();
let tagged = 0;
let skipped = 0;

for (const task of tasks) {
    // Пропускаємо якщо вже є intro_block або intro_block_group
    if (task.intro_block || task.intro_block_group) {
        const b = task.intro_block ? task.intro_block.id : task.intro_block_group.id;
        const fam = BLOCK_TO_FAMILY[b] || b;
        seenFamilies.add(fam);
        skipped++;
        continue;
    }

    const blocks = (task.available_blocks || []).map(b => typeof b === 'object' ? b.block : b);

    const newFamilyBlocks = {};
    for (const b of blocks) {
        const fam = BLOCK_TO_FAMILY[b];
        if (!fam) continue;
        if (seenFamilies.has(fam)) continue;
        if (!newFamilyBlocks[fam]) newFamilyBlocks[fam] = [];
        newFamilyBlocks[fam].push(b);
    }

    const newFamilies = Object.keys(newFamilyBlocks);
    if (newFamilies.length === 0) continue;

    if (newFamilies.length === 1) {
        const fam = newFamilies[0];
        const famBlocks = newFamilyBlocks[fam];
        if (famBlocks.length === 1) {
            task.intro_block = { id: famBlocks[0] };
            console.log(`✅ ${task.id}: intro_block = ${famBlocks[0]}`);
        } else {
            task.intro_block_group = { id: fam, blocks: famBlocks.map(id => ({ id })) };
            console.log(`✅ ${task.id}: intro_block_group = ${fam} [${famBlocks.join(', ')}]`);
        }
        seenFamilies.add(fam);
        tagged++;
    } else {
        const fam = newFamilies[0];
        const famBlocks = newFamilyBlocks[fam];
        task.intro_block = { id: famBlocks[0] };
        console.log(`⚠️  ${task.id}: кілька нових сімейств (${newFamilies.join(', ')}) — взято перше: ${famBlocks[0]}`);
        seenFamilies.add(fam);
        tagged++;
    }
}

fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2), 'utf8');
console.log(`\nГотово: ${tagged} завдань позначено, ${skipped} вже мали intro_block`);
