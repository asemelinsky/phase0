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

    shouldShow({ taskId, uid } = {}) {
        if (!taskId || !uid) return false;
        return !localStorage.getItem(`intro_${taskId}_${uid}`);
    },

    // ctx: { taskId, uid, text, introBlock: { color, label }, onClose }
    show({ taskId, uid, text, introBlock, onClose } = {}) {
        const overlay = document.getElementById('introOverlay');
        const textEl  = document.getElementById('introText');
        if (!overlay || !textEl) return;

        // Якщо є introBlock — показати SVG-блок перед текстом
        let blockEl = overlay.querySelector('.intro-block-preview');
        if (!blockEl) {
            blockEl = document.createElement('div');
            blockEl.className = 'intro-block-preview';
            overlay.insertBefore(blockEl, textEl);
        }

        if (introBlock) {
            blockEl.innerHTML = renderBlockSVG(introBlock.color, introBlock.label);
            blockEl.style.display = 'block';
        } else {
            blockEl.style.display = 'none';
        }

        textEl.textContent = text || '';
        overlay.classList.add('active');

        const btn = document.getElementById('introOk');
        if (btn) {
            btn.onclick = () => {
                if (taskId && uid) localStorage.setItem(`intro_${taskId}_${uid}`, '1');
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
