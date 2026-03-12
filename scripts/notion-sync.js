/**
 * notion-sync.js — одноразова синхронізація tasks.json → Notion
 * Запускати: node scripts/notion-sync.js
 */
require('dotenv').config();
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATA_SOURCE_ID = '1b30f907-13ea-42bd-97b2-d39e80b03520';

const JSON_FIELDS = ['available_blocks', 'solution', 'obstacles', 'intro_block', 'intro_block_group', 'drawingPattern', 'drawing_guide'];
const TEXT_FIELDS = ['character', 'description', 'hint_1', 'hint_2', 'hint_3', 'audio_intro', 'audio_success', 'audio_hint', 'target_type', 'unlock_after_challenge_id'];
const NUM_FIELDS  = ['day', 'order_in_day', 'stars', 'attempt_limit', 'rollback_to_day', 'startX', 'startY', 'target_x', 'target_y'];

async function getAllPages() {
    const pages = [];
    let cursor;
    do {
        const res = await notion.dataSources.query({ data_source_id: DATA_SOURCE_ID, start_cursor: cursor, page_size: 100 });
        pages.push(...res.results);
        cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
    return pages;
}

function rt(str) {
    return { rich_text: [{ text: { content: String(str ?? '') } }] };
}

function buildProps(task) {
    const props = {};

    // Title
    props['Назва'] = { title: [{ text: { content: task.title || '' } }] };

    // id (custom property)
    props['id'] = rt(task.id);

    // Text fields
    for (const f of TEXT_FIELDS) props[f] = rt(task[f] ?? '');

    // Number fields
    for (const f of NUM_FIELDS) props[f] = { number: task[f] ?? 0 };

    // Checkbox
    props['pencil_enabled'] = { checkbox: Boolean(task.pencil_enabled) };

    // Select fields
    if (task.type)             props['type']             = { select: { name: task.type } };
    if (task.unlock_condition) props['unlock_condition'] = { select: { name: task.unlock_condition } };

    // JSON fields (stored as text)
    for (const f of JSON_FIELDS) {
        const val = task[f];
        props[f] = val != null ? rt(JSON.stringify(val)) : { rich_text: [] };
    }

    return props;
}

async function sync() {
    const tasks = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/tasks.json'), 'utf8'));
    const pages = await getAllPages();

    // Map: task id → notion page id
    const notionMap = {};
    for (const page of pages) {
        const idProp = page.properties['id'] || page.properties['userDefined:id'];
        const taskId = idProp?.rich_text?.[0]?.plain_text;
        if (taskId) notionMap[taskId] = page.id;
    }

    console.log(`Notion: ${pages.length} сторінок | tasks.json: ${tasks.length} завдань\n`);

    const DATABASE_PAGE_ID = '97e704a9-0a3a-405f-977e-3e4ce0f1b77a';
    let updated = 0, created = 0;
    for (const task of tasks) {
        const pageId = notionMap[task.id];
        if (!pageId) {
            await notion.pages.create({ parent: { database_id: DATABASE_PAGE_ID }, properties: buildProps(task) });
            console.log(`➕ ${task.id} (створено)`);
            created++;
        } else {
            await notion.pages.update({ page_id: pageId, properties: buildProps(task) });
            console.log(`✅ ${task.id}`);
            updated++;
        }
    }

    console.log(`\nГотово: ${updated} оновлено, ${created} створено`);
}

sync().catch(err => { console.error(err); process.exit(1); });
