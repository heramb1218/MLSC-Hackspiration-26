require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const algosdk = require('algosdk');
const algorandService = require('../services/algorandService');
const mongoose = require('mongoose');
const User = require('../models/User');

async function resetState() {
    console.log("--- Resetting User State ---");
    const client = algorandService.getAlgodClient();

    // Connect DB to get User
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findById('698d50b4841b005523233620');
    if (!user) { console.log("User not found"); process.exit(1); }

    const account = algosdk.mnemonicToSecretKey(user.mnemonic);
    const appId = Number(process.env.LENDING_APP_ID);

    console.log(`User: ${account.addr}`);

    const params = await client.getTransactionParams().do();

    async function waitForConfirmation(algodClient, txId, maxRounds = 6) {
        let status = await algodClient.status().do();
        let lastRound = Number(status['last-round']);
        const startRound = lastRound;

        while (lastRound < startRound + maxRounds) {
            const pendingInfo = await algodClient.pendingTransactionInformation(txId).do();
            if (pendingInfo['confirmed-round'] !== null && pendingInfo['confirmed-round'] > 0) {
                return pendingInfo;
            }
            if (pendingInfo['pool-error'] && pendingInfo['pool-error'].length > 0) {
                throw new Error(`TransactionPool.Remember: ${pendingInfo['pool-error']}`);
            }
            await algodClient.statusAfterBlock(lastRound + 1).do();
            lastRound++;
        }
        throw new Error(`Transaction ${txId} not confirmed after ${maxRounds} rounds`);
    }

    // 1. Clear State (Opt-Out)
    console.log("Step 1: Clearing State (Opt-Out)...");
    try {
        const clearTxn = algosdk.makeApplicationClearStateTxnFromObject({
            sender: account.addr,
            appIndex: appId,
            suggestedParams: params
        });
        const signedClear = clearTxn.signTxn(account.sk);
        const response = await client.sendRawTransaction(signedClear).do();
        const clearTxId = response.txId || response.txid;
        console.log(`Clear TxID: ${clearTxId}`);
        await waitForConfirmation(client, clearTxId, 4);
        console.log("State Cleared.");
    } catch (e) {
        console.log("Clear State skipped/failed (maybe not opted in):", e.message);
    }

    // 2. Opt-In Again
    console.log("Step 2: Opting In...");
    try {
        // Refresh params
        const newParams = await client.getTransactionParams().do();
        // Force the params to be fresh
        const optInTxn = algosdk.makeApplicationOptInTxnFromObject({
            sender: account.addr,
            appIndex: appId,
            suggestedParams: newParams
        });
        const signedOptIn = optInTxn.signTxn(account.sk);
        const response = await client.sendRawTransaction(signedOptIn).do();
        const optInTxId = response.txId || response.txid;
        console.log(`Opt-In TxID: ${optInTxId}`);
        await waitForConfirmation(client, optInTxId, 4);
        console.log("Opt-In Confirmed!");
    } catch (e) {
        console.error("Opt-In Failed:", e.message);
    }

    // 3. Verify State
    console.log("Step 3: Verifying State...");
    try {
        const info = await client.accountApplicationInformation(account.addr, appId).do();
        console.log("Local State:", JSON.stringify(info['app-local-state']['key-value'], null, 2));
    } catch (e) {
        console.log("Could not read state:", e.message);
    }

    process.exit();
}

resetState();
