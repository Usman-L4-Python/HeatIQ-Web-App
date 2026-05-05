const express = require('express');
const router = express.Router();

function getRiskLevel(feelsLike) {
    if (feelsLike < 32) return 'Low';
    if (feelsLike <= 38) return 'Moderate';
    if (feelsLike <= 45) return 'High';
    return 'Extreme';
}

function getTips(riskLevel) {
    const tipsByLevel = {
        Low: [
            'Wear light, loose-fitting clothing',
            'Drink water regularly — at least 250ml per hour',
            'Take short breaks in shaded areas',
            'Monitor how you feel — heat can build up quickly'
        ],
        Moderate: [
            'Drink at least 500ml of water per hour',
            'Avoid direct sun between 11am and 3pm',
            'Wear a hat and apply sunscreen SPF 50+',
            'Check on elderly colleagues or family members'
        ],
        High: [
            'Limit outdoor exposure to early morning or after sunset only',
            'Set hydration reminders every 20 minutes',
            'Work in pairs — watch for signs of heat exhaustion',
            'Warning signs: dizziness, nausea, heavy sweating, weakness'
        ],
        Extreme: [
            'STOP all non-essential outdoor activity immediately',
            'Move to an air-conditioned space as soon as possible',
            'Call emergency services if anyone shows confusion or stops sweating',
            'Cool down: wet cloth on neck, wrists, and armpits'
        ]
    };
    return tipsByLevel[riskLevel] || tipsByLevel.Low;
}

function findSafestTimes(hourlyTimes, hourlyFeelsLike) {
    const safeHours = [];

    for (let i = 0; i < hourlyTimes.length; i++) {
        if (hourlyFeelsLike[i] < 32) {
            const hour = new Date(hourlyTimes[i]).getHours();
            const nextHour = (hour + 1) % 24;
            safeHours.push({
                slot: `${String(hour).padStart(2, '0')}:00 – ${String(nextHour).padStart(2, '0')}:00`,
                feelsLike: hourlyFeelsLike[i]
            });
        }
    }

    if (safeHours.length === 0) {
        return ['No safe outdoor hours today — stay indoors'];
    }

return safeHours
        .sort((a, b) => a.feelsLike - b.feelsLike)
        .slice(0, 3)
        .map(s => s.slot);
}

router.get('/', async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ message: 'Latitude and longitude are required.' });
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relativehumidity_2m,apparent_temperature,uv_index&forecast_days=1&timezone=auto`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.hourly) {
            return res.status(500).json({ message: 'Could not fetch weather data.' });
        }

const now = new Date();
        const currentHourStr = now.toISOString().slice(0, 13);

        let currentHourIndex = data.hourly.time.findIndex(t => t.startsWith(currentHourStr));

if (currentHourIndex === -1) {
            currentHourIndex = now.getHours();
            if (currentHourIndex >= data.hourly.time.length) currentHourIndex = 0;
        }

const temperature = data.hourly.temperature_2m[currentHourIndex];
        const feelsLike   = data.hourly.apparent_temperature[currentHourIndex];
        const humidity    = data.hourly.relativehumidity_2m[currentHourIndex];
        const uvIndex     = data.hourly.uv_index[currentHourIndex];

const hourlyTimes     = data.hourly.time;
        const hourlyFeelsLike = data.hourly.apparent_temperature;
        const hourlyUV        = data.hourly.uv_index;
        const hourlyHumidity  = data.hourly.relativehumidity_2m;

const hourlyRiskLevels = hourlyFeelsLike.map(f => getRiskLevel(f));

const heatRiskLevel = getRiskLevel(feelsLike);

const tips = getTips(heatRiskLevel);
        const safestTimes = findSafestTimes(hourlyTimes, hourlyFeelsLike);

        res.json({
            temperature,
            feelsLike,
            humidity,
            uvIndex,
            heatRiskLevel,
            safestTimes,
            tips,
            hourlyTimes,
            hourlyFeelsLike,
            hourlyUV,
            hourlyHumidity,
            hourlyRiskLevels
        });

    } catch (err) {
        console.error('Weather fetch error:', err);
        res.status(500).json({ message: 'Could not fetch weather. Please try again.' });
    }
});

router.get('/geocode', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json([]);
        }

        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.results) {
            return res.json([]);
        }

const results = data.results.map(r => ({
            name: r.name,
            country: r.country,
            latitude: r.latitude,
            longitude: r.longitude
        }));

        res.json(results);

    } catch (err) {
        console.error('Geocode error:', err);
        res.status(500).json({ message: 'Could not search location.' });
    }
});

module.exports = router;