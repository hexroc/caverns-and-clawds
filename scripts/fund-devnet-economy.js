#!/usr/bin/env node
/**
 * Fund Devnet Economy
 * 
 * This script helps fund the C&C economy with devnet SOL and USDC
 * to enable real on-chain transactions.
 */

const { requestAirdrop, getSOLBalance, getUSDCBalance } = require('../src/economy/wallet');
const db = require('../src/db');

async function fundWallets() {
  console.log('🌊 ═══════════════════════════════════════════');
  console.log('💰 FUNDING DEVNET ECONOMY');
  console.log('🌊 ═══════════════════════════════════════════\n');

  const wallets = db.prepare('SELECT id, name, public_key FROM system_wallets').all();
  
  console.log('📍 Step 1: Requesting SOL airdrops (for transaction fees)...\n');
  
  // Fund all wallets with SOL for transaction fees
  for (const wallet of wallets) {
    console.log(`💧 Airdropping SOL to ${wallet.name}...`);
    const result = await requestAirdrop(wallet.public_key, 1); // 1 SOL each
    
    if (result.success) {
      console.log(`   ✅ Success: ${result.signature}`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }
  
  console.log('\n⏳ Waiting 5 seconds for confirmations...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('📊 Updated Balances:');
  for (const w of wallets) {
    const sol = await getSOLBalance(w.public_key);
    const usdc = await getUSDCBalance(w.public_key);
    console.log(`   ${w.name}: ${sol.toFixed(4)} SOL, ${usdc.toFixed(2)} USDC`);
  }
  
  console.log('\n🌊 ═══════════════════════════════════════════');
  console.log('✅ SOL FUNDING COMPLETE');
  console.log('🌊 ═══════════════════════════════════════════\n');
  
  console.log('📍 Next Steps for USDC:');
  console.log('');
  console.log('1. Get devnet USDC from Circle\'s faucet:');
  console.log('   → https://faucet.circle.com/');
  console.log('   → Use wallet addresses above');
  console.log('   → Request 1000 USDC per wallet');
  console.log('');
  console.log('2. Or use Solana CLI:');
  console.log('   → Install: npm install -g @solana/cli');
  console.log('   → spl-token mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU 1000 [WALLET_ADDRESS]');
  console.log('');
  console.log('3. Key wallets to fund first:');
  console.log('   🏦 Bank: 7UFYn2yHPfo4wGPzGo6WBuZmaMRwrXumBPKmbSFvRYzd (5000+ USDC)');
  console.log('   🏛️ Treasury: 3P9XDsQRMaqR37sJkuEX9sin9F9MQHsSscCxoZLGn9FK (10000+ USDC)');
  console.log('   🛒 Old Shellworth: GMSYj2gRWfgdBTtkS3VTArizj6i9X33fPM664nWa716N (1000 USDC)');
  console.log('');
  console.log('4. Test with: npm run check-balances');
}

// Run if called directly
if (require.main === module) {
  fundWallets().catch(console.error);
}

module.exports = { fundWallets };