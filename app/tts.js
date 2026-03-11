// AppTTS — глобальний двіжок озвучки
// AppTTS.speak(text, onEnd?) — озвучити текст
// AppTTS.stop()              — зупинити поточне аудіо

const AppTTS = (() => {
    const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    let _current = null;

    function stripMarkdown(t) {
        return t
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/_{1,2}(.*?)_{1,2}/g, '$1')
            .replace(/#+\s/g, '')
            .trim();
    }

    function stop() {
        if (_current) { _current.pause(); _current.src = ''; _current = null; }
        speechSynthesis.cancel();
    }

    function speak(text, onEnd) {
        text = stripMarkdown(text);
        stop();

        // Unlock autoplay synchronously (iOS/Android requirement)
        const audio = new Audio(SILENT_WAV);
        _current = audio;
        audio.play().catch(() => {});

        const finish = () => {
            if (_current === audio) _current = null;
            if (onEnd) onEnd();
        };

        fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        }).then(r => {
            if (!r.ok) throw new Error(r.status);
            return r.blob();
        }).then(blob => {
            if (_current !== audio) return; // скасовано
            const url = URL.createObjectURL(blob);
            audio.src = url;
            audio.onended = () => { URL.revokeObjectURL(url); finish(); };
            audio.onerror = finish;
            audio.play().catch(finish);
        }).catch(() => {
            if (_current !== audio) return;
            _current = null;
            const utt = new SpeechSynthesisUtterance(text);
            utt.lang = 'uk-UA';
            utt.rate = 0.9;
            utt.onend  = finish;
            utt.onerror = finish;
            speechSynthesis.speak(utt);
        });
    }

    return { speak, stop };
})();

if (typeof module !== 'undefined') module.exports = AppTTS;
