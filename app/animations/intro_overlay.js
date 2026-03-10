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

    show({ taskId, uid, text, onClose } = {}) {
        const overlay = document.getElementById('introOverlay');
        const textEl  = document.getElementById('introText');
        if (!overlay || !textEl) return;

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
