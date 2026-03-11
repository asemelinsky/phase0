require('dotenv').config();
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const http = require('http');

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- Dummy JSON DB (Fallback before Supabase) ---
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load DB from file if it exists
let usersDB = {};
if (fs.existsSync(dbPath)) {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        usersDB = JSON.parse(data);
    } catch (error) {
        console.error("Error reading users.json:", error);
    }
}

function saveDB() {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(usersDB, null, 2));
    } catch (error) {
        console.error("Error writing users.json:", error);
    }
}

function generateUid() {
    return 'user_' + Math.random().toString(36).substr(2, 6);
}

// --- /start Command ---
bot.command('start', (ctx) => {
    const chatId = ctx.from.id;

    if (!usersDB[chatId]) {
        usersDB[chatId] = {
            uid: generateUid(),
            registeredAt: new Date()
        };
        saveDB(); // Save state persistently
    }

    const uid = usersDB[chatId].uid;
    // URL to the learning app where UID parameter is passed (map by default)
    const appUrl = `https://phase0-five.vercel.app/app/progress.html?uid=${uid}`;

    ctx.reply(
        `Привіт! 👋 Я твій помічник у Кодомандрах.\n\n` +
        `Твоє перше завдання вже чекає. Переходь за посиланням, щоб почати гру:\n` +
        `▶️ ${appUrl}\n\n` +
        `Я буду нагадувати тобі про нові завдання щоранку о 9:00!`
    );
});

// --- /progress Command ---
bot.command('progress', (ctx) => {
    const chatId = ctx.from.id;
    const user = usersDB[chatId];

    if (!user) {
        return ctx.reply("Ти ще не зареєстрований! Натисни /start, щоб почати свою пригоду.");
    }

    const diffMs = Math.abs(new Date() - new Date(user.registeredAt));
    const daysSinceReg = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

    ctx.reply(
        `📊 Твій прогрес:\n\n` +
        `Відкрито завдань: ${daysSinceReg} з 30\n` +
        `Твій UID: ${user.uid}\n\n` +
        `Щоб переглянути всі завдання, відкрий мапу пригод: https://phase0-five.vercel.app/app/progress.html?uid=${user.uid}`
    );
});

// --- User state helpers ---
const SERVER_URL = process.env.APP_URL || 'https://phase0-five.vercel.app';

function todayStr() { return new Date().toISOString().slice(0, 10); }
function todayDow() {
    // 1=Пн ... 7=Нд (ISO weekday)
    const d = new Date().getDay(); // 0=Sun..6=Sat
    return d === 0 ? 7 : d;
}

async function fetchUserState(uid) {
    return new Promise((resolve) => {
        const url = new URL(`/api/user-state?uid=${uid}`, SERVER_URL);
        const mod = url.protocol === 'https:' ? require('https') : require('http');
        mod.get(url.toString(), (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (_) { resolve({}); }
            });
        }).on('error', () => resolve({}));
    });
}

async function postFreezeAction(uid, body) {
    return new Promise((resolve) => {
        const url = new URL('/api/freeze-action', SERVER_URL);
        const bodyStr = JSON.stringify({ uid, ...body });
        const mod = url.protocol === 'https:' ? require('https') : require('http');
        const req = mod.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
        }, (res) => { res.resume(); resolve(); });
        req.on('error', () => resolve());
        req.write(bodyStr);
        req.end();
    });
}

// --- Daily Cron Job (09:00 Kyiv time) ---
async function runDailyBroadcast() {
    console.log("Running daily broadcast...");
    const today = todayStr();
    const dow   = todayDow();

    for (const chatId in usersDB) {
        const botUser = usersDB[chatId];
        const uid = botUser.uid;
        const appUrl = `${SERVER_URL}/app/progress.html?uid=${uid}`;

        try {
            const state = await fetchUserState(uid);
            const scheduledDays = state.schedule?.days || [1,2,3,4,5,6,7];

            // 1. Not a scheduled day — skip
            if (!scheduledDays.includes(dow)) continue;

            // 2. Freeze expired → auto-unfreeze and notify
            if (state.frozenUntil && today > state.frozenUntil) {
                await postFreezeAction(uid, { action: 'unfreeze' });
                await bot.telegram.sendMessage(chatId,
                    `👋 Пройшло 5 днів. Доступ відновлено!\n\nПовертайся — твої завдання чекають:\n▶️ ${appUrl}`
                );
                botUser.lastReminderDate = today;
                continue;
            }

            // 3. Still frozen — skip
            if (state.frozenUntil && today <= state.frozenUntil) continue;

            // 4. Already studied today — skip
            if (state.lastActivityDate === today) continue;

            // 5. Check if missed: had reminder before and didn't study since then
            let missedDays = state.missedDays || 0;
            const lastReminder = botUser.lastReminderDate;
            if (lastReminder && lastReminder < today &&
                (!state.lastActivityDate || state.lastActivityDate < lastReminder)) {
                missedDays++;
                await postFreezeAction(uid, { action: 'increment_missed', missedDays });
            }

            // 6. Choose message
            let msg;
            if (missedDays === 0) {
                msg = `⏰ Час для заняття! Твоє завдання вже чекає:\n▶️ ${appUrl}`;
            } else if (missedDays === 1) {
                msg = `😔 Вчора ти не займався. Залишилось 2 пропуски 😉\n▶️ ${appUrl}`;
            } else if (missedDays === 2) {
                msg = `⚠️ Увага! Вже 2 пропуски. Ще один — і доступ заморозиться на 5 днів!\n▶️ ${appUrl}`;
            } else {
                // missedDays >= 3 → freeze
                await postFreezeAction(uid, { action: 'freeze' });
                msg = `❄️ Вибач, ти не займаєшся вже 3 заняття поспіль. Заморожую доступ на 5 днів. Повернемось через 5 днів!`;
            }

            await bot.telegram.sendMessage(chatId, msg);
            botUser.lastReminderDate = today;

        } catch (err) {
            console.error(`Error processing ${chatId}:`, err.message);
        }
    }
    saveDB();
}

cron.schedule('0 9 * * *', runDailyBroadcast, {
    scheduled: true,
    timezone: "Europe/Kiev"
});

// --- Test Command for Debugging ---
bot.command('test_broadcast', async (ctx) => {
    const chatId = ctx.from.id;
    if (!usersDB[chatId]) {
        usersDB[chatId] = { uid: generateUid(), registeredAt: new Date() };
        saveDB();
    }
    ctx.reply("Запускаю тестову розсилку...");
    await runDailyBroadcast();
    ctx.reply("Готово!");
});

// Start the bot
bot.launch().then(() => {
    console.log('🤖 Бот успішно запущено!');
}).catch(err => {
    console.error('Помилка запуску бота:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// --- Dummy HTTP Server for Render ---
// Render Web Services require the app to bind to a port, otherwise the deploy fails.
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('Bot is running!\n');
    res.end();
}).listen(PORT, () => {
    console.log(`Dummy health-check server listening on port ${PORT}`);
});
