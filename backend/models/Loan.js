const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema({
    userId: String,
    amount: Number,
    status: {
        type: String,
        default: "active"
    }
});

module.exports = mongoose.model("Loan", LoanSchema);
