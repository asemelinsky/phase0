const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from 'app' and 'data'
app.use('/app', express.static(path.join(__dirname, 'app')));
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Static folder for root (if needed)
app.get('/', (req, res) => {
    res.redirect('/app/task.html');
});

// API Placeholder for Claude Hints
app.post('/api/hint', async (req, res) => {
    // Logic for Claude AI hints will be implemented here in the next steps
    res.json({ hint: "Я поки що вчуся підказувати через AI! Використовуй підказки з JSON." });
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено!`);
    console.log(`🔗 Відкрий сторінку: http://localhost:${PORT}/app/task.html`);
    console.log(`📝 Застосуй UID для тесту: http://localhost:${PORT}/app/task.html?uid=test_user`);
});
