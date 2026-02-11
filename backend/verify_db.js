const mongoose = require('mongoose');
const User = require('./models/User');
const Pool = require('./models/Pool');
const Loan = require('./models/Loan');
require('./config/db'); // Connects to DB

const verifySetup = async () => {
    try {
        console.log("⏳ Starting Verification...");

        // 1. Verify/Create Pool (Step 9)
        let pool = await Pool.findOne();
        if (!pool) {
            console.log("Creating initial pool...");
            pool = await Pool.create({ balance: 10000 });
        }
        console.log("✅ Pool Check Passed: Balance is", pool.balance);

        // 2. Create Test User (Step 10)
        const testEmail = "testuser_" + Date.now() + "@campus.com";
        const user = await User.create({
            name: "Test User",
            email: testEmail,
            password: "password123",
            walletAddress: "0x123...",
            reputationScore: 50
        });
        console.log("✅ User Creation Passed:", user.email);

        // 3. Create Loan Record
        const loan = await Loan.create({
            userId: user._id,
            amount: 500,
            status: "active"
        });
        console.log("✅ Loan Creation Passed for amount:", loan.amount);

        console.log("🎉 ALL CHECKS PASSED! Database is ready.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Verification Failed:", err);
        process.exit(1);
    }
};

// Wait for connection to be ready before running
mongoose.connection.once('open', verifySetup);
