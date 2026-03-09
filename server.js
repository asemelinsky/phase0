const express = require('express');
const path = require('path');
const cors = require('cors');
const https = require('https');
const { Anthropic } = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/app', express.static(path.join(__dirname, 'app')));
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/', (_req, res) => res.redirect('/app/task.html'));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Ти — Скретчик, найкращий друг дитини 6–9 років.
Ти веселий, любиш жартувати і завжди підбадьорюєш.
Мова: тільки українська.
Стиль: коротко (1–3 речення), тепло, з емодзі (максимум 3).
Ніколи не давай відповідь прямо — тільки підказуй напрямок.
Виняток: якщо дитина запитує "що робити" або "не розумію" — поясни завдання зрозуміло і конкретно.`;

function buildPrompt(action, task) {
    const name = task?.title || 'завдання';
    const desc = task?.description || '';

    switch (action) {
        case 'start':
            return `Завдання: "${name}". ${desc}
Дитина тільки відкрила завдання. Коротко привітай і дай перший натяк що треба зробити.`;

        case 'wrong':
            return `Завдання: "${name}".
Дитина намагалась але щось пішло не так. М'яко підбадьор і дай натяк. Не кажи відповідь прямо.`;

        case 'correct':
            return `Завдання "${name}" виконано! Дитина молодець. Привітай радісно (1–2 речення).`;

        case 'joke':
            return `Розкажи смішний короткий жарт про програмування, комп'ютери або роботів для дитини 6–9 років. Жарт має бути простим і зрозумілим. 2–3 речення.`;

        case 'fact':
            return `Розкажи один дивовижний факт про програмування або комп'ютери для дитини 6–9 років. Факт має бути простим і захоплюючим. 1–2 речення.`;

        case 'question':
            return `Дитина зараз виконує завдання "${name}".
Вона сказала вголос: ${task?.question || 'щось цікаве'}.
Дай коротку і корисну відповідь. Якщо дитина питає що робити — поясни завдання просто і конкретно.`;

        default:
            return `Підкажи дитині щодо завдання "${name}". Коротко і дружньо.`;
    }
}

app.post('/api/hint', async (req, res) => {
    try {
        const { action = 'start', task = {} } = req.body;

        const message = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: buildPrompt(action, task) }],
        });

        res.json({ success: true, hint: message.content[0].text.trim() });
    } catch (err) {
        console.error('❌ /api/hint:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/tts', (req, res) => {
    const text = (req.body.text || '').slice(0, 500);
    if (!text) return res.status(400).json({ error: 'text required' });

    const elKey = process.env.ELEVENLABS_API_KEY;

    if (elKey) {
        // ElevenLabs
        const voiceId = process.env.ELEVENLABS_VOICE_ID || '0ZQZuw8Sn4cU0rN1Tm2K';
        const body = JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        });
        const req2 = https.request({
            hostname: 'api.elevenlabs.io',
            path: `/v1/text-to-speech/${voiceId}`,
            method: 'POST',
            headers: {
                'xi-api-key': elKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
                'Content-Length': Buffer.byteLength(body)
            }
        }, r => {
            if (r.statusCode !== 200) { res.status(502).json({ error: `EL: ${r.statusCode}` }); r.resume(); return; }
            res.setHeader('Content-Type', 'audio/mpeg');
            r.pipe(res);
        });
        req2.on('error', err => { console.error('❌ EL TTS:', err.message); res.status(500).json({ error: err.message }); });
        req2.write(body);
        req2.end();
    } else {
        // Google Translate fallback
        const encoded = encodeURIComponent(text.slice(0, 200));
        const req2 = https.request({
            hostname: 'translate.google.com',
            path: `/translate_tts?ie=UTF-8&q=${encoded}&tl=uk&client=tw-ob&ttsspeed=0.9`,
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }, r => {
            if (r.statusCode !== 200) { res.status(502).json({ error: `GT: ${r.statusCode}` }); r.resume(); return; }
            res.setHeader('Content-Type', 'audio/mpeg');
            r.pipe(res);
        });
        req2.on('error', err => { console.error('❌ GT TTS:', err.message); res.status(500).json({ error: err.message }); });
        req2.end();
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер: http://localhost:${PORT}`);
    console.log(`🔗 Завдання: http://localhost:${PORT}/app/task.html`);
    if (!process.env.ANTHROPIC_API_KEY) console.error('❌ ANTHROPIC_API_KEY не задано!');
});
