const fs = require('fs');
const path = require('path');

const tasksPath = path.join(__dirname, '../data/tasks.json');
const data = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));

// Filter out arrays or bad data
const tasks = Array.isArray(data) ? data : [];
console.log(`Загалом завдань: ${tasks.length}`);

// Group by day and check sequence
const byDay = {};
tasks.forEach(t => {
    if (!byDay[t.day]) byDay[t.day] = [];
    byDay[t.day].push(t);
});

const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
console.log(`Присутні дні: ${days.join(', ')}`);

let missingAnything = false;

// Check for missing days
if (days.length > 0) {
    const maxDay = days[days.length - 1];
    for (let i = 1; i <= maxDay; i++) {
        if (!days.includes(i)) {
            console.log(`Пропущено День ${i}`);
            missingAnything = true;
        } else {
            // Check orders within the day
            const dayTasks = byDay[i];
            const orders = dayTasks.map(t => t.order_in_day).filter(Boolean).sort((a, b) => a - b);
            if (orders.length > 0) {
                const maxOrder = Math.max(...orders);
                for (let j = 1; j <= maxOrder; j++) {
                    if (!orders.includes(j)) {
                        console.log(`Пропущено завдання order_in_day=${j} у Дні ${i}`);
                        missingAnything = true;
                    }
                }
                if (maxOrder !== 5) {
                    console.log(`У Дні ${i} максимальний order_in_day=${maxOrder} (очікується 5)`);
                    missingAnything = true;
                }
            } else {
                console.log(`У Дні ${i} немає завдань з order_in_day`);
                missingAnything = true;
            }
        }
    }
}

if (!missingAnything) {
    console.log("Усі дні та завдання присутні і без пропусків!");
}
