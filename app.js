const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/heatiq';

let cachedConnection = null;

async function connectDB() {
    if (cachedConnection && mongoose.connection.readyState === 1) {
        return cachedConnection;
    }
    try {
        cachedConnection = await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false
        });
        console.log('MongoDB connected');
        return cachedConnection;
    } catch (err) {
        console.log('MongoDB error:', err.message);
        throw err;
    }
}

app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(500).json({ error: 'Database connection failed' });
    }
});

const users = require('./routes/users');
const weather = require('./routes/weather');
const reports = require('./routes/reports');
const admin = require('./routes/admin');

app.use('/users', users);
app.use('/weather', weather);
app.use('/reports', reports);
app.use('/admin', admin);

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`HeatIQ server running on http://localhost:${port}`);
    });
}

module.exports = app;