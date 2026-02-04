#!/usr/bin/env node
/**
 * Yield Simulator
 * Simulates DeFi yields until full Kamino integration is ready.
 * Distributes "paper" yields to NPCs based on treasury balance.
 */

require('dotenv').config();

const { Connection, PublicKey } = require('@solana/web3.js');
const Database = require('better-sqlite3');
const path = require('path');

// Constants
const TREASURY = '8XH2DkvLFDMnVaqfmY2cMgSc9EXXUb2VchH3cB4PaCKY';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const APY = 0.10; // 10% simulated APY (Kamino-like)

const DB_PATH = path.join(__dirname, '..', '..', 'db', 'caverns.db');

const NPCs = [
  'madame_pearl',
  'ironshell_gus',
  'coral_trader',
  'weapon_smith',
  'old_shellworth'
];

/**
 * Get treasury USDC balance from chain
 */
async function getTreasuryBalance() {
  const conn = new Connection(RPC_URL, 'confirmed');
  
  const tokenAccounts = await conn.getParsedTokenAccountsByOwner(
    new PublicKey(TREASURY),
    { mint: new PublicKey(USDC_MINT) }
  );
  
  if (tokenAccounts.value.length === 0) {
    return 0;
  }
  
  return tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
}

/**
 * Calculate daily yield from principal at given APY
 */
function calculateDailyYield(principal, apy = APY) {
  return principal * apy / 365;
}

/**
 * Distribute yield to NPCs in database
 */
function distributeYieldToNPCs(db, dailyYield) {
  const perNPC = dailyYield / NPCs.length;
  const results = [];
  
  // Check if economy_wallets table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='economy_wallets'
  `).get();
  
  if (!tableExists) {
    // Create the table
    db.exec(`
      CREATE TABLE IF NOT EXISTS economy_wallets (
        wallet_id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        usdc_balance REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_yield_at TEXT
      )
    `);
  }
  
  const upsertStmt = db.prepare(`
    INSERT INTO economy_wallets (wallet_id, type, usdc_balance, last_yield_at)
    VALUES (?, 'npc', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(wallet_id) DO UPDATE SET 
      usdc_balance = usdc_balance + ?,
      last_yield_at = CURRENT_TIMESTAMP
  `);
  
  for (const npcId of NPCs) {
    upsertStmt.run(npcId, perNPC, perNPC);
    results.push({ npc: npcId, added: perNPC });
  }
  
  // Log the distribution
  const logStmt = db.prepare(`
    INSERT INTO yield_distribution_log (
      treasury_balance, daily_yield, apy, distributed_at
    ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  // Create log table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS yield_distribution_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      treasury_balance REAL,
      daily_yield REAL,
      apy REAL,
      distributed_at TEXT
    )
  `);
  
  return results;
}

/**
 * Get NPC balances
 */
function getNPCBalances(db) {
  const stmt = db.prepare(`
    SELECT wallet_id, usdc_balance, last_yield_at 
    FROM economy_wallets 
    WHERE type = 'npc'
  `);
  
  return stmt.all();
}

/**
 * Main distribution function
 */
async function runYieldDistribution() {
  console.log('🌾 YIELD DISTRIBUTION');
  console.log('═══════════════════════════════════════');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`APY: ${(APY * 100).toFixed(1)}%`);
  console.log('');
  
  // Get treasury balance
  const treasuryBalance = await getTreasuryBalance();
  console.log(`💰 Treasury Balance: $${treasuryBalance.toFixed(2)} USDC`);
  
  if (treasuryBalance === 0) {
    console.log('❌ Treasury empty - no yield to distribute');
    return;
  }
  
  // Calculate daily yield
  const dailyYield = calculateDailyYield(treasuryBalance);
  console.log(`📈 Daily Yield: $${dailyYield.toFixed(6)} USDC`);
  console.log(`📊 Per NPC: $${(dailyYield / NPCs.length).toFixed(6)} USDC`);
  console.log('');
  
  // Distribute to NPCs
  const db = new Database(DB_PATH);
  const results = distributeYieldToNPCs(db, dailyYield);
  
  console.log('💸 Distribution:');
  for (const r of results) {
    console.log(`   ${r.npc}: +$${r.added.toFixed(6)}`);
  }
  
  // Show updated balances
  console.log('\n📊 Updated NPC Balances:');
  const balances = getNPCBalances(db);
  for (const b of balances) {
    console.log(`   ${b.wallet_id}: $${b.usdc_balance.toFixed(6)}`);
  }
  
  db.close();
  
  console.log('\n✅ Yield distribution complete!');
  
  return {
    treasuryBalance,
    dailyYield,
    perNPC: dailyYield / NPCs.length,
    distributions: results
  };
}

/**
 * Status check
 */
async function checkStatus() {
  console.log('📊 YIELD SYSTEM STATUS');
  console.log('═══════════════════════════════════════');
  
  // Treasury
  const treasuryBalance = await getTreasuryBalance();
  console.log(`\n💰 Treasury: $${treasuryBalance.toFixed(2)} USDC`);
  
  // Projections
  const dailyYield = calculateDailyYield(treasuryBalance);
  const monthlyYield = dailyYield * 30;
  const yearlyYield = treasuryBalance * APY;
  
  console.log(`\n📈 Yield Projections (${(APY*100).toFixed(0)}% APY):`);
  console.log(`   Daily: $${dailyYield.toFixed(4)}`);
  console.log(`   Monthly: $${monthlyYield.toFixed(2)}`);
  console.log(`   Yearly: $${yearlyYield.toFixed(2)}`);
  
  // Economy capacity
  console.log(`\n🎯 Economy Capacity:`);
  console.log(`   Materials/day (@ $0.001): ${Math.floor(dailyYield / 0.001)}`);
  console.log(`   Sustainable AI agents: ~${Math.floor(dailyYield / 0.01)}`);
  
  // NPC balances
  const db = new Database(DB_PATH);
  try {
    const balances = getNPCBalances(db);
    if (balances.length > 0) {
      console.log(`\n🏪 NPC Balances:`);
      for (const b of balances) {
        console.log(`   ${b.wallet_id}: $${b.usdc_balance.toFixed(6)}`);
      }
    }
  } catch (e) {
    console.log('\n⚠️ NPC wallets not initialized yet');
  }
  db.close();
}

// CLI
if (require.main === module) {
  const command = process.argv[2];
  
  (async () => {
    try {
      switch (command) {
        case 'distribute':
          await runYieldDistribution();
          break;
        case 'status':
          await checkStatus();
          break;
        default:
          console.log('Yield Simulator');
          console.log('===============');
          console.log('Commands:');
          console.log('  status      - Check treasury + projections');
          console.log('  distribute  - Run daily yield distribution to NPCs');
          console.log('');
          console.log('Run "distribute" once daily to fund NPCs');
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  getTreasuryBalance,
  calculateDailyYield,
  distributeYieldToNPCs,
  runYieldDistribution,
  checkStatus
};
