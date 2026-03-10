#!/usr/bin/env node
/**
 * Перемикач режиму TTS помічника Скретчика
 *
 * Використання:
 *   node scripts/tts-mode.js                     → показати поточний режим
 *   node scripts/tts-mode.js test                → Google Translate (локально)
 *   node scripts/tts-mode.js real                → ElevenLabs (локально)
 *   node scripts/tts-mode.js test --vercel       → Google Translate + деплой на Vercel
 *   node scripts/tts-mode.js real --vercel       → ElevenLabs + деплой на Vercel
 *
 * npm run tts:test / tts:real           — локально
 * npm run tts:test:vercel / tts:real:vercel — + Vercel
 */

const fs            = require('fs');
const path          = require('path');
const { execSync }  = require('child_process');

const ENV_PATH  = path.join(__dirname, '..', '.env');
const arg       = process.argv[2];
const toVercel  = process.argv.includes('--vercel');

// ─── .env helpers ────────────────────────────────────────────────────────────

function readEnv() {
    return fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
}

function setEnvVar(content, key, value) {
    const re = new RegExp(`^${key}=.*$`, 'm');
    return re.test(content)
        ? content.replace(re, `${key}=${value}`)
        : content.trimEnd() + `\n${key}=${value}\n`;
}

function getCurrentMode(content) {
    const m = content.match(/^TTS_MODE=(.+)$/m);
    return m ? m[1].trim() : null;
}

// ─── Vercel helpers ──────────────────────────────────────────────────────────

function vercelSetMode(mode) {
    try {
        // Видаляємо стару змінну (ігноруємо помилку якщо її не було)
        try { execSync('vercel env rm TTS_MODE production --yes 2>&1', { stdio: 'pipe' }); } catch (_) {}
        try { execSync('vercel env rm TTS_MODE preview  --yes 2>&1', { stdio: 'pipe' }); } catch (_) {}

        if (mode === 'test') {
            // Додаємо TTS_MODE=test для production і preview
            // printf замість echo щоб уникнути лапок і \r\n на Windows
            execSync(`printf test | vercel env add TTS_MODE production`, { stdio: 'inherit' });
            execSync(`printf test | vercel env add TTS_MODE preview`,    { stdio: 'inherit' });
            console.log('✅ Vercel: TTS_MODE=test встановлено для production + preview');
        } else {
            // real = просто не має змінної → chain іде по повному ланцюжку
            console.log('✅ Vercel: TTS_MODE видалено (використовується ElevenLabs/Google Cloud)');
        }

        // Redeploy без змін коду
        console.log('\n🚀 Запускаю redeploy...');
        execSync('vercel --prod --force', { stdio: 'inherit' });
        console.log('✅ Vercel redeploy запущено');

    } catch (err) {
        console.error('❌ Помилка Vercel CLI:', err.message);
        process.exit(1);
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────

// Показати поточний режим
if (!arg) {
    const local   = getCurrentMode(readEnv()) || 'real';
    const icon    = local === 'test' ? '🧪' : '🔊';
    const label   = local === 'test'
        ? 'TEST (Google Translate, безкоштовно)'
        : 'REAL (ElevenLabs / Google Cloud, платний)';
    console.log(`${icon} Локальний режим: ${label}`);
    console.log('\nКоманди:');
    console.log('  npm run tts:test          — переключити локально');
    console.log('  npm run tts:real          — переключити локально');
    console.log('  npm run tts:test:vercel   — переключити + деплой на Vercel');
    console.log('  npm run tts:real:vercel   — переключити + деплой на Vercel');
    process.exit(0);
}

if (arg !== 'test' && arg !== 'real') {
    console.error('❌ Невідомий режим. Використовуй: test | real');
    process.exit(1);
}

// Оновити локальний .env
let content = readEnv();
if (arg === 'test') {
    content = setEnvVar(content, 'TTS_MODE', 'test');
    fs.writeFileSync(ENV_PATH, content, 'utf8');
    console.log('🧪 Локально: TTS_MODE=test → Google Translate');
} else {
    content = setEnvVar(content, 'TTS_MODE', 'real');
    fs.writeFileSync(ENV_PATH, content, 'utf8');
    console.log('🔊 Локально: TTS_MODE=real → ElevenLabs / Google Cloud');
}

if (!toVercel) {
    console.log('\n⚠️  Перезапусти сервер: npm run dev');
    console.log('💡 Для Vercel: npm run tts:' + arg + ':vercel');
    process.exit(0);
}

// Оновити Vercel + redeploy
console.log('\n📡 Оновлюю Vercel...');
vercelSetMode(arg);
