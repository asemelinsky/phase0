// anim_tour — 4-кроковий тур по сторінці прогресу
AnimEngine.register('tour', {
    meta: {
        id: 'anim_tour',
        name: 'Тур по карті прогресу',
        description: 'Чотири підказки-тултіпи що показують учню основні елементи сторінки прогресу',
        where: ['Онбординг'],
        trigger: 'Перший запуск',
        showRule: 'Тільки один раз',
    },

    show() { startTour(); }
});

const TOUR_STEPS = [
    { text: '🗺️ Це твоя Карта пригод! Тут відображаються всі дні навчання.', top: '80px', left: '50%', transform: 'translateX(-50%)', highlight: '#daysList' },
    { text: '📚 Натисни на картку «Вправи», щоб відкрити список завдань дня.', top: '220px', left: '1rem', highlight: '.exercises-card' },
    { text: '⚡ Челендж відкритий завжди! Виконай його і отримай аж 3 зірки ⭐⭐⭐', top: '220px', right: '1rem', highlight: '.challenge-card' },
    { text: '🔥 Тут твій стрік і загальний прогрес. Молодець!', top: '80px', right: '1rem', highlight: 'header' },
];
let _tourIdx = 0;

function startTour() {
    // Inject element if not in DOM
    if (!document.getElementById('tourTip')) {
        const el = document.createElement('div');
        el.id = 'tourTip';
        el.className = 'tour-tip';
        document.body.appendChild(el);
    }
    _tourIdx = 0;
    showTourStep();
}

function showTourStep() {
    const el = document.getElementById('tourTip');
    if (!el) return;
    if (_tourIdx >= TOUR_STEPS.length) { el.style.display = 'none'; return; }

    const s = TOUR_STEPS[_tourIdx];
    const dots = TOUR_STEPS.map((_, i) =>
        `<div class="tour-dot${i === _tourIdx ? ' active' : ''}"></div>`).join('');

    el.innerHTML = `
        <div class="tour-tip-text">${s.text}</div>
        <div class="tour-tip-nav">
            <button class="tour-btn skip" onclick="endTour()">Пропустити</button>
            <div class="tour-dots">${dots}</div>
            <button class="tour-btn" onclick="nextTour()">${_tourIdx < TOUR_STEPS.length - 1 ? 'Далі →' : 'Готово!'}</button>
        </div>`;

    el.style.cssText = `display:block;position:fixed;z-index:300;top:${s.top || 'auto'};` +
        (s.left  ? `left:${s.left};`   : '') +
        (s.right ? `right:${s.right};` : '') +
        (s.transform ? `transform:${s.transform};` : '');

    AppTTS.speak(s.text);

    document.querySelectorAll('.tour-highlight').forEach(e => e.classList.remove('tour-highlight'));
    if (s.highlight) {
        const target = document.querySelector(s.highlight);
        if (target) target.classList.add('tour-highlight');
    }
}

function nextTour() { _tourIdx++; showTourStep(); }
function endTour()  {
    const el = document.getElementById('tourTip');
    if (el) el.style.display = 'none';
    AppTTS.stop();
    document.querySelectorAll('.tour-highlight').forEach(e => e.classList.remove('tour-highlight'));
}
