require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const algosdk = require('algosdk');
const algorandService = require('../services/algorandService');

async function deployV2() {
    console.log("--- Deploying Lending App V2 ---");
    const { poolMnemonic } = algorandService.getPoolConfig();

    // Deploy New App
    const { appId, txId } = await algorandService.createLendingApp(poolMnemonic);
    console.log(`NEW APP ID: ${appId}`);
    console.log(`Creation Tx: ${txId}`);

    // Get New Escrow Address
    const { escrowAddress } = await algorandService.deployEscrowContractForApp(appId);
    console.log(`NEW ESCROW ADDRESS: ${escrowAddress}`);

    process.exit();
}

deployV2();
