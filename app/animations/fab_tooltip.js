// anim_fab_tooltip — підказка "Натисни мене! 👆" над кнопкою Скретчика
AnimEngine.register('fab_tooltip', {
    meta: {
        id: 'anim_fab_tooltip',
        name: 'Підказка до помічника',
        description: 'Підсвічуємо або мигаємо кнопкою Скретчика з підказкою "Натисни мене!"',
        where: ['День 1'],
        trigger: 'Перший запуск',
        showRule: 'Тільки один раз',
    },

    shouldShow() {
        if (localStorage.getItem('fab_tooltip_seen')) return false;
        return localStorage.getItem('fab_tooltip_day') !== new Date().toDateString();
    },

    show() {
        const el = document.getElementById('fabTooltip');
        if (!el) return;
        el.classList.remove('hidden');
        localStorage.setItem('fab_tooltip_day', new Date().toDateString());
    },

    markDone() {
        localStorage.setItem('fab_tooltip_seen', '1');
        const el = document.getElementById('fabTooltip');
        if (el) el.classList.add('hidden');
    }
});
