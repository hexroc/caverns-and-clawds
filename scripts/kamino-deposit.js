/**
 * Kamino USDC Deposit Script
 * Deposits treasury USDC into Kamino lending market for yield generation
 * 
 * MAINNET - REAL MONEY!
 */

const { Connection, Keypair, PublicKey, Transaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
const { KaminoMarket, KaminoAction, VanillaObligation, PROGRAM_ID } = require('@kamino-finance/klend-sdk');
const bs58 = require('bs58');
require('dotenv').config();

const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const KAMINO_MAIN_MARKET = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');

async function checkCurrentBalance(connection, wallet) {
  console.log('\n🔍 Current Treasury Status\n');
  console.log('Wallet:', wallet.publicKey.toString());
  
  // SOL balance
  const solBalance = await connection.getBalance(wallet.publicKey);
  console.log('SOL Balance:', (solBalance / 1e9).toFixed(4), 'SOL');
  
  // USDC balance
  const usdcAta = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
  let usdcBalance = 0;
  try {
    const tokenAccount = await connection.getTokenAccountBalance(usdcAta);
    usdcBalance = tokenAccount.value.uiAmount;
    console.log('USDC Balance:', usdcBalance, 'USDC');
    console.log('USDC Token Account:', usdcAta.toString());
  } catch (e) {
    console.log('USDC Balance: 0 (no token account)');
  }
  
  return { sol: solBalance / 1e9, usdc: usdcBalance, usdcAta };
}

async function depositToKamino(dryRun = true) {
  console.log('🏦 Kamino USDC Deposit Script');
  console.log('=' .repeat(50));
  
  // 1. Load treasury wallet
  const treasurySecret = process.env.CC_TREASURY_SECRET;
  if (!treasurySecret) {
    throw new Error('CC_TREASURY_SECRET not found in .env');
  }
  
  const secretKey = Buffer.from(treasurySecret, 'base64');
  const wallet = Keypair.fromSecretKey(secretKey);
  
  // 2. Create connection
  const connection = new Connection(MAINNET_RPC, 'confirmed');
  
  // 3. Check current balance
  const balance = await checkCurrentBalance(connection, wallet);
  
  if (balance.usdc === 0) {
    console.log('\n❌ No USDC to deposit');
    return;
  }
  
  // 4. Load Kamino market
  console.log('\n📊 Loading Kamino Market...');
  const market = await KaminoMarket.load(
    connection,
    KAMINO_MAIN_MARKET,
    300_000 // slot duration
  );
  
  await market.loadReserves();
  const usdcReserve = market.getReserve('USDC');
  
  if (!usdcReserve) {
    throw new Error('USDC reserve not found in Kamino market');
  }
  
  console.log('\nKamino USDC Reserve:');
  console.log('  Total Deposits:', usdcReserve.stats.totalDepositsWads.toString());
  console.log('  Current APY:', (usdcReserve.stats.depositApy * 100).toFixed(2) + '%');
  
  // 5. Build deposit transaction
  const depositAmount = balance.usdc; // Deposit all USDC
  console.log('\n💰 Preparing Deposit...');
  console.log('  Amount:', depositAmount, 'USDC');
  console.log('  Expected APY:', (usdcReserve.stats.depositApy * 100).toFixed(2) + '%');
  console.log('  Daily Yield:', (depositAmount * usdcReserve.stats.depositApy / 365).toFixed(6), 'USDC/day');
  console.log('  Monthly Yield:', (depositAmount * usdcReserve.stats.depositApy / 12).toFixed(4), 'USDC/month');
  console.log('  Yearly Yield:', (depositAmount * usdcReserve.stats.depositApy).toFixed(2), 'USDC/year');
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No transaction will be sent');
    console.log('\nTo execute for real, run:');
    console.log('  node scripts/kamino-deposit.js --execute');
    return;
  }
  
  console.log('\n🚀 Building transaction...');
  
  // Create obligation (lending position)
  const obligation = new VanillaObligation(PROGRAM_ID);
  
  // Build deposit transaction
  const kaminoAction = await KaminoAction.buildDepositTxns(
    market,
    depositAmount.toString(),
    'USDC',
    wallet.publicKey,
    obligation,
    0, // slippage (not needed for deposits)
    true, // create ATA if needed
    false, // referrer (none)
    PublicKey.default
  );
  
  console.log('\n📝 Transaction Details:');
  console.log('  Instructions:', kaminoAction.setupIxs.length + kaminoAction.lendingIxs.length + kaminoAction.cleanupIxs.length);
  
  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  
  // Build full transaction
  const tx = new Transaction();
  tx.recentBlockhash = blockhash;
  tx.feePayer = wallet.publicKey;
  tx.add(...kaminoAction.setupIxs, ...kaminoAction.lendingIxs, ...kaminoAction.cleanupIxs);
  
  // Sign transaction
  tx.sign(wallet);
  
  console.log('\n🔐 Sending transaction...');
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed'
  });
  
  console.log('  Signature:', signature);
  console.log('  Explorer:', `https://solscan.io/tx/${signature}`);
  
  // Wait for confirmation
  console.log('\n⏳ Waiting for confirmation...');
  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight
  }, 'confirmed');
  
  if (confirmation.value.err) {
    console.log('\n❌ Transaction failed:', confirmation.value.err);
    throw new Error('Transaction failed');
  }
  
  console.log('\n✅ Deposit successful!');
  console.log('\n📊 New Status:');
  await checkCurrentBalance(connection, wallet);
  
  return { signature, amount: depositAmount, apy: usdcReserve.stats.depositApy };
}

// Main execution
const args = process.argv.slice(2);
const execute = args.includes('--execute');

depositToKamino(!execute)
  .then(result => {
    if (result) {
      console.log('\n🎉 Done!');
      process.exit(0);
    } else {
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('\n💥 Error:', error.message);
    process.exit(1);
  });
