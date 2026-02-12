const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');
const Loan = require('../models/Loan');
const algorandService = require('../services/algorandService');
const logicService = require('../services/logicService');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    });

async function runVerification() {
    try {
        console.log("Starting Verification Flow...");

        // 1. Simulate Signup
        console.log("\n--- Step 1: Signup ---");
        const wallet = algorandService.createWallet();
        console.log("Generated User Wallet:", wallet.walletAddress);

        // Clean up previous test user if exists
        await User.deleteOne({ email: 'verify_test@example.com' });

        let user = new User({
            name: 'Verification User',
            email: 'verify_test@example.com',
            password: 'password123',
            walletAddress: wallet.walletAddress,
            mnemonic: wallet.mnemonic,
            reputationScore: 50 // Valid score to borrow
        });
        await user.save();
        console.log("User saved to DB.");

        // 2. Fund User (Required for Opt-In fees)
        console.log("\n--- Step 2: Fund User (for gas fees) ---");

        const poolMnemonic = process.env.POOL_MNEMONIC;
        if (!poolMnemonic) throw new Error("POOL_MNEMONIC missing");

        const fundingTx = await algorandService.sendPaymentTransaction({
            senderMnemonic: poolMnemonic.trim(),
            receiverAddress: user.walletAddress,
            amountMicroAlgos: algorandService.algoToMicroAlgo(0.4),
            noteText: "Funding for verification test"
        });
        console.log("User funded. TxID:", fundingTx.txId);

        // Wait for funding to confirm
        await new Promise(r => setTimeout(r, 5000));

        // 3. Borrow
        console.log("\n--- Step 3: Borrow ---");
        const borrowAmount = 10; // 10 MicroAlgos (tiny amount for test)

        // Logic Check
        const authorized = logicService.canBorrow(
            user,
            borrowAmount,
            false, // hasActiveLoan
            1000000 // Mock pool balance (we know it's funded)
        );

        if (!authorized.allowed) {
            throw new Error(`Borrow blocked by logic: ${authorized.reason}`);
        }
        console.log("Logic Check Passed.");

        // Execute Borrow
        // Note: borrowFromPoolUsingEnv uses environment vars for Pool and App ID
        const borrowTx = await algorandService.borrowFromPoolUsingEnv({
            borrowerMnemonic: user.mnemonic,
            amountAlgo: 0.000010 // 10 microAlgos in Algo
            // Wait, borrowFromPoolUsingEnv takes amountAlgo!
            // 10 microAlgo = 0.000010 Algo
        });
        console.log("Borrow Successful on Blockchain! TxID:", borrowTx.txId);

        // Update DB (mimicking API)
        const currentRound = await algorandService.getCurrentRound();
        const loan = new Loan({
            userId: user._id,
            amount: borrowAmount,
            txId: borrowTx.txId,
            status: 'active',
            dueRound: currentRound + logicService.LOAN_DURATION_ROUNDS
        });
        await loan.save();
        console.log("Loan saved to DB.");


        // 4. Repay
        console.log("\n--- Step 4: Repay ---");
        // Execute Repay
        const repayTx = await algorandService.repayLoanUsingEnv({
            borrowerMnemonic: user.mnemonic,
            amountAlgo: 0.000010 // Same amount
        });
        console.log("Repay Successful on Blockchain! TxID:", repayTx.txId);

        // Update DB
        loan.status = 'repaid';
        loan.txId = repayTx.txId; // Update with repay tx
        await loan.save();

        // Check Reputation
        const initialRep = user.reputationScore;
        const newRound = await algorandService.getCurrentRound();
        user.reputationScore = logicService.calculateReputationAfterRepayment(
            user.reputationScore,
            newRound,
            loan.dueRound
        );
        await user.save();

        console.log(`Reputation updated: ${initialRep} -> ${user.reputationScore}`);

        console.log("\n---------------------------------------------------");
        console.log("✅ VERIFICATION COMPLETE: ALL SYSTEMS GO");
        console.log("---------------------------------------------------");

    } catch (error) {
        console.error("\n❌ VERIFICATION FAILED:", error);
    } finally {
        mongoose.connection.close();
    }
}

runVerification();
