const express = require('express');
const WorkerProfile = require('../models/WorkerProfile');
const SafetyReport = require('../models/SafetyReport');

const router = express.Router();

router.get('/workers', async (req, res) => {
    try {
        const { adminEmail } = req.query;

        if (!adminEmail) {
            return res.status(400).json({ message: 'Admin email is required.' });
        }

        const workers = await WorkerProfile
            .find({ companyAdminEmail: adminEmail.toLowerCase() })
            .sort({ createdAt: -1 });

        res.json(workers);

    } catch (err) {
        console.error('Get workers error:', err);
        res.status(500).json({ message: 'Could not fetch workers.' });
    }
});

router.post('/workers', async (req, res) => {
    try {
        const {
            adminEmail,
            workerName,
            workerEmail,
            phone,
            jobRole,
            shiftStart,
            shiftEnd,
            locationCity
        } = req.body;

        if (!adminEmail) {
            return res.status(400).json({ message: 'Admin email is required.' });
        }
        if (!workerName) {
            return res.status(400).json({ message: 'Worker name is required.' });
        }

        const newWorker = new WorkerProfile({
            companyAdminEmail: adminEmail.toLowerCase(),
            workerName,
            workerEmail,
            phone,
            jobRole,
            shiftStart,
            shiftEnd,
            locationCity
        });

        await newWorker.save();

        res.status(201).json({
            message: 'Worker added successfully',
            worker: newWorker
        });

    } catch (err) {
        console.error('Create worker error:', err);
        res.status(500).json({ message: 'Could not create worker.' });
    }
});

router.put('/workers/:id', async (req, res) => {
    try {
        const worker = await WorkerProfile.findById(req.params.id);

        if (!worker) {
            return res.status(404).json({ message: 'Worker not found.' });
        }

        const fields = ['workerName', 'workerEmail', 'phone', 'jobRole', 'shiftStart', 'shiftEnd', 'locationCity'];
        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                worker[field] = req.body[field];
            }
        });

        await worker.save();

        res.json({
            message: 'Worker updated successfully',
            worker
        });

    } catch (err) {
        console.error('Update worker error:', err);
        res.status(500).json({ message: 'Could not update worker.' });
    }
});

router.delete('/workers/:id', async (req, res) => {
    try {
        const deleted = await WorkerProfile.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({ message: 'Worker not found.' });
        }

        res.json({ message: 'Worker deleted successfully.' });

    } catch (err) {
        console.error('Delete worker error:', err);
        res.status(500).json({ message: 'Could not delete worker.' });
    }
});

router.get('/reports', async (req, res) => {
    try {
        const { adminEmail } = req.query;

        if (!adminEmail) {
            return res.status(400).json({ message: 'Admin email is required.' });
        }

const workers = await WorkerProfile.find({ companyAdminEmail: adminEmail.toLowerCase() });
        const workerEmails = workers
            .map(w => w.workerEmail)
            .filter(email => email);

        if (workerEmails.length === 0) {
            return res.json([]);
        }

const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

const reports = await SafetyReport
            .find({
                userEmail: { $in: workerEmails },
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            })
            .sort({ createdAt: -1 });

        res.json(reports);

    } catch (err) {
        console.error('Get admin reports error:', err);
        res.status(500).json({ message: 'Could not fetch reports.' });
    }
});

module.exports = router;