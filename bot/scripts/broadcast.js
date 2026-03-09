/**
 * Manual broadcast script
 * Usage:
 *   node scripts/broadcast.js           — send to all users in data/users.json
 *   node scripts/broadcast.js 191242216 — send to specific chatId only
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);
const usersDB = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'users.json'), 'utf8'));
const targetId = process.argv[2] || null;

async function sendTo(chatId, user) {
    const appUrl = `https://phase0-five.vercel.app/app/progress.html?uid=${user.uid}`;
    const msg = `⏰ Час для нового завдання!\n\nТвоє завдання дня вже доступне:\n▶️ ${appUrl}`;
    console.log(`→ chatId ${chatId}: ${appUrl}`);
    await bot.telegram.sendMessage(chatId, msg);
    console.log(`  ✅ надіслано`);
}

async function run() {
    if (targetId) {
        const user = usersDB[targetId];
        if (!user) { console.error(`chatId ${targetId} не знайдено у users.json`); process.exit(1); }
        await sendTo(targetId, user);
    } else {
        console.log(`Розсилка всім (${Object.keys(usersDB).length} юзерів)...`);
        for (const chatId in usersDB) {
            await sendTo(chatId, usersDB[chatId]);
        }
    }
    process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
