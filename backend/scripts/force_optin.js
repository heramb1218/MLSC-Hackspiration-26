require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const algosdk = require('algosdk');
const algorandService = require('../services/algorandService');

async function forceOptIn(userMnemonic) {
    console.log("--- Forcing Opt-In ---");
    const client = algorandService.getAlgodClient();
    const account = algosdk.mnemonicToSecretKey(userMnemonic);
    const appId = Number(process.env.LENDING_APP_ID);

    console.log(`User: ${account.addr}`);
    console.log(`App ID: ${appId}`);

    const params = await client.getTransactionParams().do();

    // Opt-In Transaction
    const txn = algosdk.makeApplicationOptInTxnFromObject({
        sender: account.addr,
        appIndex: appId,
        suggestedParams: params
    });

    const signed = txn.signTxn(account.sk);
    console.log("Sending Opt-In...");

    try {
        const { txId } = await client.sendRawTransaction(signed).do();
        console.log(`TxID: ${txId}`);
        await algosdk.waitForConfirmation(client, txId, 4);
        console.log("Opt-In Confirmed!");
    } catch (e) {
        console.error("Opt-In Failed:", e.message);
    }
}

// User Mnemonic form verification script output or we can ask user. 
// Actually, I don't have the user's mnemonic handy (it was generated in verify_flow? No, manual user).
// The manual user "Manual Test User" was created via curl.
// I need to fetch the mnemonic from the database using the User ID '698d50b4841b005523233620'
// I will just add DB lookup to this script.

const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const user = await User.findById('698d50b4841b005523233620');
    if (user) {
        await forceOptIn(user.mnemonic);
    } else {
        console.log("User not found");
    }
    process.exit();
});
