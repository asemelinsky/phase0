// AppSTT — глобальний модуль розпізнавання мовлення (Speech-to-Text)
// AppSTT.listen(onResult, onError?) — запустити запис
// AppSTT.stop()                     — зупинити запис
// AppSTT.supported()                — чи підтримує браузер

const AppSTT = (() => {
    let _recognition = null;

    function supported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    function stop() {
        if (_recognition) {
            _recognition.abort();
            _recognition = null;
        }
    }

    function listen(onResult, onError) {
        stop();

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            if (onError) onError('unsupported');
            return;
        }

        const r = new SR();
        r.lang = 'uk-UA';
        r.interimResults = false;
        r.maxAlternatives = 1;
        _recognition = r;

        r.onresult = e => {
            _recognition = null;
            const text = e.results[0][0].transcript;
            if (onResult) onResult(text);
        };

        r.onerror = e => {
            _recognition = null;
            if (onError) onError(e.error);
        };

        r.onend = () => {
            if (_recognition === r) _recognition = null;
        };

        r.start();
    }

    return { listen, stop, supported };
})();

if (typeof module !== 'undefined') module.exports = AppSTT;
