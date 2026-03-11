// anim_task_tour — 5-кроковий тур по сторінці завдання
AnimEngine.register('task_tour', {
    meta: {
        id: 'anim_task_tour',
        name: 'Тур по завданню',
        description: '5 кроків знайомства з інтерфейсом task.html: перетягни блок, з\'єднай, видали, zoom, запусти',
        where: ['День 1'],
        trigger: 'Перший запуск',
        showRule: 'Тільки один раз',
    },

    shouldShow({ uid } = {}) {
        return uid && !localStorage.getItem(`task_tour_done_${uid}`);
    },

    show({ uid } = {}) {
        _ttUid = uid;
        _ensureTaskTourDOM();
        _ttIdx = 0;
        _showTaskTourStep();
    }
});

const TASK_TOUR_STEPS = [
    {
        text: '🧩 Зліва — сіра зона з блоками. Перетягни будь-який блок на білий стіл!',
        highlight: '#blocklyDiv',
        anim: 'drag',
        top: '100px', left: '1rem',
    },
    {
        text: '🔗 Підстав один блок під інший — вони клацнуть і з\'єднаються!',
        highlight: '#blocklyDiv',
        anim: 'connect',
        top: '100px', left: '1rem',
    },
    {
        text: '🗑️ Щоб видалити блок — перетягни його назад у сіру зону або клацни правою кнопкою.',
        highlight: '#blocklyDiv',
        anim: 'trash',
        top: '100px', left: '1rem',
    },
    {
        text: '🔍 Не бачиш блоки? Кнопки + і − у куті змінюють масштаб.',
        highlight: '#blocklyDiv',
        anim: null,
        top: null, bottom: '160px', left: '1rem',
    },
    {
        text: '🚩 Жовта кнопка із Зеленим прапорцем — запускає твою програму!',
        highlight: '#runBtn',
        anim: null,
        top: null, bottom: '80px', right: '1rem',
    },
];

let _ttIdx = 0;
let _ttUid = null;

function _ensureTaskTourDOM() {
    if (document.getElementById('taskTourTip')) return;
    const el = document.createElement('div');
    el.id = 'taskTourTip';
    el.className = 'tt-tip';
    document.body.appendChild(el);
}

function _showTaskTourStep() {
    const el = document.getElementById('taskTourTip');
    if (!el) return;
    if (_ttIdx >= TASK_TOUR_STEPS.length) {
        el.style.display = 'none';
        _ttCleanHighlight();
        if (_ttUid) localStorage.setItem(`task_tour_done_${_ttUid}`, '1');
        return;
    }

    const s = TASK_TOUR_STEPS[_ttIdx];
    const dots = TASK_TOUR_STEPS.map((_, i) =>
        `<div class="tt-dot${i === _ttIdx ? ' active' : ''}"></div>`).join('');
    const animHtml = s.anim ? `<div class="tt-anim tt-anim-${s.anim}"></div>` : '';

    el.innerHTML = `
        ${animHtml}
        <div class="tt-text">${s.text}</div>
        <div class="tt-nav">
            <button class="tt-btn skip" onclick="_ttEnd()">Пропустити</button>
            <div class="tt-dots">${dots}</div>
            <button class="tt-btn" onclick="_ttNext()">${_ttIdx < TASK_TOUR_STEPS.length - 1 ? 'Далі →' : 'Готово!'}</button>
        </div>`;

    let css = 'display:block;position:fixed;z-index:400;';
    css += s.top    ? `top:${s.top};`       : 'top:auto;';
    css += s.bottom ? `bottom:${s.bottom};` : '';
    css += s.left   ? `left:${s.left};`     : '';
    css += s.right  ? `right:${s.right};`   : '';
    el.style.cssText = css;

    _ttCleanHighlight();
    if (s.highlight) {
        const target = document.querySelector(s.highlight);
        if (target) target.classList.add('tt-highlight');
    }

    AppTTS.speak(s.text);
}

function _ttNext() { _ttIdx++; _showTaskTourStep(); }

function _ttEnd() {
    const el = document.getElementById('taskTourTip');
    if (el) el.style.display = 'none';
    _ttCleanHighlight();
    AppTTS.stop();
    if (_ttUid) localStorage.setItem(`task_tour_done_${_ttUid}`, '1');
}

function _ttCleanHighlight() {
    document.querySelectorAll('.tt-highlight').forEach(e => e.classList.remove('tt-highlight'));
}

if (typeof module !== 'undefined') module.exports = { TASK_TOUR_STEPS };
