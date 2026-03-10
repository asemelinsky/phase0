// AnimEngine — реєстр навчальних анімацій
// Кожна анімація реєструється тут і викликається через AnimEngine.trigger()

const AnimEngine = (() => {
    const registry = {};

    return {
        register(id, anim) {
            registry[id] = anim;
        },

        trigger(id, ctx = {}) {
            const anim = registry[id];
            if (!anim) return console.warn(`AnimEngine: "${id}" not registered`);
            if (typeof anim.shouldShow === 'function' && !anim.shouldShow(ctx)) return;
            anim.show(ctx);
        },

        getAll() {
            return Object.entries(registry).map(([id, a]) => ({ id, ...a.meta }));
        }
    };
})();
