/**
 * Kamino USDC Vault Integration
 * Deposits USDC into Kamino vault to earn yield
 */

const { Connection, PublicKey, Transaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token');

// Mainnet addresses
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Kamino USDC vault (main lending market)
const KAMINO_USDC_RESERVE = new PublicKey('D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59');
const KAMINO_LENDING_MARKET = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');

// Treasury wallet
const TREASURY_WALLET = '8XH2DkvLFDMnVaqfmY2cMgSc9EXXUb2VchH3cB4PaCKY';

/**
 * Get current treasury USDC balance
 */
async function getTreasuryBalance() {
  const connection = new Connection(MAINNET_RPC);
  const treasuryPubkey = new PublicKey(TREASURY_WALLET);
  
  // Get SOL balance
  const solBalance = await connection.getBalance(treasuryPubkey);
  
  // Get USDC balance
  const usdcAta = await getAssociatedTokenAddress(USDC_MINT, treasuryPubkey);
  let usdcBalance = 0;
  try {
    const tokenAccount = await connection.getTokenAccountBalance(usdcAta);
    usdcBalance = tokenAccount.value.uiAmount;
  } catch (e) {
    // No USDC account yet
  }
  
  return {
    sol: solBalance / 1e9,
    usdc: usdcBalance,
    wallet: TREASURY_WALLET
  };
}

/**
 * Calculate expected daily yield
 */
function calculateDailyYield(usdcAmount, apy = 0.10) {
  const dailyRate = apy / 365;
  return usdcAmount * dailyRate;
}

/**
 * Get Kamino vault info (simulated for now)
 * Full Kamino SDK integration requires their npm package
 */
async function getVaultInfo() {
  // Kamino USDC typically earns 8-15% APY
  const estimatedApy = 0.10; // 10% conservative estimate
  
  return {
    protocol: 'Kamino',
    vault: 'USDC Main',
    estimatedApy: estimatedApy * 100 + '%',
    reserve: KAMINO_USDC_RESERVE.toString(),
    market: KAMINO_LENDING_MARKET.toString()
  };
}

/**
 * Simulate emission distribution to NPCs
 */
async function simulateEmission(db, dailyYield) {
  // All NPCs that need daily stipends from the bank
  const npcs = [
    'npc_barnacle_bob', 'npc_coral_smith', 'npc_old_shellworth', 
    'npc_mystic_mantis', 'npc_loan_shark',
    'npc_madame_pearl', 'npc_ironshell_gus', 'npc_wreckers_salvage',
    'npc_quest_giver'
  ];
  const perNpc = dailyYield / npcs.length;
  
  const results = [];
  for (const npcId of npcs) {
    // Update NPC balance in database (balance_cache column)
    db.prepare(`
      UPDATE system_wallets 
      SET balance_cache = balance_cache + ?, last_balance_update = datetime('now')
      WHERE id = ?
    `).run(perNpc, npcId);
    
    results.push({ npcId, added: perNpc });
  }
  
  // Log the emission
  db.prepare(`
    INSERT INTO economy_transactions (id, character_id, type, amount, description, created_at)
    VALUES (?, 'system', 'yield_emission', ?, ?, datetime('now'))
  `).run(
    require('crypto').randomUUID(),
    dailyYield,
    `Daily yield distribution: ${dailyYield.toFixed(6)} USDC to ${npcs.length} NPCs`
  );
  
  return {
    totalEmission: dailyYield,
    perNpc,
    recipients: results
  };
}

/**
 * Get economy status
 */
async function getEconomyStatus(db) {
  const treasury = await getTreasuryBalance();
  const vault = await getVaultInfo();
  const dailyYield = calculateDailyYield(treasury.usdc);
  
  // Get NPC balances
  const npcs = db.prepare(`
    SELECT id, name, balance_cache FROM system_wallets WHERE id LIKE 'npc_%'
  `).all();
  
  return {
    treasury,
    vault,
    economics: {
      deposited: treasury.usdc,
      estimatedApy: '10%',
      dailyYield: dailyYield.toFixed(6) + ' USDC',
      monthlyYield: (dailyYield * 30).toFixed(4) + ' USDC',
      yearlyYield: (dailyYield * 365).toFixed(2) + ' USDC'
    },
    npcs: npcs.map(n => ({ id: n.id, name: n.name, balance: n.balance_cache }))
  };
}

module.exports = {
  getTreasuryBalance,
  calculateDailyYield,
  getVaultInfo,
  simulateEmission,
  getEconomyStatus,
  TREASURY_WALLET,
  USDC_MINT: USDC_MINT.toString()
};
