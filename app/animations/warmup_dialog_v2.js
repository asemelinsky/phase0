// anim_warmup_dialog_v2 — живий діалог + презентація Скретчика
AnimEngine.register('warmup_dialog_v2', {
    meta: {
        id: 'anim_warmup_dialog_v2',
        name: 'Діалог-розігрів v2',
        description: 'Живий діалог з голосовими питаннями учня + анімована презентація Скретчика і його 4 кнопок',
        where: ['Онбординг'],
        trigger: 'Перший запуск',
        showRule: 'Тільки один раз',
    },

    shouldShow({ uid } = {}) {
        return uid && !localStorage.getItem(`warmup_v2_done_${uid}`);
    },

    show({ uid } = {}) { startWarmupV2(uid); }
});

// ── Константи ────────────────────────────────────────────────────────────────

const WU2_INTRO = (name) =>
    `Привіт, ${name}! Ми вже майже готові розпочати 🚀 Може тебе щось цікавить про цю гру — що тут треба робити? Якщо маєш питання — запитай!`;

const WU2_SCRATCHIK_INTRO =
    'Дозволь представити тобі робота-помічника, який буде поруч під час занять. Його звуть Скретчик!';

const WU2_FINAL =
    'Ось і все! Скретчик завжди поруч 👈 Готові розпочинати?';

const WU2_OFF_TOPIC =
    'Вибач, але я можу відповідати тільки на питання про Кодомандри 😊 Що тебе цікавить про цей курс?';

const WU2_FABS = [
    { icon: '💡', label: 'Цікавий факт',  text: 'Ця кнопка — Цікавий факт. Натискай її раз на день, щоб дізнатися щось класне про програмування!' },
    { icon: '😄', label: 'Анекдот',        text: 'А ця — Анекдот. Щоб її розблокувати, потрібно виконати хоча б одне завдання дня.' },
    { icon: '❓', label: 'Підказка',       text: 'Знак питання — Підказка. Скретчик подивиться, як у тебе справи, і запропонує, що робити далі. До трьох підказок на день.' },
    { icon: '🎤', label: 'Мікрофон',       text: 'І мікрофон — тут ти можеш поговорити зі Скретчиком про що завгодно, що пов\'язане з програмуванням. Він із задоволенням поспілкується!' },
];

// ── Стан ─────────────────────────────────────────────────────────────────────

let _wu2Uid       = null;
let _wu2Questions = 0; // скільки питань вже задано (макс 2)

// ── Запуск ───────────────────────────────────────────────────────────────────

function startWarmupV2(uid) {
    _wu2Uid       = uid;
    _wu2Questions = 0;
    _ensureWu2DOM();

    const profileRaw = localStorage.getItem(`profile_${uid}`);
    const profile    = profileRaw ? JSON.parse(profileRaw) : null;
    if (profile) {
        document.getElementById('wu2StudentAvatar').textContent = profile.avatarEmoji || '🧑';
        document.getElementById('wu2StudentName').textContent   = profile.name || 'Ти';
    }

    document.getElementById('wu2Overlay').classList.add('open');
    _wu2Phase1Intro();
}

// ── DOM ──────────────────────────────────────────────────────────────────────

function _ensureWu2DOM() {
    if (document.getElementById('wu2Overlay')) return;
    const el = document.createElement('div');
    el.id = 'wu2Overlay';
    el.className = 'wu2-overlay';
    el.innerHTML = `
        <div class="wu2-stage">
            <div class="wu2-char teacher">
                <div class="wu2-bubble" id="wu2TeacherBubble"></div>
                <div class="wu2-avatar" id="wu2TeacherAvatar">👨‍🏫</div>
                <div class="wu2-name">Олексій</div>
            </div>
            <div class="wu2-scratchik" id="wu2Scratchik">
                <div class="wu2-scratchik-avatar">🤖</div>
                <div class="wu2-scratchik-name">Скретчик</div>
            </div>
            <div class="wu2-char student">
                <div class="wu2-bubble" id="wu2StudentBubble"></div>
                <div class="wu2-avatar" id="wu2StudentAvatar">🧑</div>
                <div class="wu2-name" id="wu2StudentName">Ти</div>
            </div>
        </div>
        <div class="wu2-panel" id="wu2Panel"></div>`;
    document.body.appendChild(el);
}

// ── Фаза 1 — Q&A ─────────────────────────────────────────────────────────────

function _wu2Phase1Intro() {
    const profileRaw = localStorage.getItem(`profile_${_wu2Uid}`);
    const name = profileRaw ? (JSON.parse(profileRaw).name || 'друже') : 'друже';
    const text = WU2_INTRO(name);

    _wu2TeacherSay(text);
    AppTTS.speak(text, () => {
        _wu2SetPanel(`
            <div class="wu2-label">Є питання до старту?</div>
            <div class="wu2-btns">
                <button class="wu2-btn yes" onclick="_wu2StartListening()">🎤 Задати питання</button>
                <button class="wu2-btn no"  onclick="_wu2Phase2()">Ні, питань немає</button>
            </div>`);
    });
    _wu2SetPanel('<div class="wu2-label">...</div>');
}

async function _wu2StartListening() {
    if (!AppSTT.supported()) {
        _wu2TeacherSay('Схоже, твій браузер не підтримує мікрофон 😔 Натисни «Ні, питань немає»');
        AppTTS.speak('Схоже, твій браузер не підтримує мікрофон. Натисни кнопку нижче.');
        return;
    }

    _wu2SetPanel(`
        <div class="wu2-mic">
            <div class="wu2-mic-icon">🎤</div>
            <div class="wu2-mic-label">Я тебе слухаю...</div>
        </div>`);

    AppSTT.listen(
        async question => {
            // Показати питання учня
            const sb = document.getElementById('wu2StudentBubble');
            sb.textContent = question;
            sb.classList.add('show');
            _wu2SetPanel('<div class="wu2-label">Викладач думає...</div>');

            // Отримати AI-відповідь
            let answer;
            try {
                const res = await fetch('/api/hint', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'warmup_question', task: { question } })
                });
                const data = await res.json();
                answer = data.hint || WU2_OFF_TOPIC;
            } catch {
                answer = WU2_OFF_TOPIC;
            }

            _wu2TeacherSay(answer);
            _wu2Questions++;

            AppTTS.speak(answer, () => {
                if (_wu2Questions >= 2) {
                    _wu2Phase2();
                } else {
                    _wu2SetPanel(`
                        <div class="wu2-label">Хочеш ще щось запитати?</div>
                        <div class="wu2-btns">
                            <button class="wu2-btn yes" onclick="_wu2StartListening()">🎤 Так</button>
                            <button class="wu2-btn no"  onclick="_wu2Phase2()">Ні</button>
                        </div>`);
                }
            });
        },
        () => {
            _wu2TeacherSay('Не почув тебе. Спробуй ще раз! 🎤');
            _wu2SetPanel(`
                <div class="wu2-btns">
                    <button class="wu2-btn yes" onclick="_wu2StartListening()">🎤 Спробувати ще</button>
                    <button class="wu2-btn no"  onclick="_wu2Phase2()">Пропустити</button>
                </div>`);
        }
    );
}

// ── Фаза 2 — Знайомство зі Скретчиком ────────────────────────────────────────

function _wu2Phase2() {
    AppTTS.stop();
    AppSTT.stop();
    document.getElementById('wu2StudentBubble').classList.remove('show');
    document.getElementById('wu2TeacherBubble').classList.remove('show');

    // Показати Скретчика
    document.getElementById('wu2Scratchik').classList.add('visible');
    _wu2SetPanel('<div class="wu2-label">...</div>');

    _wu2TeacherSay(WU2_SCRATCHIK_INTRO);
    AppTTS.speak(WU2_SCRATCHIK_INTRO, () => _wu2PresentFabs(0));
}

function _wu2PresentFabs(idx) {
    // Рендер FAB-сітки
    const grid = WU2_FABS.map((f, i) => `
        <div class="wu2-fab-item${i === idx ? ' active' : ''}" id="wu2Fab${i}">
            <div class="wu2-fab-btn">${f.icon}</div>
            <div class="wu2-fab-label">${f.label}</div>
        </div>`).join('');

    const dots = WU2_FABS.map((_, i) =>
        `<div class="wu2-dot${i < idx ? ' done' : ''}"></div>`).join('');

    _wu2SetPanel(`
        <div class="wu2-fab-grid">${grid}</div>
        <div class="wu2-dots">${dots}</div>`);

    _wu2TeacherSay(WU2_FABS[idx].text);
    AppTTS.speak(WU2_FABS[idx].text, () => {
        const next = idx + 1;
        if (next < WU2_FABS.length) {
            _wu2PresentFabs(next);
        } else {
            _wu2Finale();
        }
    });
}

function _wu2Finale() {
    document.getElementById('wu2TeacherBubble').classList.remove('show');
    _wu2SetPanel(`
        <div class="wu2-label" style="font-size:1rem;color:#fff">${WU2_FINAL}</div>
        <div class="wu2-btns">
            <button class="wu2-btn next" onclick="_wu2Finish()">▶️ Почати!</button>
        </div>`);
    AppTTS.speak(WU2_FINAL);
}

function _wu2Finish() {
    AppTTS.stop();
    localStorage.setItem(`warmup_v2_done_${_wu2Uid}`, '1');
    document.getElementById('wu2Overlay').classList.remove('open');
    AnimEngine.trigger('tour');
}

// ── Хелпери ───────────────────────────────────────────────────────────────────

function _wu2TeacherSay(text) {
    const bubble = document.getElementById('wu2TeacherBubble');
    const avatar = document.getElementById('wu2TeacherAvatar');
    bubble.classList.remove('show');
    void bubble.offsetWidth;
    bubble.textContent = text;
    bubble.classList.add('show');
    avatar.classList.add('speaking');
    setTimeout(() => avatar.classList.remove('speaking'), 2000);
}

function _wu2SetPanel(html) {
    document.getElementById('wu2Panel').innerHTML = html;
}
