const mongoose = require('mongoose');

const workerProfileSchema = new mongoose.Schema({
    companyAdminEmail: {
        type: String,
        required: true,
        index: true,
        lowercase: true,
        trim: true
    },
    workerName: {
        type: String,
        required: true,
        trim: true
    },
    workerEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    jobRole: {
        type: String,
        trim: true
    },
    shiftStart: {
        type: String
    },
    shiftEnd: {
        type: String
    },
    locationCity: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('WorkerProfile', workerProfileSchema);  