const mongoose = require('mongoose');

const PoolSchema = new mongoose.Schema({
    balance: {
        type: Number,
        default: 10000
    }
});

module.exports = mongoose.model("Pool", PoolSchema);
