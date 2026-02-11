const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    walletAddress: String,
    reputationScore: {
        type: Number,
        default: 50
    }
});

module.exports = mongoose.model("User", UserSchema);
