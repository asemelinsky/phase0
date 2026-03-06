require('dotenv').config();
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

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
    const appUrl = `http://localhost:3000/app/progress.html?uid=${uid}`; // Change domain later

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
        `Щоб переглянути всі завдання, відкрий мапу пригод: http://localhost:3000/app/progress.html?uid=${user.uid}`
    );
});

// --- Daily Cron Job (09:00 Kyiv time) ---
function runDailyBroadcast() {
    console.log("Running daily broadcast...");

    for (const chatId in usersDB) {
        const user = usersDB[chatId];
        const appUrl = `http://localhost:3000/app/task.html?uid=${user.uid}`;

        bot.telegram.sendMessage(
            chatId,
            `⏰ Час для нового завдання!\n\n` +
            `Твоє завдання дня вже доступне:\n` +
            `▶️ ${appUrl}`
        ).catch(err => console.error(`Failed to send to ${chatId}:`, err));
    }
}

cron.schedule('0 9 * * *', runDailyBroadcast, {
    scheduled: true,
    timezone: "Europe/Kiev"
});

// --- Test Command for Debugging ---
bot.command('test_broadcast', (ctx) => {
    ctx.reply("Запускаю тестову розсилку щоденного завдання...");

    const chatId = ctx.from.id;
    if (!usersDB[chatId]) {
        // Mock a user if they aren't registered yet so the broadcast works
        usersDB[chatId] = {
            uid: generateUid(),
            registeredAt: new Date()
        };
        saveDB(); // Save mock state persistently
    }

    const user = usersDB[chatId];
    const appUrl = `http://localhost:3000/app/task.html?uid=${user.uid}`;

    bot.telegram.sendMessage(
        chatId,
        `⏰ Час для нового завдання!\n\n` +
        `Твоє завдання дня вже доступне:\n` +
        `▶️ ${appUrl}`
    ).catch(err => console.error(`Failed to send to ${chatId}:`, err));
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
