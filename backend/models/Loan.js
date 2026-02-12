const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    txId: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'repaid'],
        default: 'active'
    },
    dueRound: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Loan', LoanSchema);
