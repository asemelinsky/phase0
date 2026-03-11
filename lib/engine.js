/**
 * lib/engine.js — спільна логіка ігрового рушія
 * Використовується в: task.js (браузер), validate-tasks.js (Node), tests/
 *
 * Не містить DOM, Blockly, setTimeout — тільки чиста логіка.
 */

'use strict';

const STEP = 50;
const ALWAYS_MAX = 20;
const SCENE_MAX_X = 550;
const SCENE_MAX_Y = 400;

// ─────────────────────────────────────────────
// Розгортання solution у плоский список дій
// ─────────────────────────────────────────────
function flattenSolution(solution) {
    const actions = [];
    let i = 0;
    while (i < solution.length) {
        const item = solution[i];
        const next = solution[i + 1];

        if ((item === 'always' || item === 'repeat_2' || item === 'repeat_3' || item === 'repeat_5') && Array.isArray(next)) {
            const times = item === 'repeat_2' ? 2 : item === 'repeat_3' ? 3 : item === 'repeat_5' ? 5 : ALWAYS_MAX;
            for (let r = 0; r < times; r++) actions.push(...flattenSolution(next));
            i += 2;
        } else if (Array.isArray(item)) {
            actions.push(...flattenSolution(item));
            i++;
        } else if (item === 'event_flag' || item === 'event_click') {
            if (Array.isArray(next)) { actions.push(...flattenSolution(next)); i += 2; }
            else i++;
        } else if (typeof item === 'object' && item !== null && item.block) {
            const baseBlock = item.block.replace('_steps', '');
            const steps = Math.abs(item.steps || 1);
            for (let s = 0; s < steps; s++) actions.push(baseBlock);
            i++;
        } else if (typeof item === 'string') {
            actions.push(item);
            i++;
        } else {
            i++;
        }
    }
    return actions;
}

// ─────────────────────────────────────────────
// Симуляція виконання завдання (без DOM/Blockly)
// Повертає: { finalPos, moveLog, outOfBounds }
// ─────────────────────────────────────────────
function simulateTask(task) {
    const actions = flattenSolution(task.solution || []);
    let pos = { x: task.startX, y: task.startY };
    let pencilDown = false;
    let outOfBounds = false;
    const moveLog = [];

    for (const action of actions) {
        if (action === 'pencil_down') {
            pencilDown = true;
            moveLog.push({ type: 'pen', down: true });
        } else if (action === 'pencil_up') {
            pencilDown = false;
            moveLog.push({ type: 'pen', down: false });
        } else if (['move_right', 'move_left', 'move_up', 'move_down'].includes(action)) {
            const dir = action.replace('move_', '');
            moveLog.push({ type: 'move', dir, penDown: pencilDown, x: pos.x, y: pos.y });
            if (action === 'move_right') pos.x += STEP;
            else if (action === 'move_left') pos.x -= STEP;
            else if (action === 'move_up') pos.y -= STEP;
            else if (action === 'move_down') pos.y += STEP;

            // outOfBounds — інформаційно, але НЕ зупиняємо симуляцію
            if (pos.x < 0 || pos.x > SCENE_MAX_X || pos.y < 0 || pos.y > SCENE_MAX_Y) {
                outOfBounds = true;
            }
        }
        // pencil_down/up, jump, action-blocks — не змінюють позицію
    }

    return { finalPos: pos, moveLog, outOfBounds };
}

// ─────────────────────────────────────────────
// Перевірка досягнення цілі
// ─────────────────────────────────────────────
function reachedTarget(finalPos, task) {
    if (task.target_type === 'none') return true;
    return finalPos.x === task.target_x && finalPos.y === task.target_y;
}

// ─────────────────────────────────────────────
// Drawing validation
// ─────────────────────────────────────────────
function getPenSegments(log) {
    const segs = [];
    let cur = [];
    let inPen = false;
    for (const e of log) {
        if (e.type === 'pen') {
            if (e.down) { inPen = true; }
            else { if (cur.length) { segs.push(cur); cur = []; } inPen = false; }
        } else if (e.type === 'move' && inPen) {
            cur.push(e.dir);
        }
    }
    if (cur.length) segs.push(cur);
    return segs;
}

function mergeDirs(dirs) {
    if (!dirs.length) return [];
    const r = [{ dir: dirs[0], count: 1 }];
    for (let i = 1; i < dirs.length; i++) {
        if (dirs[i] === r[r.length - 1].dir) r[r.length - 1].count++;
        else r.push({ dir: dirs[i], count: 1 });
    }
    return r;
}

function isClosedShape(dirs) {
    let x = 0, y = 0;
    for (const d of dirs) {
        if (d === 'right') x++;
        else if (d === 'left') x--;
        else if (d === 'up') y--;
        else if (d === 'down') y++;
    }
    return x === 0 && y === 0;
}

function isStairs(dirs, count) {
    const m = mergeDirs(dirs);
    if (m.length !== count * 2) return false;
    const d1 = m[0].dir, d2 = m[1].dir;
    if (d1 === d2) return false;
    const size1 = m[0].count, size2 = m[1].count;
    for (let i = 0; i < count; i++) {
        if (m[i * 2].dir !== d1 || m[i * 2 + 1].dir !== d2) return false;
        if (m[i * 2].count !== size1 || m[i * 2 + 1].count !== size2) return false;
    }
    return true;
}

function validateDrawing(pattern, log) {
    if (pattern.requirePen && !log.some(e => e.type === 'move' && e.penDown))
        return { ok: false, msg: '✏️ Щоб намалювати — спочатку опусти олівець!' };

    const segs = getPenSegments(log);

    if (pattern.requireGap && segs.length < 2)
        return { ok: false, msg: '✏️ Між фігурами підніми олівець!' };

    if (pattern.figures && segs.length < pattern.figures)
        return { ok: false, msg: `Намалюй ${pattern.figures} фігури окремо!` };

    if (pattern.figureType === 'stairs') {
        if (!isStairs(segs.flat(), pattern.stairCount || 3))
            return { ok: false, msg: '🪜 Намалюй сходинки: чергуй два напрямки рівними відрізками!' };
    }

    if (pattern.figureType === 'closedShape') {
        const toCheck = pattern.figures ? segs.slice(0, pattern.figures) : segs;
        for (const seg of toCheck) {
            if (!isClosedShape(seg))
                return { ok: false, msg: '🔲 Фігура не замкнена — герой має повернутись до початкової точки!' };
        }
    }

    if (pattern.penZones) {
        for (const zone of pattern.penZones) {
            const hasStroke = log.some(e =>
                e.type === 'move' && e.penDown &&
                e.x >= zone.xMin && e.x <= zone.xMax
            );
            if (!hasStroke)
                return { ok: false, msg: zone.msg || `✏️ Намалюй фігуру в зоні x=${zone.xMin}–${zone.xMax}!` };
        }
    }

    return { ok: true };
}

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        flattenSolution,
        simulateTask,
        reachedTarget,
        getPenSegments,
        mergeDirs,
        isClosedShape,
        isStairs,
        validateDrawing,
        STEP, SCENE_MAX_X, SCENE_MAX_Y,
    };
}
