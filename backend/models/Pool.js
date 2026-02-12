const mongoose = require('mongoose');

const PoolSchema = new mongoose.Schema({
    balance: {
        type: Number,
        default: 10000 // Demo starting balance
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Pool', PoolSchema);
