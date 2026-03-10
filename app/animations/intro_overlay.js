// Словник блоків — збігається з Blockly.defineBlocksWithJsonArray в task.js
const BLOCK_DEFS = {
    move_right:       { label: 'йти вправо ➔',          hex: '#4C97FF', desc: 'Цей блок рухає героя вправо на один крок!' },
    move_left:        { label: 'йти вліво ⬅',            hex: '#4C97FF', desc: 'Цей блок рухає героя вліво на один крок!' },
    move_up:          { label: 'йти вгору ⬆',            hex: '#4C97FF', desc: 'Цей блок рухає героя вгору на один крок!' },
    move_down:        { label: 'йти вниз ⬇',             hex: '#4C97FF', desc: 'Цей блок рухає героя вниз на один крок!' },
    jump:             { label: 'стрибнути ↑',             hex: '#4C97FF', desc: 'Герой підстрибує! Можна перестрибнути через перешкоду.' },
    move_right_steps: { label: 'йти вправо (1) кроків',  hex: '#4C97FF', desc: 'Тепер герой може йти вправо одразу на кілька кроків!' },
    move_left_steps:  { label: 'йти вліво (1) кроків',   hex: '#4C97FF', desc: 'Тепер герой може йти вліво одразу на кілька кроків!' },
    move_up_steps:    { label: 'йти вгору (1) кроків',   hex: '#4C97FF', desc: 'Тепер герой може йти вгору одразу на кілька кроків!' },
    move_down_steps:  { label: 'йти вниз (1) кроків',    hex: '#4C97FF', desc: 'Тепер герой може йти вниз одразу на кілька кроків!' },
    pencil_down:      { label: 'олівець вниз ✏️',         hex: '#59C059', desc: 'Олівець вниз — герой залишає слід на своєму шляху!' },
    pencil_up:        { label: 'олівець вгору ✏️',        hex: '#59C059', desc: 'Олівець вгору — герой рухається без сліду.' },
    repeat_2:         { label: 'повторити (2) рази',     hex: '#FFAB19', desc: 'Блоки всередині виконаються 2 рази — не треба ставити їх двічі!' },
    repeat_3:         { label: 'повторити (3) рази',     hex: '#FFAB19', desc: 'Блоки всередині виконаються 3 рази — не треба ставити їх тричі!' },
    repeat_5:         { label: 'повторити (5) разів',    hex: '#FFAB19', desc: 'Блоки всередині виконаються 5 разів!' },
    always:           { label: 'завжди повторювати',     hex: '#FFAB19', desc: 'Блоки всередині повторюються нескінченно!' },
    event_flag:       { label: 'коли натиснуть 🚩',      hex: '#FFBF00', desc: 'Програма стартує коли натиснуть на зелений прапорець!' },
    event_click:      { label: 'коли клацнуть 🖱️',       hex: '#FFBF00', desc: 'Програма стартує коли клацнуть на героя!' },
    if_obstacle:      { label: 'якщо перешкода',         hex: '#E6007A', desc: 'Якщо попереду перешкода — герой зробить інше!' },
    if_wall:          { label: 'якщо стіна',             hex: '#E6007A', desc: 'Якщо попереду стіна — герой зробить інше!' },
    say_alert:        { label: 'сказати ⚠️',              hex: '#FF6680', desc: 'Герой скаже попередження вголос!' },
    repair_bridge:    { label: 'полагодити міст 🔨',     hex: '#FF6680', desc: 'Герой полагодить зламаний міст — і зможе пройти далі!' },
};

// anim_intro_overlay — оверлей з описом нового Blockly-блоку
AnimEngine.register('intro_overlay', {
    meta: {
        id: 'anim_intro_overlay',
        name: 'Інтро нового блоку',
        description: 'Показуємо назву і опис нового Blockly-блоку перед першим завданням де він зустрічається',
        where: ['Будь-який день'],
        trigger: 'Перший запуск',
        showRule: 'Тільки один раз',
    },

    shouldShow({ blockId, uid } = {}) {
        if (!blockId || !uid) return false;
        return !localStorage.getItem(`intro_block_${blockId}_${uid}`);
    },

    // ctx: { blockId, uid, text, onClose }
    show({ blockId, uid, text, onClose } = {}) {
        const overlay = document.getElementById('introOverlay');
        const textEl  = document.getElementById('introText');
        if (!overlay || !textEl) return;

        // Знайти визначення блоку
        const def = BLOCK_DEFS[blockId];

        // Показати SVG-блок перед текстом
        let blockEl = overlay.querySelector('.intro-block-preview');
        if (!blockEl) {
            blockEl = document.createElement('div');
            blockEl.className = 'intro-block-preview';
            overlay.insertBefore(blockEl, textEl);
        }

        if (def) {
            blockEl.innerHTML = renderBlockSVG(def.hex, def.label);
            blockEl.style.display = 'block';
        } else {
            blockEl.style.display = 'none';
        }

        textEl.textContent = (def && def.desc) ? def.desc : (text || '');
        overlay.classList.add('active');

        const btn = document.getElementById('introOk');
        if (btn) {
            btn.onclick = () => {
                if (blockId && uid) localStorage.setItem(`intro_block_${blockId}_${uid}`, '1');
                overlay.classList.remove('active');
                if (onClose) onClose();
            };
        }
    }
});

// Генерує SVG Blockly-блоку за кольором і лейблом.
// Лейбл: "рухатись вправо на (10) кроків"
//   → текст "рухатись вправо на", поле "10", текст "кроків"
function renderBlockSVG(color, label) {
    const DARK = _darken(color, 0.15);
    const parts = _parseLabel(label);

    // Розраховуємо ширину
    const PAD = 12;
    const H = 48;
    const NOTCH_W = 12;
    const NOTCH_H = 10;
    const FIELD_PAD = 8;
    let x = PAD + 4;
    const items = [];

    for (const part of parts) {
        if (part.type === 'text') {
            const w = _textWidth(part.value, 14);
            items.push({ ...part, x, w });
            x += w + 6;
        } else {
            const w = _textWidth(part.value, 13) + FIELD_PAD * 2;
            items.push({ ...part, x, w });
            x += w + 6;
        }
    }

    const W = Math.max(x + PAD, 140);
    const cy = H / 2 + 2;

    // Block path з notch зверху і знизу
    const path = `M${NOTCH_W},0 L${NOTCH_W + NOTCH_H},0 L${NOTCH_W + NOTCH_H},6
                  L${NOTCH_W + NOTCH_H + 8},6 L${NOTCH_W + NOTCH_H + 8},0
                  L${W},0 L${W},${H}
                  L${NOTCH_W + NOTCH_H + 8},${H} L${NOTCH_W + NOTCH_H + 8},${H - 6}
                  L${NOTCH_W + NOTCH_H},${H - 6} L${NOTCH_W + NOTCH_H},${H}
                  L${NOTCH_W},${H} L${NOTCH_W},${H / 2 + NOTCH_H / 2}
                  L${0},${H / 2 + NOTCH_H / 2} L${0},${H / 2 - NOTCH_H / 2}
                  L${NOTCH_W},${H / 2 - NOTCH_H / 2} Z`.replace(/\n\s+/g, ' ');

    let innerSVG = `
        <path d="${path}" fill="${color}" stroke="${DARK}" stroke-width="1.5"/>`;

    for (const item of items) {
        if (item.type === 'text') {
            innerSVG += `<text x="${item.x}" y="${cy + 1}"
                fill="white" font-family="'Outfit',sans-serif"
                font-weight="600" font-size="14" dominant-baseline="middle"
                style="paint-order:stroke" stroke="none">${item.value}</text>`;
        } else {
            const fy = (H - 26) / 2;
            innerSVG += `
                <rect x="${item.x - FIELD_PAD}" y="${fy}"
                    width="${item.w}" height="26"
                    rx="5" fill="rgba(255,255,255,0.9)" stroke="${DARK}" stroke-width="1"/>
                <text x="${item.x - FIELD_PAD + item.w / 2}" y="${cy + 1}"
                    text-anchor="middle" dominant-baseline="middle"
                    fill="#333" font-family="'Outfit',sans-serif" font-size="13" font-weight="700"
                    >${item.value}</text>`;
        }
    }

    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
                xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 10px rgba(0,0,0,0.35))">
                ${innerSVG}
            </svg>`;
}

// Розбиває лейбл на частини: текст і (поля)
function _parseLabel(label) {
    const parts = [];
    const re = /\(([^)]+)\)/g;
    let last = 0, m;
    while ((m = re.exec(label)) !== null) {
        if (m.index > last) parts.push({ type: 'text', value: label.slice(last, m.index).trim() });
        parts.push({ type: 'field', value: m[1] });
        last = m.index + m[0].length;
    }
    if (last < label.length) parts.push({ type: 'text', value: label.slice(last).trim() });
    return parts.filter(p => p.value);
}

// Приблизна ширина тексту (canvas не завжди доступний)
function _textWidth(text, fontSize) {
    return text.length * fontSize * 0.55;
}

// Темніший відтінок кольору
function _darken(hex, amount) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((n >> 16) & 0xff) * (1 - amount)) | 0;
    const g = Math.max(0, ((n >> 8)  & 0xff) * (1 - amount)) | 0;
    const b = Math.max(0,  (n        & 0xff) * (1 - amount)) | 0;
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
