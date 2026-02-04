#!/usr/bin/env node
/**
 * Micro-Price Migration Script
 * Divides all prices by 1000 for yield-backed micro-economy
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'caverns.db');
const DIVISION_FACTOR = 1000;

console.log('🔬 MICRO-PRICE MIGRATION');
console.log(`Division factor: ${DIVISION_FACTOR}x\n`);

const db = new Database(DB_PATH);

// ============================================
// 1. UPDATE MATERIAL PRICES IN DATABASE
// ============================================
console.log('📦 Updating material prices in database...');

try {
  const materials = db.prepare('SELECT * FROM materials').all();
  const updateStmt = db.prepare('UPDATE materials SET base_price = ? WHERE id = ?');
  
  const materialTxn = db.transaction(() => {
    for (const mat of materials) {
      const newPrice = mat.base_price / DIVISION_FACTOR;
      updateStmt.run(newPrice, mat.id);
      console.log(`  ${mat.id}: ${mat.base_price} → ${newPrice.toFixed(4)} USDC`);
    }
  });
  
  materialTxn();
  console.log(`✅ Updated ${materials.length} materials\n`);
} catch (err) {
  console.log(`⚠️ Materials table may not exist yet: ${err.message}\n`);
}

// ============================================
// 2. UPDATE PROPERTY PRICES IN DATABASE
// ============================================
console.log('🏠 Updating property prices in database...');

try {
  const properties = db.prepare('SELECT * FROM properties').all();
  const updatePropStmt = db.prepare('UPDATE properties SET base_price = ?, current_price = ? WHERE id = ?');
  
  const propTxn = db.transaction(() => {
    for (const prop of properties) {
      const newBasePrice = prop.base_price / DIVISION_FACTOR;
      const newCurrentPrice = prop.current_price / DIVISION_FACTOR;
      updatePropStmt.run(newBasePrice, newCurrentPrice, prop.id);
      console.log(`  ${prop.name}: ${prop.base_price} → ${newBasePrice.toFixed(3)} USDC`);
    }
  });
  
  propTxn();
  console.log(`✅ Updated ${properties.length} properties\n`);
} catch (err) {
  console.log(`⚠️ Properties table may not exist yet: ${err.message}\n`);
}

// ============================================
// 3. UPDATE RENTAL AGREEMENTS
// ============================================
console.log('📋 Updating rental agreements...');

try {
  const rentals = db.prepare('SELECT * FROM rental_agreements').all();
  const updateRentStmt = db.prepare('UPDATE rental_agreements SET rent_amount = ? WHERE id = ?');
  
  const rentTxn = db.transaction(() => {
    for (const rental of rentals) {
      const newRent = rental.rent_amount / DIVISION_FACTOR;
      updateRentStmt.run(newRent, rental.id);
      console.log(`  Rental ${rental.id}: ${rental.rent_amount} → ${newRent.toFixed(4)} USDC`);
    }
  });
  
  rentTxn();
  console.log(`✅ Updated ${rentals.length} rentals\n`);
} catch (err) {
  console.log(`⚠️ Rentals table may not exist yet: ${err.message}\n`);
}

// ============================================
// 4. UPDATE NPC PRICES TABLE
// ============================================
console.log('🏪 Updating NPC prices...');

try {
  const npcPrices = db.prepare('SELECT * FROM npc_prices').all();
  const updateNpcStmt = db.prepare('UPDATE npc_prices SET base_price = ? WHERE id = ?');
  
  const npcTxn = db.transaction(() => {
    for (const price of npcPrices) {
      const newPrice = price.base_price / DIVISION_FACTOR;
      updateNpcStmt.run(newPrice, price.id);
      console.log(`  ${price.material}: ${price.base_price} → ${newPrice.toFixed(4)} USDC`);
    }
  });
  
  npcTxn();
  console.log(`✅ Updated ${npcPrices.length} NPC prices\n`);
} catch (err) {
  console.log(`⚠️ NPC prices table may not exist yet: ${err.message}\n`);
}

// ============================================
// 5. UPDATE AUCTION LISTINGS
// ============================================
console.log('🔨 Updating auction prices...');

try {
  const auctions = db.prepare('SELECT * FROM auctions WHERE status = "active"').all();
  const updateAuctionStmt = db.prepare(`
    UPDATE auctions SET 
      starting_price = ?, 
      current_bid = ?, 
      buyout_price = ? 
    WHERE id = ?
  `);
  
  const auctionTxn = db.transaction(() => {
    for (const auction of auctions) {
      const newStart = auction.starting_price / DIVISION_FACTOR;
      const newBid = auction.current_bid ? auction.current_bid / DIVISION_FACTOR : null;
      const newBuyout = auction.buyout_price ? auction.buyout_price / DIVISION_FACTOR : null;
      updateAuctionStmt.run(newStart, newBid, newBuyout, auction.id);
      console.log(`  Auction ${auction.id}: ${auction.starting_price} → ${newStart.toFixed(4)} USDC`);
    }
  });
  
  auctionTxn();
  console.log(`✅ Updated ${auctions.length} auctions\n`);
} catch (err) {
  console.log(`⚠️ Auctions table may not exist yet: ${err.message}\n`);
}

// ============================================
// 6. UPDATE PLAYER BALANCES (OPTIONAL - CAREFUL!)
// ============================================
console.log('💰 Checking player balances...');
console.log('   ⚠️  NOT auto-migrating player balances - they should start fresh');
console.log('   Run the DeFi reset script to wipe AI balances\n');

// ============================================
// 7. UPDATE BANK ACCOUNTS
// ============================================
console.log('🏦 Updating bank account balances...');

try {
  const accounts = db.prepare('SELECT * FROM bank_accounts').all();
  const updateBankStmt = db.prepare(`
    UPDATE bank_accounts SET 
      deposited_balance = ?,
      loan_balance = ?
    WHERE character_id = ?
  `);
  
  const bankTxn = db.transaction(() => {
    for (const acct of accounts) {
      const newDeposit = acct.deposited_balance / DIVISION_FACTOR;
      const newLoan = acct.loan_balance / DIVISION_FACTOR;
      updateBankStmt.run(newDeposit, newLoan, acct.character_id);
      console.log(`  Account ${acct.character_id}: deposit ${acct.deposited_balance} → ${newDeposit.toFixed(4)}, loan ${acct.loan_balance} → ${newLoan.toFixed(4)}`);
    }
  });
  
  bankTxn();
  console.log(`✅ Updated ${accounts.length} bank accounts\n`);
} catch (err) {
  console.log(`⚠️ Bank accounts table may not exist yet: ${err.message}\n`);
}

// ============================================
// SUMMARY
// ============================================
console.log('═══════════════════════════════════════════');
console.log('📊 MIGRATION COMPLETE');
console.log('═══════════════════════════════════════════');
console.log(`All prices divided by ${DIVISION_FACTOR}x`);
console.log('');
console.log('Resulting price ranges:');
console.log('  • Materials: 0.001-0.200 USDC');
console.log('  • Properties: 0.05-2.00 USDC');
console.log('  • Rent: 0.002-0.20 USDC/day');
console.log('');
console.log('⚠️  REMEMBER TO ALSO UPDATE SOURCE CODE:');
console.log('  • src/economy/init-economy.js (material defaults)');
console.log('  • src/quests.js (quest rewards)');
console.log('  • src/economy/realestate.js (property type prices)');
console.log('');
console.log('🦞 Micro-economy ready for real DeFi yields!');

db.close();
