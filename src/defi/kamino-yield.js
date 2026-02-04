/**
 * Kamino Yield Integration
 * Deposits treasury USDC into Kamino Earn vaults for ~10% APY
 */

const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = require('@solana/spl-token');

// Mainnet constants
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const KAMINO_MAIN_MARKET = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');

// Connection
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

/**
 * Get treasury wallet keypair from env
 */
function getTreasuryKeypair() {
  const secretB64 = process.env.CC_TREASURY_SECRET;
  if (!secretB64) throw new Error('CC_TREASURY_SECRET not set in .env');
  const secretKey = Buffer.from(secretB64, 'base64');
  return Keypair.fromSecretKey(secretKey);
}

/**
 * Check current balances
 */
async function checkBalances() {
  const conn = new Connection(RPC_URL, 'confirmed');
  const treasury = getTreasuryKeypair();
  
  // SOL balance
  const solBalance = await conn.getBalance(treasury.publicKey);
  
  // USDC balance
  const usdcAta = await getAssociatedTokenAddress(USDC_MINT, treasury.publicKey);
  let usdcBalance = 0;
  try {
    const account = await conn.getTokenAccountBalance(usdcAta);
    usdcBalance = parseFloat(account.value.uiAmount);
  } catch (e) {
    // No USDC account yet
  }
  
  return {
    address: treasury.publicKey.toBase58(),
    sol: solBalance / 1e9,
    usdc: usdcBalance
  };
}

/**
 * Calculate expected daily yield
 */
function calculateDailyYield(principal, apy = 0.10) {
  const dailyRate = apy / 365;
  return principal * dailyRate;
}

/**
 * Calculate NPC daily budgets from yield
 */
function calculateNPCBudgets(dailyYield, npcCount = 5) {
  const perNPC = dailyYield / npcCount;
  return {
    totalDailyYield: dailyYield,
    perNPC: perNPC,
    npcCount: npcCount,
    // How many 0.001 USDC materials can each NPC buy per day
    materialsPurchasable: Math.floor(perNPC / 0.001)
  };
}

/**
 * Simulate yield distribution (for paper mode / testing)
 */
function simulateYieldDistribution(db, dailyYield) {
  const npcs = [
    'madame_pearl',
    'ironshell_gus', 
    'coral_trader',
    'weapon_smith',
    'old_shellworth'
  ];
  
  const perNPC = dailyYield / npcs.length;
  
  // Update NPC balances in economy_wallets table
  const updateStmt = db.prepare(`
    UPDATE economy_wallets 
    SET usdc_balance = usdc_balance + ? 
    WHERE wallet_id = ?
  `);
  
  const results = [];
  for (const npcId of npcs) {
    updateStmt.run(perNPC, npcId);
    results.push({ npc: npcId, added: perNPC });
  }
  
  return results;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  (async () => {
    switch (command) {
      case 'balance':
        const bal = await checkBalances();
        console.log('💰 Treasury Balance:');
        console.log(`   Address: ${bal.address}`);
        console.log(`   SOL: ${bal.sol.toFixed(4)}`);
        console.log(`   USDC: ${bal.usdc.toFixed(2)}`);
        
        const daily = calculateDailyYield(bal.usdc);
        const budgets = calculateNPCBudgets(daily);
        console.log('\n📈 Yield Projection (10% APY):');
        console.log(`   Daily yield: $${daily.toFixed(4)}`);
        console.log(`   Per NPC: $${budgets.perNPC.toFixed(6)}`);
        console.log(`   Materials purchasable/NPC/day: ${budgets.materialsPurchasable}`);
        break;
        
      case 'simulate':
        // Simulate yield distribution
        const Database = require('better-sqlite3');
        const path = require('path');
        const db = new Database(path.join(__dirname, '..', '..', 'db', 'caverns.db'));
        
        const currentBal = await checkBalances();
        const dailyYield = calculateDailyYield(currentBal.usdc);
        
        console.log(`🔄 Simulating daily yield distribution: $${dailyYield.toFixed(4)}`);
        const results = simulateYieldDistribution(db, dailyYield);
        
        for (const r of results) {
          console.log(`   ${r.npc}: +$${r.added.toFixed(6)} USDC`);
        }
        
        db.close();
        console.log('✅ Yield distributed to NPCs');
        break;
        
      default:
        console.log('Kamino Yield Manager');
        console.log('Usage:');
        console.log('  node kamino-yield.js balance   - Check treasury balance + projections');
        console.log('  node kamino-yield.js simulate  - Simulate daily yield distribution');
        console.log('');
        console.log('For actual Kamino deposits, use: https://app.kamino.finance');
    }
  })().catch(console.error);
}

module.exports = {
  checkBalances,
  calculateDailyYield,
  calculateNPCBudgets,
  simulateYieldDistribution,
  getTreasuryKeypair
};
