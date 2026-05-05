const mongoose = require('mongoose');

const safetyReportSchema = new mongoose.Schema({
    userEmail: {
        type: String,
        required: true,
        index: true,
        lowercase: true,
        trim: true
    },
    locationName: {
        type: String,
        trim: true
    },
    latitude: {
        type: Number
    },
    longitude: {
        type: Number
    },
    temperature: {
        type: Number
    },
    feelsLike: {
        type: Number
    },
    humidity: {
        type: Number
    },
    uvIndex: {
        type: Number
    },
    heatRiskLevel: {
        type: String,
        enum: ['Low', 'Moderate', 'High', 'Extreme']
    },
    safestTimes: {
        type: [String],
        default: []
    },
    tips: {
        type: [String],
        default: []
    },
    sharedWith: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SafetyReport', safetyReportSchema);