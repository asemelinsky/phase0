// anim_onboarding — вибір аватара та введення імені при першому вході
AnimEngine.register('onboarding', {
    meta: {
        id: 'anim_onboarding',
        name: 'Онбординг: аватар і ім\'я',
        description: 'При першому вході учень обирає аватар та вводить своє ім\'я',
        where: ['Онбординг'],
        trigger: 'Перший запуск',
        showRule: 'Тільки один раз',
    },

    shouldShow({ uid } = {}) {
        return uid && uid !== 'guest' && !localStorage.getItem(`onboarding_done_${uid}`);
    },

    show({ uid, onDone } = {}) {
        _onboardingUid = uid;
        _onboardingOnDone = onDone || null;
        _ensureOnboardingDOM();
        document.getElementById('onboardingOverlay').classList.add('open');
        AppTTS.speak('Обери свій Скін та напиши ім\'я. Тепер ти зможеш дивитись свій прогрес та приймати участь в змаганнях');
    }
});

const AVATARS = ['🧑', '🧒', '👧', '👩'];
let _selectedAvatarId  = null;
let _onboardingUid     = null;
let _onboardingOnDone  = null;

function _ensureOnboardingDOM() {
    if (document.getElementById('onboardingOverlay')) return;
    const el = document.createElement('div');
    el.id = 'onboardingOverlay';
    el.className = 'onboarding-overlay';
    el.innerHTML = `
        <div class="onboarding-box">
            <div style="font-size:3rem;margin-bottom:0.6rem;">🚀</div>
            <div class="onboarding-title">Ласкаво просимо!</div>
            <div class="onboarding-sub">Обери аватар та введи своє ім'я</div>
            <div class="avatars-grid">
                <div class="avatar-option" data-id="0"><span class="avatar-emoji">🧑</span><span class="avatar-label">Хлопчик 1</span></div>
                <div class="avatar-option" data-id="1"><span class="avatar-emoji">🧒</span><span class="avatar-label">Хлопчик 2</span></div>
                <div class="avatar-option" data-id="2"><span class="avatar-emoji">👧</span><span class="avatar-label">Дівчинка 1</span></div>
                <div class="avatar-option" data-id="3"><span class="avatar-emoji">👩</span><span class="avatar-label">Дівчинка 2</span></div>
            </div>
            <input class="name-input" type="text" id="nameInput" placeholder="Твоє ім'я (наприклад, Олексій)" maxlength="20" autocomplete="off">
            <button class="start-btn" id="startBtn" disabled>Поїхали! 🚀</button>
        </div>`;
    document.body.appendChild(el);

    el.querySelectorAll('.avatar-option').forEach(opt => {
        opt.addEventListener('click', () => selectAvatar(parseInt(opt.dataset.id)));
    });
    el.querySelector('#nameInput').addEventListener('input', updateStartBtn);
    el.querySelector('#startBtn').addEventListener('click', finishOnboarding);
}

function selectAvatar(id) {
    _selectedAvatarId = id;
    document.querySelectorAll('.avatar-option').forEach(el =>
        el.classList.toggle('selected', parseInt(el.dataset.id) === id));
    updateStartBtn();
}

function updateStartBtn() {
    const name = document.getElementById('nameInput').value.trim();
    document.getElementById('startBtn').disabled = _selectedAvatarId === null || name.length < 2;
}

function finishOnboarding() {
    const name = document.getElementById('nameInput').value.trim();
    if (_selectedAvatarId === null || name.length < 2) return;

    const profile = { name, avatarId: _selectedAvatarId, avatarEmoji: AVATARS[_selectedAvatarId] };
    localStorage.setItem(`profile_${_onboardingUid}`, JSON.stringify(profile));
    localStorage.setItem(`onboarding_done_${_onboardingUid}`, '1');

    document.getElementById('onboardingOverlay').classList.remove('open');
    applyProfile(profile);

    if (_onboardingOnDone) _onboardingOnDone(profile);
}

function applyProfile(profile) {
    const bubble = document.getElementById('avatarBubble');
    if (bubble) bubble.textContent = profile.avatarEmoji;
}

function checkOnboarding(uid) {
    const params = new URLSearchParams(window.location.search);
    if (params.has('onboarding')) {
        localStorage.removeItem(`onboarding_done_${uid}`);
        localStorage.removeItem(`warmup_v2_done_${uid}`);
    }
    if (params.has('warmup')) {
        localStorage.removeItem(`warmup_v2_done_${uid}`);
    }

    const profileRaw = localStorage.getItem(`profile_${uid}`);
    if (profileRaw) applyProfile(JSON.parse(profileRaw));
    else {
        const bubble = document.getElementById('avatarBubble');
        if (bubble) bubble.href = `profile.html?uid=${uid}`;
    }

    const onboardingDone = localStorage.getItem(`onboarding_done_${uid}`);

    if (!onboardingDone && uid !== 'guest') {
        AnimEngine.trigger('onboarding', { uid, onDone: () => startWarmupV2(uid) });
    } else if (!localStorage.getItem(`warmup_v2_done_${uid}`)) {
        startWarmupV2(uid);
    }
}
