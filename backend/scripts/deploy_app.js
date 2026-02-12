const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const service = require('../services/algorandService');

(async () => {
    if (!process.env.POOL_MNEMONIC) {
        console.error("Error: POOL_MNEMONIC not set in .env");
        process.exit(1);
    }

    try {
        console.log("Deploying Lending App to Algorand Testnet...");
        const app = await service.createLendingAppUsingEnv();
        console.log("\n---------------------------------------------------");
        console.log("SUCCESS! The Lending Application is live.");
        console.log("---------------------------------------------------");
        console.log(`Add this line to your backend/.env file:\n`);
        console.log(`LENDING_APP_ID=${app.appId}`);
        console.log("\n---------------------------------------------------");
    } catch (e) {
        console.error("Deployment Failed:", e.message);
    }
})();
