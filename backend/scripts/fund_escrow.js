require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const algorandService = require('../services/algorandService');

async function fundEscrow() {
    try {
        console.log('--- Funding Escrow Account ---');

        // 1. Get Pool Config
        const { poolMnemonic, poolAddress } = algorandService.getPoolConfig();
        console.log('Pool (Admin) Address:', poolAddress);

        // 2. Get App ID & Escrow Address
        const appId = await algorandService.getLendingAppId();
        console.log('Lending App ID:', appId);

        const { escrowAddress } = await algorandService.deployEscrowContractForApp(appId);
        console.log('Escrow (Vault) Address:', escrowAddress);

        // 3. Send 1 ALGO from Pool -> Escrow
        //    (Adjusted from 4 ALGO to avoid overspending the pool wallet)
        console.log('Sending 1 ALGO to Escrow...');
        const result = await algorandService.sendPaymentTransaction({
            senderMnemonic: poolMnemonic,
            receiverAddress: escrowAddress,
            amountMicroAlgos: 1_000_000, // 1 ALGO
            noteText: 'Initial Liquidity Funding'
        });

        console.log('Funding Successful!');
        console.log('TxID:', result.txId);
        console.log('Confirmed Round:', result.confirmedRound);

    } catch (err) {
        console.error('Error funding escrow:', err);
    }
}

fundEscrow();
