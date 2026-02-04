#!/usr/bin/env node
/**
 * Kamino USDC Deposit Script
 * Deposits treasury USDC into Kamino Lend for yield
 */

require('dotenv').config();

const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { KaminoMarket, KaminoAction, VanillaObligation, PROGRAM_ID } = require('@kamino-finance/klend-sdk');
const Decimal = require('decimal.js');

// Constants
const MAIN_MARKET = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

/**
 * Get treasury keypair from env
 */
function getTreasuryKeypair() {
  const secretB64 = process.env.CC_TREASURY_SECRET;
  if (!secretB64) {
    throw new Error('CC_TREASURY_SECRET not set in .env');
  }
  const secretKey = Buffer.from(secretB64, 'base64');
  return Keypair.fromSecretKey(secretKey);
}

/**
 * Deposit USDC to Kamino Lend
 */
async function depositToKamino(amountUSDC) {
  console.log(`\n🏦 Depositing ${amountUSDC} USDC to Kamino...`);
  
  const connection = new Connection(RPC_URL, 'confirmed');
  const treasury = getTreasuryKeypair();
  
  console.log(`Treasury: ${treasury.publicKey.toBase58()}`);
  
  // Load Kamino market
  console.log('Loading Kamino market...');
  const kaminoMarket = await KaminoMarket.load(connection, MAIN_MARKET);
  
  if (!kaminoMarket) {
    throw new Error('Failed to load Kamino market');
  }
  
  // Get USDC reserve info
  const usdcReserve = kaminoMarket.getReserve('USDC');
  if (!usdcReserve) {
    throw new Error('USDC reserve not found in Kamino market');
  }
  
  console.log(`USDC Reserve found: ${usdcReserve.address.toBase58()}`);
  console.log(`Current APY: ${(usdcReserve.stats?.supplyInterestAPY || 0 * 100).toFixed(2)}%`);
  
  // Convert amount to base units (USDC has 6 decimals)
  const amountBase = new Decimal(amountUSDC).mul(1e6).floor().toNumber();
  
  console.log(`Amount in base units: ${amountBase}`);
  
  // Build deposit transaction
  console.log('Building deposit transaction...');
  const kaminoAction = await KaminoAction.buildDepositTxns(
    kaminoMarket,
    amountBase.toString(),
    'USDC',
    new VanillaObligation(PROGRAM_ID),
    treasury.publicKey,
    undefined, // environment
    undefined, // additional args
  );
  
  // Get the transactions
  const { setupIxs, lendingIxs, cleanupIxs } = kaminoAction;
  
  // Combine all instructions into one transaction
  const tx = new Transaction();
  
  if (setupIxs && setupIxs.length > 0) {
    tx.add(...setupIxs);
  }
  if (lendingIxs && lendingIxs.length > 0) {
    tx.add(...lendingIxs);
  }
  if (cleanupIxs && cleanupIxs.length > 0) {
    tx.add(...cleanupIxs);
  }
  
  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = treasury.publicKey;
  
  // Sign and send
  console.log('Signing and sending transaction...');
  const signature = await sendAndConfirmTransaction(
    connection,
    tx,
    [treasury],
    { commitment: 'confirmed' }
  );
  
  console.log(`\n✅ Deposit successful!`);
  console.log(`Transaction: https://solscan.io/tx/${signature}`);
  
  return signature;
}

/**
 * Check Kamino position
 */
async function checkPosition() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const treasury = getTreasuryKeypair();
  
  console.log('\n📊 Checking Kamino Position...');
  console.log(`Treasury: ${treasury.publicKey.toBase58()}`);
  
  // Load Kamino market
  const kaminoMarket = await KaminoMarket.load(connection, MAIN_MARKET);
  
  if (!kaminoMarket) {
    throw new Error('Failed to load Kamino market');
  }
  
  // Get user obligation
  const obligation = await kaminoMarket.getUserVanillaObligation(treasury.publicKey);
  
  if (!obligation) {
    console.log('No Kamino position found');
    return null;
  }
  
  console.log('\n💰 Position Details:');
  console.log(`Deposits: ${obligation.stats?.userTotalDeposit || 0}`);
  console.log(`Borrows: ${obligation.stats?.userTotalBorrow || 0}`);
  console.log(`Net Value: ${obligation.stats?.netAccountValue || 0}`);
  
  // Get USDC reserve APY
  const usdcReserve = kaminoMarket.getReserve('USDC');
  if (usdcReserve) {
    const apy = usdcReserve.stats?.supplyInterestAPY || 0;
    console.log(`\n📈 Current USDC Supply APY: ${(apy * 100).toFixed(2)}%`);
  }
  
  return obligation;
}

/**
 * Get current USDC APY
 */
async function getUSDCAPY() {
  const connection = new Connection(RPC_URL, 'confirmed');
  
  console.log('\n📈 Fetching Kamino USDC APY...');
  
  const kaminoMarket = await KaminoMarket.load(connection, MAIN_MARKET);
  
  if (!kaminoMarket) {
    throw new Error('Failed to load Kamino market');
  }
  
  const usdcReserve = kaminoMarket.getReserve('USDC');
  if (!usdcReserve) {
    throw new Error('USDC reserve not found');
  }
  
  const supplyAPY = usdcReserve.stats?.supplyInterestAPY || 0;
  const totalDeposits = usdcReserve.stats?.totalDepositsWads?.toString() || '0';
  
  console.log(`Supply APY: ${(supplyAPY * 100).toFixed(2)}%`);
  console.log(`Total Deposits: ${totalDeposits}`);
  
  return {
    apy: supplyAPY,
    totalDeposits: totalDeposits
  };
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const amount = parseFloat(args[1]) || 0;
  
  (async () => {
    try {
      switch (command) {
        case 'deposit':
          if (!amount || amount <= 0) {
            console.log('Usage: node kamino-deposit.js deposit <amount>');
            console.log('Example: node kamino-deposit.js deposit 250');
            process.exit(1);
          }
          await depositToKamino(amount);
          break;
          
        case 'position':
          await checkPosition();
          break;
          
        case 'apy':
          await getUSDCAPY();
          break;
          
        default:
          console.log('Kamino Deposit CLI');
          console.log('==================');
          console.log('Commands:');
          console.log('  deposit <amount>  - Deposit USDC to Kamino');
          console.log('  position          - Check current Kamino position');
          console.log('  apy               - Get current USDC supply APY');
          console.log('');
          console.log('Example:');
          console.log('  node kamino-deposit.js deposit 250');
      }
    } catch (error) {
      console.error('Error:', error.message);
      if (error.logs) {
        console.error('Logs:', error.logs);
      }
      process.exit(1);
    }
  })();
}

module.exports = {
  depositToKamino,
  checkPosition,
  getUSDCAPY,
  getTreasuryKeypair
};
