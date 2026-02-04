#!/usr/bin/env node
/**
 * Check Economy Balances
 * 
 * Quick script to check SOL and USDC balances of all system wallets
 */

const { getSOLBalance, getUSDCBalance } = require('../src/economy/wallet');
const db = require('../src/db');

async function checkAllBalances() {
  console.log('🌊 ═══════════════════════════════════════════');
  console.log('📊 CAVERNS & CLAWDS ECONOMY BALANCES');
  console.log('🌊 ═══════════════════════════════════════════\n');

  const wallets = db.prepare('SELECT id, name, public_key FROM system_wallets').all();
  let totalSOL = 0;
  let totalUSDC = 0;
  
  for (const w of wallets) {
    const sol = await getSOLBalance(w.public_key);
    const usdc = await getUSDCBalance(w.public_key);
    
    totalSOL += sol;
    totalUSDC += usdc;
    
    const status = (sol >= 0.1 && usdc >= 10) ? '✅' : 
                   (sol >= 0.01) ? '⚠️' : '❌';
    
    console.log(`${status} ${w.name}:`);
    console.log(`     Address: ${w.public_key}`);
    console.log(`     SOL: ${sol.toFixed(4)} (tx fees)`);
    console.log(`     USDC: ${usdc.toFixed(2)}`);
    console.log('');
  }
  
  console.log('🌊 ═══════════════════════════════════════════');
  console.log(`💰 TOTALS: ${totalSOL.toFixed(4)} SOL, ${totalUSDC.toFixed(2)} USDC`);
  console.log('🌊 ═══════════════════════════════════════════\n');
  
  // Status assessment
  const readyForTransactions = totalSOL >= 0.5 && totalUSDC >= 100;
  
  if (readyForTransactions) {
    console.log('✅ ECONOMY READY: Sufficient funds for live transactions');
  } else {
    console.log('⚠️  ECONOMY NOT READY: Need more funding');
    console.log('   - Need at least 0.1 SOL per wallet for transaction fees');
    console.log('   - Need at least 100 total USDC to start economy');
    console.log('   - Run: npm run fund-economy');
  }
  
  return { totalSOL, totalUSDC, readyForTransactions };
}

// Run if called directly
if (require.main === module) {
  checkAllBalances().catch(console.error);
}

module.exports = { checkAllBalances };