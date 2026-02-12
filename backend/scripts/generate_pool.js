const algosdk = require('algosdk');

const account = algosdk.generateAccount();
const mnemonic = algosdk.secretKeyToMnemonic(account.sk);

console.log('--- NEW ALGORAND POOL WALLET ---');
console.log('POOL_ADDRESS=' + account.addr);
console.log('POOL_MNEMONIC="' + mnemonic + '"');
console.log('--------------------------------');
console.log('Add these two lines to your Railway Variables immediately.');
console.log('Note: This wallet is empty on Testnet. You will need to fund it using a Faucet if you want it to actually work for lending.');
