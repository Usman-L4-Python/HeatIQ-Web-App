const express = require('express');
const SafetyReport = require('../models/SafetyReport');

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const {
            userEmail,
            locationName,
            latitude,
            longitude,
            temperature,
            feelsLike,
            humidity,
            uvIndex,
            heatRiskLevel,
            safestTimes,
            tips,
            sharedWith
        } = req.body;

        if (!userEmail) {
            return res.status(400).json({ message: 'User email is required.' });
        }

        const newReport = new SafetyReport({
            userEmail: userEmail.toLowerCase(),
            locationName,
            latitude,
            longitude,
            temperature,
            feelsLike,
            humidity,
            uvIndex,
            heatRiskLevel,
            safestTimes: safestTimes || [],
            tips: tips || [],
            sharedWith
        });

        await newReport.save();

        res.status(201).json({
            message: 'Report saved successfully',
            report: newReport
        });

    } catch (err) {
        console.error('Save report error:', err);
        res.status(500).json({ message: 'Could not save report.' });
    }
});

router.get('/', async (req, res) => {
    try {
        const { userEmail } = req.query;

        if (!userEmail) {
            return res.status(400).json({ message: 'User email is required.' });
        }

        const reports = await SafetyReport
            .find({ userEmail: userEmail.toLowerCase() })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json(reports);

    } catch (err) {
        console.error('Get reports error:', err);
        res.status(500).json({ message: 'Could not fetch reports.' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deleted = await SafetyReport.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        res.json({ message: 'Report deleted successfully.' });

    } catch (err) {
        console.error('Delete report error:', err);
        res.status(500).json({ message: 'Could not delete report.' });
    }
});

module.exports = router;