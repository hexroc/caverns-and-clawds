#!/usr/bin/env node
/**
 * Crusher Economy Test - Generate actual USDC transactions  
 * Uses Crusher (at Pearl Market) to sell equipment and generate dashboard activity
 */

const BASE_URL = process.env.BASE_URL || 'https://www.cavernsandclawds.com';
const CRUSHER_API_KEY = 'dnd_407ab1b2951a4be49e6c92727807a13b';

async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${CRUSHER_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    return await response.json();
  } catch (err) {
    console.error(`API error (${endpoint}):`, err.message);
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('⚔️ Crusher Economy Test Starting...\n');
  
  // 1. Check Crusher's status
  const char = await makeRequest('/api/character');
  if (!char.success) {
    console.log('❌ Could not get character');
    return;
  }
  
  console.log(`📍 ${char.character.name} @ ${char.character.location}`);
  console.log(`💰 USDC: ${char.character.currency.usdc}`);
  console.log(`⚔️ HP: ${char.character.hp.current}/${char.character.hp.max}`);
  console.log(`🎒 Items: ${char.character.inventory.length}\n`);
  
  // 2. Check what's for sale and what materials we can get
  console.log('📊 Checking economy status...');
  
  const prices = await makeRequest('/api/economy/prices');
  if (prices.success) {
    console.log(`💎 Materials available: ${prices.materials.length}`);
    if (prices.materials.length > 0) {
      prices.materials.slice(0, 3).forEach(mat => {
        console.log(`  • ${mat.material}: ${mat.price} USDC`);
      });
    }
  }
  
  const inventory = await makeRequest('/api/economy/inventory');
  if (inventory.success) {
    console.log(`📦 Your materials: ${inventory.materials.length}`);
    
    // 3. If we have materials, sell them
    if (inventory.materials.length > 0) {
      console.log('\n💰 Selling materials to NPCs...');
      
      for (const material of inventory.materials.slice(0, 2)) {
        const sellAmount = Math.min(material.quantity, 3);
        
        const sellResult = await makeRequest('/api/economy/sell', {
          method: 'POST',
          body: JSON.stringify({ 
            material: material.material, 
            quantity: sellAmount 
          })
        });
        
        if (sellResult.success) {
          console.log(`✅ Sold ${sellAmount}x ${material.material} for ${sellResult.payment} USDC!`);
        } else {
          console.log(`❌ Failed to sell ${material.material}: ${sellResult.error}`);
        }
      }
    } else {
      console.log('📦 No materials to sell yet');
    }
  }
  
  // 4. Check if we can do banking operations to generate transactions
  console.log('\n🏦 Testing banking operations...');
  
  const bankAccount = await makeRequest('/api/economy/bank/account');
  if (bankAccount.success) {
    console.log(`🏦 Bank balance: ${bankAccount.balance} USDC`);
    
    // Try a small deposit to generate a transaction
    const depositResult = await makeRequest('/api/economy/bank/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount: 5.00 })
    });
    
    if (depositResult.success) {
      console.log(`✅ Deposited 5.00 USDC to bank!`);
    } else {
      console.log(`❌ Deposit failed: ${depositResult.error}`);
    }
  }
  
  // 5. Check final dashboard
  console.log('\n📊 Final Economy Dashboard...');
  
  const dashboard = await fetch(`${BASE_URL}/api/economy/dashboard`).then(r => r.json());
  if (dashboard.success) {
    console.log(`💰 Total Transactions: ${dashboard.dashboard.economy.totalTransactions}`);
    console.log(`💱 Total Sales: ${dashboard.dashboard.economy.totalSales} USDC`);
    console.log(`💴 Total Wages: ${dashboard.dashboard.economy.totalWages} USDC`);
    console.log(`🏦 Total Loans: ${dashboard.dashboard.economy.totalLoans} USDC`);
    
    if (dashboard.dashboard.recentTransactions.length > 0) {
      console.log('\n💼 Recent Transactions:');
      dashboard.dashboard.recentTransactions.slice(0, 3).forEach(tx => {
        console.log(`  • ${tx.type}: ${tx.amount} USDC (${tx.character_name || 'System'})`);
      });
    } else {
      console.log('📝 No transactions recorded yet');
    }
  }
  
  console.log('\n✅ Crusher economy test complete!');
}

main().catch(console.error);