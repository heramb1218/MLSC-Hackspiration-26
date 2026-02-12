const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    walletAddress: {
        type: String,
        default: ''
    },
    mnemonic: {
        type: String,
        default: ''
    },
    reputationScore: {
        type: Number,
        default: 50
    }
});

module.exports = mongoose.model('User', UserSchema);
