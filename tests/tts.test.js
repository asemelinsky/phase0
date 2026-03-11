/**
 * tests/tts.test.js — Unit тести AppTTS
 */

// ── мок браузерних API ──────────────────────────────────────────────────────

let audioInstances = [];

class MockAudio {
    constructor(src = '') {
        this.src = src;
        this.paused = false;
        this.onended = null;
        this.onerror = null;
        audioInstances.push(this);
    }
    play()  { return Promise.resolve(); }
    pause() { this.paused = true; }
}

global.Audio = MockAudio;
global.URL = { createObjectURL: jest.fn(() => 'blob:mock'), revokeObjectURL: jest.fn() };
global.speechSynthesis = { speak: jest.fn(), cancel: jest.fn() };
global.SpeechSynthesisUtterance = jest.fn(function(text) { this.text = text; });

// ── підключення модуля ──────────────────────────────────────────────────────

const AppTTS = require('../app/tts');

// ── хелпери ─────────────────────────────────────────────────────────────────

function mockFetchOk() {
    global.fetch = jest.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
    }));
}

function mockFetchFail() {
    global.fetch = jest.fn(() => Promise.reject(new Error('network')));
}

beforeEach(() => {
    audioInstances = [];
    jest.clearAllMocks();
    AppTTS.stop(); // скидаємо стан між тестами
});

// ── тести ────────────────────────────────────────────────────────────────────

describe('AppTTS.speak', () => {
    test('викликає /api/tts з правильним текстом', async () => {
        mockFetchOk();
        AppTTS.speak('Привіт!');
        expect(fetch).toHaveBeenCalledWith('/api/tts', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ text: 'Привіт!' }),
        }));
    });

    test('стрипує markdown перед відправкою', async () => {
        mockFetchOk();
        AppTTS.speak('**жирний** і `код`');
        expect(fetch).toHaveBeenCalledWith('/api/tts', expect.objectContaining({
            body: JSON.stringify({ text: 'жирний і код' }),
        }));
    });

    test('при успіху — встановлює src аудіо і грає', async () => {
        mockFetchOk();
        AppTTS.speak('тест');
        await new Promise(r => setTimeout(r, 10)); // чекаємо Promise chain
        const audio = audioInstances.find(a => a.src === 'blob:mock');
        expect(audio).toBeDefined();
    });

    test('при помилці fetch — fallback на speechSynthesis', async () => {
        mockFetchFail();
        AppTTS.speak('fallback текст');
        await new Promise(r => setTimeout(r, 10));
        expect(speechSynthesis.speak).toHaveBeenCalled();
        const utt = speechSynthesis.speak.mock.calls[0][0];
        expect(utt.text).toBe('fallback текст');
    });

    test('викликає onEnd після завершення аудіо', async () => {
        mockFetchOk();
        const onEnd = jest.fn();
        AppTTS.speak('тест', onEnd);
        await new Promise(r => setTimeout(r, 10));
        const audio = audioInstances.find(a => a.src === 'blob:mock');
        audio.onended();
        expect(onEnd).toHaveBeenCalled();
    });

    test('новий speak() зупиняє попереднє аудіо', async () => {
        mockFetchOk();
        AppTTS.speak('перший');
        await new Promise(r => setTimeout(r, 10));
        const first = audioInstances.find(a => a.src === 'blob:mock');
        AppTTS.speak('другий');
        expect(first.paused).toBe(true);
    });
});

describe('AppTTS.stop', () => {
    test('зупиняє поточне аудіо', async () => {
        mockFetchOk();
        AppTTS.speak('тест');
        await new Promise(r => setTimeout(r, 10));
        const audio = audioInstances.find(a => a.src === 'blob:mock');
        AppTTS.stop();
        expect(audio.paused).toBe(true);
    });

    test('викликає speechSynthesis.cancel()', () => {
        AppTTS.stop();
        expect(speechSynthesis.cancel).toHaveBeenCalled();
    });
});
