const express = require('express');
const path = require('path');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
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

const { ASSISTANT_SYSTEM_PROMPT, buildUserMessage } = require('./data/assistant-config');

// Special one-off prompts (fact/joke) that don't need task context
const SPECIAL_PROMPTS = {
    fact: `Розкажи один дивовижний факт про програмування або комп'ютери для дитини 6–9 років. Факт має бути простим і захоплюючим. 1–2 речення. Тільки українська мова.`,
    joke: `Розкажи смішний короткий жарт про програмування, комп'ютери або роботів для дитини 6–9 років. Жарт має бути простим і зрозумілим. 2–3 речення. Тільки українська мова.`,
    warmup: (q) => `Ти — веселий викладач, який вперше зустрічається з учнем перед початком курсу програмування. Учень запитав: "${q || 'щось цікаве'}". Дай жартівливу, коротку і дружню відповідь (1–2 речення). Зроби зв'язок з тим, що програмування — це весело і круто. Тільки українська мова.`,
};

app.post('/api/hint', async (req, res) => {
    try {
        const { action = 'start', taskTitle, taskDay, taskStatus, userInput, task = {} } = req.body;

        let system = ASSISTANT_SYSTEM_PROMPT;
        let userContent;

        if (action === 'fact' || action === 'joke') {
            system = 'Ти — веселий помічник для дітей 6–9 років. Тільки українська мова.';
            userContent = SPECIAL_PROMPTS[action];
        } else if (action === 'warmup') {
            system = 'Ти — веселий викладач програмування для дітей. Тільки українська мова.';
            userContent = SPECIAL_PROMPTS.warmup(userInput || task?.question);
        } else {
            // task help / voice question / success state
            userContent = buildUserMessage({
                taskTitle: taskTitle || task?.title,
                taskDay:   taskDay   || task?.day,
                taskStatus,
                userInput: userInput || task?.question,
            });
        }

        const message = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            system,
            messages: [{ role: 'user', content: userContent }],
        });

        res.json({ success: true, hint: message.content[0].text.trim() });
    } catch (err) {
        console.error('❌ /api/hint:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── TTS Chain ───────────────────────────────────────────────────────────────

function escapeXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ttsAzure(text, { key, region, voice }, res, next) {
    voice = voice || 'uk-UA-OstapNeural';
    const ssml = `<speak version='1.0' xml:lang='uk-UA'><voice name='${voice}'>${escapeXml(text)}</voice></speak>`;
    const body = Buffer.from(ssml);
    const req2 = https.request({
        hostname: `${region || 'eastus'}.tts.speech.microsoft.com`,
        path: '/cognitiveservices/v1',
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
            'Content-Length': body.length,
        }
    }, r => {
        if (r.statusCode !== 200) { console.warn(`⚠️ Azure TTS: ${r.statusCode}`); r.resume(); return next(); }
        res.setHeader('Content-Type', 'audio/mpeg');
        r.pipe(res);
    });
    req2.on('error', err => { console.warn('⚠️ Azure TTS:', err.message); next(); });
    req2.write(body);
    req2.end();
}

function ttsElevenLabs(text, { key, voice }, res, next) {
    voice = voice || '0ZQZuw8Sn4cU0rN1Tm2K';
    const body = JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    });
    const req2 = https.request({
        hostname: 'api.elevenlabs.io',
        path: `/v1/text-to-speech/${voice}`,
        method: 'POST',
        headers: {
            'xi-api-key': key,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
            'Content-Length': Buffer.byteLength(body),
        }
    }, r => {
        if (r.statusCode !== 200) { console.warn(`⚠️ ElevenLabs TTS: ${r.statusCode}`); r.resume(); return next(); }
        res.setHeader('Content-Type', 'audio/mpeg');
        r.pipe(res);
    });
    req2.on('error', err => { console.warn('⚠️ ElevenLabs TTS:', err.message); next(); });
    req2.write(body);
    req2.end();
}

function ttsGoogleCloud(text, { key, voice }, res, next) {
    voice = voice || 'uk-UA-Wavenet-D';
    const body = JSON.stringify({
        input: { text },
        voice: { languageCode: 'uk-UA', name: voice },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 }
    });
    const req2 = https.request({
        hostname: 'texttospeech.googleapis.com',
        path: `/v1/text:synthesize?key=${key}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, r => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => {
            if (r.statusCode !== 200) { console.warn(`⚠️ Google Cloud TTS: ${r.statusCode}`); return next(); }
            try {
                const buf = Buffer.from(JSON.parse(Buffer.concat(chunks).toString()).audioContent, 'base64');
                res.setHeader('Content-Type', 'audio/mpeg');
                res.end(buf);
            } catch(e) { console.warn('⚠️ Google Cloud TTS parse:', e.message); next(); }
        });
    });
    req2.on('error', err => { console.warn('⚠️ Google Cloud TTS:', err.message); next(); });
    req2.write(body);
    req2.end();
}

function ttsVoiceRSS(text, { key }, res, next) {
    const encoded = encodeURIComponent(text.slice(0, 300));
    const req2 = https.request({
        hostname: 'api.voicerss.org',
        path: `/?key=${key}&hl=uk-ua&src=${encoded}&c=MP3&f=16khz_16bit_stereo`,
        method: 'GET',
    }, r => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => {
            const buf = Buffer.concat(chunks);
            if (r.statusCode !== 200 || buf.toString('utf8', 0, 6) === 'ERROR:') {
                console.warn('⚠️ VoiceRSS:', r.statusCode, buf.toString().slice(0, 60));
                return next();
            }
            res.setHeader('Content-Type', 'audio/mpeg');
            res.end(buf);
        });
    });
    req2.on('error', err => { console.warn('⚠️ VoiceRSS:', err.message); next(); });
    req2.end();
}

function ttsGoogleTranslate(text, res, next) {
    const encoded = encodeURIComponent(text.slice(0, 200));
    const req2 = https.request({
        hostname: 'translate.google.com',
        path: `/translate_tts?ie=UTF-8&q=${encoded}&tl=uk&client=tw-ob&ttsspeed=0.9`,
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0' }
    }, r => {
        if (r.statusCode !== 200) { console.warn(`⚠️ Google TTS: ${r.statusCode}`); r.resume(); return next(); }
        res.setHeader('Content-Type', 'audio/mpeg');
        r.pipe(res);
    });
    req2.on('error', err => { console.warn('⚠️ Google TTS:', err.message); next(); });
    req2.end();
}

function getTTSChain() {
    // test mode — тільки безкоштовний Google Translate
    if ((process.env.TTS_MODE || '').trim().replace(/^"|"$/g, '') === 'test') {
        console.log('🧪 TTS_MODE=test → google_translate only');
        return [{ name: 'google_translate' }];
    }

    const chain = [];
    // Legacy: ELEVENLABS_API_KEY has top priority if set
    if (process.env.ELEVENLABS_API_KEY) {
        chain.push({
            name: 'elevenlabs',
            key:   process.env.ELEVENLABS_API_KEY,
            voice: process.env.ELEVENLABS_VOICE_ID || 'Ntd0iVwICtUtA6Fvx27M',
        });
    }
    for (let i = 1; i <= 9; i++) {
        const name = process.env[`TTS_${i}_PROVIDER`];
        if (!name) break;
        chain.push({
            name,
            key:    process.env[`TTS_${i}_KEY`]    || '',
            region: process.env[`TTS_${i}_REGION`] || 'eastus',
            voice:  process.env[`TTS_${i}_VOICE`]  || '',
        });
    }
    if (!chain.find(p => p.name === 'google_translate')) {
        chain.push({ name: 'google_translate' });
    }
    return chain;
}

function runTTSChain(text, chain, i, res) {
    if (i >= chain.length) return res.status(502).json({ error: 'All TTS providers failed' });
    const p = chain[i];
    const next = () => runTTSChain(text, chain, i + 1, res);
    console.log(`🔊 TTS [${i + 1}/${chain.length}]: ${p.name}`);
    if (p.name === 'azure'            && p.key) return ttsAzure(text, p, res, next);
    if (p.name === 'google_cloud'     && p.key) return ttsGoogleCloud(text, p, res, next);
    if (p.name === 'voicerss'         && p.key) return ttsVoiceRSS(text, p, res, next);
    if (p.name === 'elevenlabs'       && p.key) return ttsElevenLabs(text, p, res, next);
    if (p.name === 'google_translate')          return ttsGoogleTranslate(text, res, next);
    next(); // unknown provider or missing key → skip
}

app.get('/api/tts-status', (req, res) => {
    const chain = getTTSChain();
    res.json({
        mode: process.env.TTS_MODE || 'real',
        providers: chain.map(p => p.name),
    });
});

app.post('/api/tts', (req, res) => {
    const text = (req.body.text || '').slice(0, 500);
    if (!text) return res.status(400).json({ error: 'text required' });
    runTTSChain(text, getTTSChain(), 0, res);
});

// ─── Schedule API ────────────────────────────────────────────────────────────

const SCHEDULES_PATH = path.join(__dirname, 'data', 'schedules.json');

function loadSchedules() {
    try { return JSON.parse(fs.readFileSync(SCHEDULES_PATH, 'utf-8')); }
    catch (_) { return {}; }
}

function saveSchedules(data) {
    fs.writeFileSync(SCHEDULES_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/schedule', (req, res) => {
    const uid = req.query.uid;
    if (!uid) return res.status(400).json({ error: 'uid required' });
    const schedules = loadSchedules();
    // Default: every day
    const result = schedules[uid] || { days: [1, 2, 3, 4, 5, 6, 7] };
    res.json(result);
});

app.post('/api/schedule', (req, res) => {
    const { uid, days } = req.body;
    if (!uid || !Array.isArray(days)) return res.status(400).json({ error: 'uid and days required' });
    const schedules = loadSchedules();
    schedules[uid] = { days: days.filter(d => Number.isInteger(d) && d >= 1 && d <= 7).sort((a, b) => a - b) };
    saveSchedules(schedules);
    res.json({ success: true });
});

// ─── User State API ──────────────────────────────────────────────────────────

const STATES_PATH = path.join(__dirname, 'data', 'user-states.json');

function loadStates() {
    try { return JSON.parse(fs.readFileSync(STATES_PATH, 'utf-8')); }
    catch (_) { return {}; }
}
function saveStates(data) {
    fs.writeFileSync(STATES_PATH, JSON.stringify(data, null, 2), 'utf-8');
}
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}
function defaultState() {
    return { lastActivityDate: null, missedDays: 0, frozenUntil: null, frozenAt: null, skippedHard: [] };
}

// GET /api/user-state?uid=xxx — for bot and progress.html
app.get('/api/user-state', (req, res) => {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: 'uid required' });
    const states    = loadStates();
    const schedules = loadSchedules();
    const state     = states[uid] || defaultState();
    res.json({ ...state, schedule: schedules[uid] || { days: [1, 2, 3, 4, 5, 6, 7] } });
});

// POST /api/activity — client reports task_open / task_done / skip_hard
app.post('/api/activity', (req, res) => {
    const { uid, action, taskId } = req.body;
    if (!uid || !action) return res.status(400).json({ error: 'uid and action required' });
    const states = loadStates();
    if (!states[uid]) states[uid] = defaultState();
    const s = states[uid];

    if (action === 'task_open' || action === 'task_done') {
        s.lastActivityDate = todayStr();
        if (action === 'task_done') {
            s.missedDays  = 0;
            s.frozenUntil = null; // auto-unfreeze when user actually studies
            s.frozenAt    = null;
        }
    }
    if (action === 'skip_hard' && taskId) {
        if (!s.skippedHard) s.skippedHard = [];
        if (!s.skippedHard.includes(taskId)) s.skippedHard.push(taskId);
    }
    saveStates(states);
    res.json({ success: true });
});

// POST /api/freeze-action — bot freezes / unfreezes / increments missed counter
app.post('/api/freeze-action', (req, res) => {
    const { uid, action, missedDays } = req.body;
    if (!uid || !action) return res.status(400).json({ error: 'uid and action required' });
    const states = loadStates();
    if (!states[uid]) states[uid] = defaultState();
    const s = states[uid];

    if (action === 'freeze') {
        const until = new Date();
        until.setDate(until.getDate() + 5);
        s.frozenUntil = until.toISOString().slice(0, 10);
        s.frozenAt    = todayStr();
        s.missedDays  = 3;
    } else if (action === 'unfreeze') {
        s.frozenUntil = null;
        s.frozenAt    = null;
        s.missedDays  = 0;
    } else if (action === 'increment_missed' && typeof missedDays === 'number') {
        s.missedDays = missedDays;
    }
    saveStates(states);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер: http://localhost:${PORT}`);
    console.log(`🔗 Завдання: http://localhost:${PORT}/app/task.html`);
    if (!process.env.ANTHROPIC_API_KEY) console.error('❌ ANTHROPIC_API_KEY не задано!');
});
