/**
 * Initialize the C&C Economy
 * 
 * Creates all system wallets and stores them in the database.
 * Run once to set up the economy, or to reset it.
 */

const db = require('../db');
const wallet = require('./wallet');

// Encryption key for storing private keys (should be in .env in production)
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || 'cnc-economy-dev-key-change-in-prod';

/**
 * Initialize economy tables
 */
function initTables() {
  console.log('📊 Creating economy tables...');
  
  db.exec(`
    -- System wallets (treasury, bank, NPCs)
    CREATE TABLE IF NOT EXISTS system_wallets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('treasury', 'bank', 'npc')) NOT NULL,
      public_key TEXT UNIQUE NOT NULL,
      encrypted_secret TEXT NOT NULL,
      balance_cache REAL DEFAULT 0,
      last_balance_update DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Bank accounts (for players and NPCs)
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      owner_type TEXT CHECK(owner_type IN ('player', 'npc', 'system')) NOT NULL,
      owner_id TEXT NOT NULL,
      deposited_balance REAL DEFAULT 0,
      loan_balance REAL DEFAULT 0,
      loan_interest_rate REAL DEFAULT 0.05,
      loan_due_date DATETIME,
      last_interest_paid DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(owner_type, owner_id)
    );
    
    -- Transaction log (all USDC movements)
    CREATE TABLE IF NOT EXISTS economy_transactions (
      id TEXT PRIMARY KEY,
      type TEXT CHECK(type IN ('transfer', 'deposit', 'withdraw', 'loan', 'repay', 'interest', 'job_pay', 'sale', 'purchase', 'treasury_tax', 'treasury_sweep', 'rest', 'resurrection', 'gacha', 'crafting', 'auction_fee')) NOT NULL,
      from_wallet TEXT,
      to_wallet TEXT,
      amount REAL NOT NULL,
      signature TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Materials table
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      base_price REAL NOT NULL,
      rarity TEXT CHECK(rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')) DEFAULT 'common',
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Player material inventory
    CREATE TABLE IF NOT EXISTS player_materials (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      FOREIGN KEY (character_id) REFERENCES clawds(id),
      FOREIGN KEY (material_id) REFERENCES materials(id),
      UNIQUE(character_id, material_id)
    );
    
    -- NPC material inventory (for pricing)
    CREATE TABLE IF NOT EXISTS npc_materials (
      id TEXT PRIMARY KEY,
      npc_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      FOREIGN KEY (npc_id) REFERENCES system_wallets(id),
      FOREIGN KEY (material_id) REFERENCES materials(id),
      UNIQUE(npc_id, material_id)
    );
    
    -- Jobs available from NPCs
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      npc_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      pay REAL NOT NULL,
      duration_minutes INTEGER DEFAULT 5,
      cooldown_minutes INTEGER DEFAULT 30,
      required_level INTEGER DEFAULT 1,
      FOREIGN KEY (npc_id) REFERENCES system_wallets(id)
    );
    
    -- Active/completed jobs
    CREATE TABLE IF NOT EXISTS job_assignments (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      paid BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (character_id) REFERENCES clawds(id)
    );
    
    -- Auction listings
    CREATE TABLE IF NOT EXISTS auctions (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      item_type TEXT CHECK(item_type IN ('material', 'item')) NOT NULL,
      item_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      starting_bid REAL NOT NULL,
      buyout_price REAL,
      current_bid REAL NOT NULL,
      current_bidder_id TEXT,
      status TEXT CHECK(status IN ('active', 'sold', 'expired', 'cancelled')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ends_at DATETIME NOT NULL,
      completed_at DATETIME,
      FOREIGN KEY (seller_id) REFERENCES clawds(id),
      FOREIGN KEY (current_bidder_id) REFERENCES clawds(id)
    );
    
    -- Auction bid history
    CREATE TABLE IF NOT EXISTS auction_bids (
      id TEXT PRIMARY KEY,
      auction_id TEXT NOT NULL,
      bidder_id TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (auction_id) REFERENCES auctions(id),
      FOREIGN KEY (bidder_id) REFERENCES clawds(id)
    );
    
    -- Add wallet columns to clawds if not exists
    -- (SQLite doesn't support IF NOT EXISTS for columns, so we'll handle this separately)
  `);
  
  // Add wallet columns to clawds table if they don't exist
  try {
    db.exec(`ALTER TABLE clawds ADD COLUMN wallet_public_key TEXT`);
    console.log('  Added wallet_public_key to clawds');
  } catch (e) {
    // Column already exists
  }
  
  try {
    db.exec(`ALTER TABLE clawds ADD COLUMN wallet_encrypted_secret TEXT`);
    console.log('  Added wallet_encrypted_secret to clawds');
  } catch (e) {
    // Column already exists
  }
  
  console.log('✅ Economy tables ready');
}

/**
 * Create and store a system wallet
 */
function createSystemWallet(id, name, type) {
  // Check if wallet already exists
  const existing = db.prepare('SELECT * FROM system_wallets WHERE id = ?').get(id);
  if (existing) {
    console.log(`  ⏭️  ${name} wallet already exists: ${existing.public_key}`);
    return existing;
  }
  
  // Generate new wallet
  const { publicKey, secretKey } = wallet.generateWallet();
  const encryptedSecret = wallet.encryptSecretKey(secretKey, ENCRYPTION_KEY);
  
  // Store in database
  db.prepare(`
    INSERT INTO system_wallets (id, name, type, public_key, encrypted_secret)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, type, publicKey, encryptedSecret);
  
  console.log(`  ✅ Created ${name} wallet: ${publicKey}`);
  
  return { id, name, type, public_key: publicKey, encrypted_secret: encryptedSecret };
}

/**
 * Initialize all system wallets
 */
function initSystemWallets() {
  console.log('💰 Creating system wallets...');
  
  // Treasury (house wallet)
  createSystemWallet('treasury', 'Treasury', 'treasury');
  
  // Reef Bank
  createSystemWallet('bank', 'Reef Bank', 'bank');
  
  // NPC Merchants
  const npcs = [
    { id: 'npc_barnacle_bob', name: 'Barnacle Bob', type: 'npc' },
    { id: 'npc_coral_smith', name: 'Coral the Smith', type: 'npc' },
    { id: 'npc_old_shellworth', name: 'Old Shellworth', type: 'npc' },
    { id: 'npc_mystic_mantis', name: 'Mystic Mantis', type: 'npc' },
    { id: 'npc_loan_shark', name: 'The Loan Shark', type: 'npc' },
    // Shop NPCs (item buying/selling)
    { id: 'npc_madame_pearl', name: 'Madame Pearl', type: 'npc' },
    { id: 'npc_ironshell_gus', name: 'Ironshell Gus', type: 'npc' },
    { id: 'npc_wreckers_salvage', name: "Wrecker's Salvage", type: 'npc' },
    // Quest giver NPCs
    { id: 'npc_quest_giver', name: 'Quest Board', type: 'npc' }
  ];
  
  for (const npc of npcs) {
    createSystemWallet(npc.id, npc.name, npc.type);
  }
  
  console.log('✅ System wallets ready');
}

/**
 * Initialize base materials
 */
function initMaterials() {
  console.log('🧪 Creating materials...');
  
  // MICRO-PRICES: Divided by 1000x for yield-backed economy
  const materials = [
    // Kelp Forest materials
    { id: 'crab_shell', name: 'Crab Shell', description: 'A sturdy shell from a giant crab', base_price: 0.005, rarity: 'common', category: 'shell' },
    { id: 'pristine_chitin', name: 'Pristine Chitin', description: 'Flawless chitin, perfect for crafting', base_price: 0.025, rarity: 'uncommon', category: 'shell' },
    { id: 'giant_claw', name: 'Giant Claw', description: 'A massive crab claw, highly prized', base_price: 0.100, rarity: 'rare', category: 'trophy' },
    { id: 'lurker_hide', name: 'Lurker Hide', description: 'Flexible hide from a kelp lurker', base_price: 0.008, rarity: 'common', category: 'hide' },
    { id: 'lurker_fang', name: 'Lurker Fang', description: 'A razor-sharp fang', base_price: 0.015, rarity: 'uncommon', category: 'tooth' },
    { id: 'lurker_heart', name: 'Lurker Heart', description: 'Still faintly glowing...', base_price: 0.080, rarity: 'rare', category: 'organ' },
    { id: 'shark_tooth', name: 'Shark Tooth', description: 'A serrated shark tooth', base_price: 0.003, rarity: 'common', category: 'tooth' },
    { id: 'shark_fin', name: 'Shark Fin', description: 'Prized by certain merchants', base_price: 0.020, rarity: 'uncommon', category: 'fin' },
    { id: 'shark_jaw', name: 'Shark Jaw', description: 'Complete jaw with all teeth', base_price: 0.060, rarity: 'rare', category: 'trophy' },
    { id: 'fish_scales', name: 'Fish Scales', description: 'Shimmering scales from a swarm', base_price: 0.001, rarity: 'common', category: 'scale' },
    { id: 'rare_scale', name: 'Rare Scale', description: 'An unusually beautiful scale', base_price: 0.010, rarity: 'uncommon', category: 'scale' },
    
    // Shipwreck materials
    { id: 'barnacle_cluster', name: 'Barnacle Cluster', description: 'Encrusted barnacles from a wreck', base_price: 0.004, rarity: 'common', category: 'shell' },
    { id: 'ghost_essence', name: 'Ghost Essence', description: 'Ethereal residue from a wraith', base_price: 0.050, rarity: 'rare', category: 'essence' },
    { id: 'anchor_chain', name: 'Anchor Chain', description: 'Rusty but still strong', base_price: 0.012, rarity: 'uncommon', category: 'metal' },
    
    // General materials
    { id: 'kelp_bundle', name: 'Kelp Bundle', description: 'Fresh kelp, useful for many things', base_price: 0.002, rarity: 'common', category: 'plant' },
    { id: 'sea_glass', name: 'Sea Glass', description: 'Smoothed glass from the depths', base_price: 0.006, rarity: 'common', category: 'gem' },
    { id: 'pearl', name: 'Pearl', description: 'A small pearl', base_price: 0.015, rarity: 'uncommon', category: 'gem' },
    { id: 'black_pearl', name: 'Black Pearl', description: 'Extremely rare and valuable', base_price: 0.200, rarity: 'epic', category: 'gem' }
  ];
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO materials (id, name, description, base_price, rarity, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  for (const mat of materials) {
    insertStmt.run(mat.id, mat.name, mat.description, mat.base_price, mat.rarity, mat.category);
  }
  
  console.log(`✅ Created ${materials.length} materials`);
}

/**
 * Initialize jobs
 */
function initJobs() {
  console.log('🔨 Creating jobs...');
  
  const jobs = [
    { id: 'job_kelp_harvest', npc_id: 'npc_barnacle_bob', name: 'Kelp Harvester', description: 'Gather kelp from the forest', pay: 0.002, duration: 5, cooldown: 30 },
    { id: 'job_shell_sorter', npc_id: 'npc_coral_smith', name: 'Shell Sorter', description: 'Sort materials by quality', pay: 0.003, duration: 5, cooldown: 30 },
    { id: 'job_dock_worker', npc_id: 'npc_barnacle_bob', name: 'Dock Worker', description: 'Load and unload cargo', pay: 0.002, duration: 5, cooldown: 20 },
    { id: 'job_guard_duty', npc_id: 'npc_loan_shark', name: 'Guard Duty', description: 'Watch the door at The Salty Claw', pay: 0.004, duration: 10, cooldown: 60 },
    { id: 'job_debt_collector', npc_id: 'npc_loan_shark', name: 'Debt Collector', description: 'Hunt down those who owe the bank', pay: 0.005, duration: 15, cooldown: 120, level: 3 }
  ];
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO jobs (id, npc_id, name, description, pay, duration_minutes, cooldown_minutes, required_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const job of jobs) {
    insertStmt.run(job.id, job.npc_id, job.name, job.description, job.pay, job.duration, job.cooldown, job.level || 1);
  }
  
  console.log(`✅ Created ${jobs.length} jobs`);
}

/**
 * Main initialization
 */
async function initEconomy() {
  console.log('🌊 ═══════════════════════════════════════════');
  console.log('🦞 CAVERNS & CLAWDS ECONOMY INITIALIZATION');
  console.log('🌊 ═══════════════════════════════════════════\n');
  
  initTables();
  console.log('');
  
  initSystemWallets();
  
  // Seed NPC wallets with starting USDC if broke
  const STARTING_NPC_BALANCE = 5.0;
  const merchantNPCs = ['npc_madame_pearl', 'npc_ironshell_gus', 'npc_coral_trader', 'npc_weapon_smith', 'npc_old_shellworth'];
  const seedStmt = db.prepare(`
    UPDATE system_wallets 
    SET balance_cache = ? 
    WHERE id = ? AND (balance_cache IS NULL OR balance_cache < 0.01)
  `);
  let seeded = 0;
  for (const npcId of merchantNPCs) {
    const r = seedStmt.run(STARTING_NPC_BALANCE, npcId);
    if (r.changes > 0) seeded++;
  }
  if (seeded > 0) console.log(`  💰 Seeded ${seeded} NPCs with $${STARTING_NPC_BALANCE} USDC each`);
  console.log('');
  
  initMaterials();
  console.log('');
  
  initJobs();
  console.log('');
  
  console.log('🌊 ═══════════════════════════════════════════');
  console.log('✅ ECONOMY INITIALIZED');
  console.log('🌊 ═══════════════════════════════════════════\n');
  
  // Print wallet addresses for funding
  console.log('📋 WALLET ADDRESSES (fund these with devnet USDC):');
  const wallets = db.prepare('SELECT id, name, public_key FROM system_wallets').all();
  for (const w of wallets) {
    console.log(`   ${w.name}: ${w.public_key}`);
  }
  console.log('');
}

// Run if called directly
if (require.main === module) {
  initEconomy().catch(console.error);
}

module.exports = {
  initEconomy,
  initTables,
  initSystemWallets,
  initMaterials,
  initJobs,
  ENCRYPTION_KEY
};
