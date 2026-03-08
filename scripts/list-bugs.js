#!/usr/bin/env node
/**
 * list-bugs.js
 * Завантажує задачі з Notion Sprint Board через REST API з фільтрацією.
 *
 * Використання:
 *   node scripts/list-bugs.js                    → всі To Do + In Progress
 *   node scripts/list-bugs.js --critical          → тільки 🔴 Критичний
 *   node scripts/list-bugs.js --status=todo       → тільки To Do
 *   node scripts/list-bugs.js --status=progress   → тільки In Progress
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const DATABASE_ID = '40a4258990e84e2ea9c34ffacc1fdcd1';
const TOKEN = process.env.NOTION_TOKEN;

if (!TOKEN) {
    console.error('❌ NOTION_TOKEN не знайдено в .env');
    process.exit(1);
}

const args = process.argv.slice(2);
const onlyCritical = args.includes('--critical');
const statusArg = args.find(a => a.startsWith('--status='))?.split('=')[1];

const STATUS_MAP = {
    todo: 'To Do',
    progress: 'In Progress',
};

async function fetchBugs() {
    const statusFilters = statusArg
        ? [{ property: 'Статус', select: { equals: STATUS_MAP[statusArg] || statusArg } }]
        : [
            { property: 'Статус', select: { equals: 'To Do' } },
            { property: 'Статус', select: { equals: 'In Progress' } },
          ];

    const andFilters = [
        { property: 'Тип', select: { equals: 'Task' } },
        { or: statusFilters },
    ];

    if (onlyCritical) {
        andFilters.push({ property: 'Пріоритет', select: { equals: '🔴 Критичний' } });
    }

    const res = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            filter: { and: andFilters },
            sorts: [{ property: 'Пріоритет', direction: 'ascending' }],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error('❌ Notion API error:', res.status, err);
        process.exit(1);
    }

    const data = await res.json();
    const results = data.results;

    if (results.length === 0) {
        console.log('\n✅ Немає відкритих задач за вказаними фільтрами.\n');
        return;
    }

    const PRIORITY_ICON = {
        '🔴 Критичний': '🔴',
        '🟡 Середній': '🟡',
        '🟢 Низький': '🟢',
    };

    console.log(`\n📋 Задачі (${results.length}):\n`);
    results.forEach((page, i) => {
        const props = page.properties;
        const title = props['Назва']?.title?.[0]?.plain_text || '(без назви)';
        const status = props['Статус']?.select?.name || '—';
        const priority = props['Пріоритет']?.select?.name || '—';
        const sprint = props['Спринт']?.select?.name || '—';
        const icon = PRIORITY_ICON[priority] || '⚪';
        const url = page.url;

        console.log(`#${i + 1} | ${icon} | ${title} | ${sprint} | ${status}`);
        console.log(`     ${url}\n`);
    });
}

fetchBugs().catch(e => {
    console.error('❌ Помилка:', e.message);
    process.exit(1);
});
