const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Pool = require('../models/Pool');
const Loan = require('../models/Loan');

// Helper to get or create the single pool
const getPool = async () => {
    let pool = await Pool.findOne();
    if (!pool) {
        pool = new Pool({ balance: 10000 });
        await pool.save();
    }
    return pool;
};

// --- AUTH ---

router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        // Mock wallet address generation
        const walletAddress = '0x' + Math.random().toString(16).substr(2, 40);

        user = new User({
            name,
            email,
            password, // In real app, hash this!
            walletAddress
        });

        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
        if (user.password !== password) return res.status(400).json({ msg: 'Invalid credentials' });

        res.json(user);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// --- USER DATA ---

router.get('/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const loans = await Loan.find({ userId: user._id });
        res.json({ user, loans });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// --- POOL & LOANS ---

router.get('/pool', async (req, res) => {
    try {
        const pool = await getPool();
        res.json(pool);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

router.post('/contribute', async (req, res) => {
    // userId and amount in body
    const { userId, amount } = req.body;
    try {
        const pool = await getPool();
        pool.balance += Number(amount);
        await pool.save();

        // Increase reputation slightly
        const user = await User.findById(userId);
        if (user) {
            user.reputationScore += 2;
            await user.save();
        }

        res.json({ pool, user });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

router.post('/borrow', async (req, res) => {
    const { userId, amount } = req.body;
    try {
        const pool = await getPool();
        if (pool.balance < amount) {
            return res.status(400).json({ msg: 'Insufficient pool balance' });
        }

        pool.balance -= Number(amount);
        await pool.save();

        const loan = new Loan({
            userId,
            amount: Number(amount)
        });
        await loan.save();

        res.json({ pool, loan });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

router.post('/repay', async (req, res) => {
    const { loanId } = req.body;
    try {
        const loan = await Loan.findById(loanId);
        if (!loan) return res.status(404).json({ msg: 'Loan not found' });
        if (loan.status === 'repaid') return res.status(400).json({ msg: 'Loan already repaid' });

        const pool = await getPool();
        pool.balance += loan.amount;
        await pool.save();

        loan.status = 'repaid';
        await loan.save();

        // Increase reputation significantly
        const user = await User.findById(loan.userId);
        if (user) {
            user.reputationScore += 10;
            await user.save();
        }

        res.json({ pool, loan, user });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

module.exports = router;
