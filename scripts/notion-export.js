/**
 * notion-export.js — генерує tasks.json з Notion (Notion = source of truth)
 * Запускати: node scripts/notion-export.js
 */
require('dotenv').config();
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATA_SOURCE_ID = '1b30f907-13ea-42bd-97b2-d39e80b03520';

const JSON_FIELDS = ['available_blocks', 'solution', 'obstacles', 'intro_block', 'intro_block_group', 'drawingPattern', 'drawing_guide'];

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

function getText(page, key)     { return page.properties[key]?.rich_text?.[0]?.plain_text ?? ''; }
function getTitle(page)         { return page.properties['Назва']?.title?.[0]?.plain_text ?? ''; }
function getNumber(page, key)   { return page.properties[key]?.number ?? 0; }
function getCheckbox(page, key) { return Boolean(page.properties[key]?.checkbox); }
function getSelect(page, key)   { return page.properties[key]?.select?.name ?? ''; }
function getJson(page, key) {
    const raw = page.properties[key]?.rich_text?.[0]?.plain_text;
    if (!raw) return undefined;
    try { return JSON.parse(raw); } catch { return raw; }
}

function pageToTask(page) {
    const task = {
        id:                       getText(page, 'id'),
        title:                    getTitle(page),
        day:                      getNumber(page, 'day'),
        order_in_day:             getNumber(page, 'order_in_day'),
        type:                     getSelect(page, 'type'),
        character:                getText(page, 'character'),
        description:              getText(page, 'description'),
        hint_1:                   getText(page, 'hint_1'),
        hint_2:                   getText(page, 'hint_2'),
        hint_3:                   getText(page, 'hint_3'),
        available_blocks:         getJson(page, 'available_blocks') ?? [],
        solution:                 getJson(page, 'solution') ?? [],
        stars:                    getNumber(page, 'stars'),
        unlock_condition:         getSelect(page, 'unlock_condition'),
        unlock_after_challenge_id: getText(page, 'unlock_after_challenge_id'),
        attempt_limit:            getNumber(page, 'attempt_limit'),
        rollback_to_day:          getNumber(page, 'rollback_to_day'),
        pencil_enabled:           getCheckbox(page, 'pencil_enabled'),
        startX:                   getNumber(page, 'startX'),
        startY:                   getNumber(page, 'startY'),
        target_type:              getText(page, 'target_type'),
        target_x:                 getNumber(page, 'target_x'),
        target_y:                 getNumber(page, 'target_y'),
        obstacles:                getJson(page, 'obstacles') ?? [],
        audio_intro:              getText(page, 'audio_intro'),
        audio_success:            getText(page, 'audio_success'),
        audio_hint:               getText(page, 'audio_hint'),
    };

    // Додаткові поля — тільки якщо є
    const optFields = ['drawingPattern', 'drawing_guide', 'intro_block', 'intro_block_group'];
    for (const f of optFields) {
        const val = getJson(page, f);
        if (val != null) task[f] = val;
    }

    return task;
}

async function exportToJson() {
    const pages = await getAllPages();
    const tasks = pages
        .map(pageToTask)
        .filter(t => t.id)  // пропускаємо сторінки без id
        .sort((a, b) => a.day !== b.day ? a.day - b.day : a.order_in_day - b.order_in_day);

    const outPath = path.join(__dirname, '../data/tasks.json');
    fs.writeFileSync(outPath, JSON.stringify(tasks, null, 2), 'utf8');
    console.log(`✅ Експортовано ${tasks.length} завдань → data/tasks.json`);
}

exportToJson().catch(err => { console.error(err); process.exit(1); });
