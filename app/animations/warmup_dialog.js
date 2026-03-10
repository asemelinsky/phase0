// anim_warmup_dialog — анімований діалог викладач + учень перед першим завданням
AnimEngine.register('warmup_dialog', {
    meta: {
        id: 'anim_warmup_dialog',
        name: 'Діалог-розігрів',
        description: 'Викладач і учень на екрані: 3 репліки вступу + 3 питання учня з AI-відповідями',
        where: ['Онбординг'],
        trigger: 'Перший запуск',
        showRule: 'Тільки один раз',
    },

    shouldShow({ uid } = {}) {
        return uid && !localStorage.getItem(`dialog_done_${uid}`);
    },

    show({ uid } = {}) { startWarmupDialog(uid); }
});

// ===== WARMUP DIALOG =====

const WU_INTRO = [
    (name) => `Привіт, ${name}! Радий тебе бачити! 👋`,
    ()     => 'Я створив Кодомандри, щоб ти навчився програмувати і робив власні ігри! 🎮',
    ()     => 'Задай мені будь-які 3 питання — і тоді поїхали! 🚀',
];

const WU_QUESTIONS = [
    'Що таке програмування?',
    'Чи це складно?',
    'Чому мені потрібно вміти кодувати?',
    'Що я зможу зробити після курсу?',
    'Скільки тривають заняття?',
    'Хто такий Скретчик?',
];

let _wuState = { phase: 'intro', introIdx: 0, questionsLeft: 3, usedQs: new Set() };
let _wuUid   = null;
let _wuCurrentAudio = null;

function startWarmupDialog(uid) {
    _wuUid = uid;
    _ensureWarmupDOM();

    const overlay = document.getElementById('warmupOverlay');
    if (!overlay) return;

    const profileRaw = localStorage.getItem(`profile_${uid}`);
    const profile    = profileRaw ? JSON.parse(profileRaw) : null;
    if (profile) {
        document.getElementById('wuStudentAvatar').textContent = profile.avatarEmoji || '🧑';
        document.getElementById('wuStudentName').textContent   = profile.name || 'Ти';
    }

    _wuState = { phase: 'intro', introIdx: 0, questionsLeft: 3, usedQs: new Set() };
    overlay.classList.add('open');
    _wuShowIntro();
}

function _ensureWarmupDOM() {
    if (document.getElementById('warmupOverlay')) return;
    const el = document.createElement('div');
    el.id = 'warmupOverlay';
    el.className = 'warmup-overlay';
    el.innerHTML = `
        <div class="wu-stage">
            <div class="wu-character wu-teacher">
                <div class="wu-bubble" id="wuTeacherBubble"></div>
                <div class="wu-avatar" id="wuTeacherAvatar">👨‍🏫</div>
                <div class="wu-name">Олексій</div>
            </div>
            <div class="wu-center" id="wuCenter">
                <div class="wu-progress" id="wuProgressDots"></div>
                <div class="wu-center-label" id="wuCenterLabel"></div>
                <div class="wu-questions" id="wuQuestions"></div>
                <button class="wu-next-btn" id="wuNextBtn" style="display:none" onclick="wuNext()"></button>
            </div>
            <div class="wu-character wu-student">
                <div class="wu-bubble" id="wuStudentBubble"></div>
                <div class="wu-avatar" id="wuStudentAvatar">🧑</div>
                <div class="wu-name" id="wuStudentName">Ти</div>
            </div>
        </div>`;
    document.body.appendChild(el);
}

function _wuShowIntro() {
    const profileRaw = localStorage.getItem(`profile_${_wuUid}`);
    const name = profileRaw ? (JSON.parse(profileRaw).name || 'друже') : 'друже';
    const text = WU_INTRO[_wuState.introIdx](name);

    _wuTeacherSay(text);
    document.getElementById('wuQuestions').innerHTML    = '';
    document.getElementById('wuStudentBubble').classList.remove('show');
    document.getElementById('wuCenterLabel').textContent = '';

    const nextBtn = document.getElementById('wuNextBtn');
    nextBtn.style.display = 'block';
    nextBtn.textContent   = _wuState.introIdx < WU_INTRO.length - 1 ? 'Далі →' : 'Питання! 🙋';
    _wuState.phase = 'intro';
    _wuSpeak(text);
}

function wuNext() {
    if (_wuState.phase === 'intro') {
        _wuState.introIdx++;
        if (_wuState.introIdx < WU_INTRO.length) _wuShowIntro();
        else _wuShowQuestions();
    } else if (_wuState.phase === 'done') {
        _wuFinish();
    }
}

function _wuShowQuestions() {
    _wuState.phase = 'questions';
    document.getElementById('wuNextBtn').style.display = 'none';
    _wuUpdateProgress();
    document.getElementById('wuCenterLabel').textContent = `Питань залишилось: ${_wuState.questionsLeft}`;

    const qEl = document.getElementById('wuQuestions');
    qEl.innerHTML = '';
    WU_QUESTIONS.filter((_, i) => !_wuState.usedQs.has(i)).forEach(q => {
        const origIdx = WU_QUESTIONS.indexOf(q);
        const btn = document.createElement('button');
        btn.className   = 'wu-q-btn';
        btn.textContent = q;
        btn.onclick     = () => _wuAskQuestion(origIdx, q);
        qEl.appendChild(btn);
    });

    document.getElementById('wuTeacherBubble').classList.remove('show');
    document.getElementById('wuTeacherAvatar').classList.remove('speaking');
}

async function _wuAskQuestion(idx, question) {
    _wuState.usedQs.add(idx);
    _wuState.questionsLeft--;

    document.querySelectorAll('.wu-q-btn').forEach(b => b.disabled = true);
    const sb = document.getElementById('wuStudentBubble');
    sb.textContent = question;
    sb.classList.add('show');
    document.getElementById('wuCenterLabel').textContent = 'Викладач думає...';
    document.getElementById('wuQuestions').innerHTML     = '';

    const answer = await _wuGetHint(question) || 'Гарне питання! 😄 Дізнаєшся дуже скоро!';
    _wuTeacherSay(answer);
    _wuSpeak(answer);

    const nextBtn = document.getElementById('wuNextBtn');
    nextBtn.style.display = 'block';
    _wuUpdateProgress();

    if (_wuState.questionsLeft > 0) {
        nextBtn.textContent = `Ще питання (${_wuState.questionsLeft}) →`;
        _wuState.phase      = 'questions_wait';
        nextBtn.onclick     = () => _wuShowQuestions();
    } else {
        nextBtn.textContent = 'Поїхали! 🚀';
        _wuState.phase      = 'done';
        nextBtn.onclick     = () => _wuFinish();
    }
}

function _wuUpdateProgress() {
    const done = 3 - _wuState.questionsLeft;
    document.getElementById('wuProgressDots').innerHTML =
        Array.from({ length: 3 }, (_, i) =>
            `<div class="wu-progress-dot${i < done ? ' done' : ''}"></div>`
        ).join('');
}

function _wuTeacherSay(text) {
    const bubble = document.getElementById('wuTeacherBubble');
    const avatar = document.getElementById('wuTeacherAvatar');
    bubble.classList.remove('show');
    void bubble.offsetWidth;
    bubble.textContent = text;
    bubble.classList.add('show');
    avatar.classList.add('speaking');
    setTimeout(() => avatar.classList.remove('speaking'), 2000);
}

async function _wuGetHint(question) {
    try {
        const res = await fetch('/api/hint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'warmup', task: { question } })
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.hint || null;
    } catch { return null; }
}

function _wuSpeak(text) {
    if (_wuCurrentAudio) {
        _wuCurrentAudio.pause();
        _wuCurrentAudio.src = '';
        _wuCurrentAudio = null;
    }
    speechSynthesis.cancel();

    fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    }).then(r => {
        if (!r.ok) throw new Error(r.status);
        return r.blob();
    }).then(blob => {
        const audio = new Audio(URL.createObjectURL(blob));
        _wuCurrentAudio = audio;
        audio.onended = () => { if (_wuCurrentAudio === audio) _wuCurrentAudio = null; };
        audio.play().catch(() => _wuSpeechFallback(text));
    }).catch(() => _wuSpeechFallback(text));
}

function _wuSpeechFallback(text) {
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'uk-UA';
    utt.rate = 0.9;
    speechSynthesis.speak(utt);
}

function _wuFinish() {
    localStorage.setItem(`dialog_done_${_wuUid}`, '1');
    document.getElementById('warmupOverlay').classList.remove('open');
    AnimEngine.trigger('tour');
}
