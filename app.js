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

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB error:', err));

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