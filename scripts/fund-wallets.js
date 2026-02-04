#!/usr/bin/env node
/**
 * Fund C&C System Wallets on Solana Devnet
 * 
 * 1. Airdrops SOL to all wallets (for gas fees)
 * 2. Instructions for getting devnet USDC
 * 
 * Run: node scripts/fund-wallets.js
 */

const db = require('../src/db');
const wallet = require('../src/economy/wallet');

async function fundWallets() {
  console.log('🌊 ═══════════════════════════════════════════');
  console.log('💰 FUNDING C&C SYSTEM WALLETS');
  console.log('🌊 ═══════════════════════════════════════════\n');
  
  // Get all system wallets
  const wallets = db.prepare('SELECT * FROM system_wallets').all();
  
  console.log(`Found ${wallets.length} system wallets\n`);
  
  for (const w of wallets) {
    console.log(`📍 ${w.name}`);
    console.log(`   Address: ${w.public_key}`);
    
    // Check current SOL balance
    const solBalance = await wallet.getSOLBalance(w.public_key);
    console.log(`   SOL Balance: ${solBalance}`);
    
    // Airdrop SOL if needed (max 2 SOL per request on devnet)
    if (solBalance < 0.5) {
      console.log(`   ⏳ Requesting SOL airdrop...`);
      const airdrop = await wallet.requestAirdrop(w.public_key, 2);
      if (airdrop.success) {
        console.log(`   ✅ Airdropped 2 SOL`);
      } else {
        console.log(`   ❌ Airdrop failed: ${airdrop.error}`);
        console.log(`   💡 Try manually: solana airdrop 2 ${w.public_key} --url devnet`);
      }
    } else {
      console.log(`   ✅ Has enough SOL`);
    }
    
    // Check USDC balance
    const usdcBalance = await wallet.getUSDCBalance(w.public_key);
    console.log(`   USDC Balance: ${usdcBalance}`);
    
    console.log('');
  }
  
  console.log('🌊 ═══════════════════════════════════════════');
  console.log('📋 NEXT STEPS: Get Devnet USDC');
  console.log('🌊 ═══════════════════════════════════════════\n');
  
  console.log('Option 1: Use Circle\'s Devnet Faucet');
  console.log('  https://faucet.circle.com/');
  console.log('  Select "Solana Devnet" and paste treasury address\n');
  
  console.log('Option 2: Use SPL Token CLI');
  console.log('  spl-token create-account <USDC_MINT> --owner <WALLET>');
  console.log('  spl-token mint <USDC_MINT> <AMOUNT> <TOKEN_ACCOUNT>\n');
  
  console.log('Treasury address for funding:');
  const treasury = wallets.find(w => w.id === 'treasury');
  if (treasury) {
    console.log(`  ${treasury.public_key}\n`);
  }
  
  console.log('After funding treasury, run the game to distribute USDC to NPCs.');
}

fundWallets().catch(console.error);
