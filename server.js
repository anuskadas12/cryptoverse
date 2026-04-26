require('dotenv').config();
const express = require('express');
const path = require('path');
const getAi = require('./ai');
const app = express();
const cors = require('cors');
const port = Number(process.env.PORT || process.env.port || 4000);

app.use(cors());
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({ ok: true });
});

app.post('/ai', async (req, res, next) => {
    try {
        const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required.' });
        }

        if (prompt.length > 4000) {
            return res.status(413).json({ error: 'Prompt is too long. Please keep it under 4000 characters.' });
        }

        const response = await getAi(prompt);
        res.json({ response });
    } catch (error) {
        next(error);
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found.' });
});

app.use((error, req, res, next) => {
    console.error(error);
    const status = error.status || 500;
    res.status(status).json({
        error: status === 500 ? 'Something went wrong. Please try again later.' : error.message,
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

