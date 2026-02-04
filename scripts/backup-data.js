const Database = require('better-sqlite3');
const fs = require('fs');

// Backup critical data to JSON
const db = new Database('./db/caverns.db');

const backup = {
  timestamp: new Date().toISOString(),
  users: db.prepare('SELECT * FROM users').all(),
  clawds: db.prepare('SELECT * FROM clawds').all(),
  economy_transactions: [],
  player_materials: [],
  bank_accounts: []
};

// Try to backup economy tables if they exist
try {
  backup.economy_transactions = db.prepare('SELECT * FROM economy_transactions').all();
  backup.player_materials = db.prepare('SELECT * FROM player_materials').all();
  backup.bank_accounts = db.prepare('SELECT * FROM bank_accounts').all();
  console.log('✅ Economy data backed up');
} catch (err) {
  console.log('⚠️ Some economy tables not found, skipping');
}

fs.writeFileSync('./data-backup.json', JSON.stringify(backup, null, 2));
console.log('✅ Backup saved to data-backup.json');
console.log(`📊 Backed up: ${backup.users.length} users, ${backup.clawds.length} characters`);
