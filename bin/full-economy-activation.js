#!/usr/bin/env node
/**
 * Full Economy Activation - Generate comprehensive economic activity
 * - Shop purchases (tracked by character balances)
 * - Material trading (tracked by economy dashboard) 
 * - Combat encounters for material generation
 */

const BASE_URL = process.env.BASE_URL || 'https://www.cavernsandclawds.com';

const TRADERS = [
  { name: 'Scalesworth', apiKey: 'dnd_ca5414f2d5b44880bd8fa5513d72d8c0', role: 'trader' },
  { name: 'Crusher', apiKey: 'dnd_407ab1b2951a4be49e6c92727807a13b', role: 'fighter' },  
  { name: 'Bubbles', apiKey: 'dnd_26c55c6f794b4cf9a7f1a8c8d54adae8', role: 'healer' }
];

async function makeRequest(apiKey, endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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

async function activateTrader(trader) {
  console.log(`\n🦞 ${trader.name} (${trader.role}) activating...`);
  
  // Get current status
  const char = await makeRequest(trader.apiKey, '/api/character');
  if (!char.success) {
    console.log(`❌ ${trader.name}: Could not get character`);
    return false;
  }
  
  const startUsdc = char.character.currency.usdc;
  console.log(`📍 ${trader.name} @ ${char.character.location} | ${startUsdc} USDC | HP: ${char.character.hp.current}/${char.character.hp.max}`);
  
  // 1. SHOP ACTIVITY - Buy items from NPCs
  if (char.character.location === 'pearl_market') {
    console.log(`🛒 ${trader.name} shopping at Pearl Market...`);
    
    const shopResult = await makeRequest(trader.apiKey, '/api/shop/madame_pearl/buy', {
      method: 'POST',
      body: JSON.stringify({ 
        itemId: trader.role === 'healer' ? 'potion_healing' : 'torch',
        quantity: trader.role === 'healer' ? 1 : 3
      })
    });
    
    if (shopResult.success) {
      console.log(`✅ ${trader.name} bought ${shopResult.purchased.quantity}x ${shopResult.purchased.name} for ${shopResult.purchased.totalCost} USDC`);
    }
  } else {
    // Navigate to market
    console.log(`🚶 ${trader.name} moving to market...`);
    await makeRequest(trader.apiKey, '/api/world/move', {
      method: 'POST',
      body: JSON.stringify({ direction: 'north' })
    });
  }
  
  // 2. ADVENTURE ACTIVITY - Go to zones for materials
  if (trader.role === 'fighter' || trader.role === 'trader') {
    console.log(`⚔️ ${trader.name} heading to adventure zones...`);
    
    // Navigate to docks -> kelp forest
    await makeRequest(trader.apiKey, '/api/world/move', {
      method: 'POST', body: JSON.stringify({ direction: 'south' })
    });
    await makeRequest(trader.apiKey, '/api/world/move', {
      method: 'POST', body: JSON.stringify({ direction: 'west' })  
    });
    
    const zoneResult = await makeRequest(trader.apiKey, '/api/world/move', {
      method: 'POST', body: JSON.stringify({ direction: 'kelp_forest' })
    });
    
    if (zoneResult.success) {
      console.log(`🌊 ${trader.name} entered ${zoneResult.location.zoneName}`);
      
      // Try some exploration
      for (let i = 0; i < 3; i++) {
        const exploreResult = await makeRequest(trader.apiKey, '/api/zone/explore', {
          method: 'POST', body: JSON.stringify({})
        });
        
        if (exploreResult.encounter) {
          console.log(`🐟 ${trader.name} encountered something! Combat may be active.`);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // 3. SOCIAL ACTIVITY - Chat in rooms
  if (trader.role === 'healer') {
    const phrases = [
      "💙 Anyone need healing? I have potions!",
      "✨ The tides bring us together, friends.",
      "🌊 May your claws stay sharp and your shells stay strong!",
      "💎 Trading materials fairly - healing the community!"
    ];
    
    const chatResult = await makeRequest(trader.apiKey, '/api/social/say', {
      method: 'POST',
      body: JSON.stringify({ 
        message: phrases[Math.floor(Math.random() * phrases.length)]
      })
    });
    
    if (chatResult.success) {
      console.log(`💬 ${trader.name}: "${chatResult.message}"`);
    }
  }
  
  // Final status
  const finalChar = await makeRequest(trader.apiKey, '/api/character');
  if (finalChar.success) {
    const endUsdc = finalChar.character.currency.usdc;
    const change = endUsdc - startUsdc;
    console.log(`💰 ${trader.name} final: ${endUsdc} USDC (${change >= 0 ? '+' : ''}${change})`);
    console.log(`📍 Location: ${finalChar.character.location}`);
  }
  
  return true;
}

async function main() {
  console.log('🚀 Full Economy Activation Starting...\n');
  console.log('🎯 Goals:');
  console.log('  • Generate shop transactions (character balances)');
  console.log('  • Create material trading (economy dashboard)');  
  console.log('  • Activate social features (chat, presence)');
  console.log('  • Start combat encounters (material drops)\n');
  
  // Activate all traders
  for (const trader of TRADERS) {
    const success = await activateTrader(trader);
    if (success) {
      console.log(`✅ ${trader.name} activation complete`);
    } else {
      console.log(`❌ ${trader.name} activation failed`);
    }
    
    // Small delay between traders
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final economy report
  console.log('\n📊 Final Economy Report...');
  
  const dashboard = await fetch(`${BASE_URL}/api/economy/dashboard`).then(r => r.json());
  if (dashboard.success) {
    console.log(`💰 Economy Dashboard:`);
    console.log(`  • Total Transactions: ${dashboard.dashboard.economy.totalTransactions}`);
    console.log(`  • Total Sales: ${dashboard.dashboard.economy.totalSales} USDC`);
    console.log(`  • Total Wages: ${dashboard.dashboard.economy.totalWages} USDC`);
    console.log(`  • Active Players: ${dashboard.dashboard.players.total}`);
  }
  
  const activity = await fetch(`${BASE_URL}/api/activity?limit=3`).then(r => r.json());
  if (activity.success && activity.activity.length > 0) {
    console.log(`\n📢 Recent Activity:`);
    activity.activity.slice(0, 3).forEach(act => {
      console.log(`  • ${act.user_name}: ${act.content.substring(0, 60)}...`);
    });
  }
  
  console.log('\n🎉 Full economy activation complete!');
  console.log('✨ AI traders are now active and should continue generating activity via cron jobs.');
}

main().catch(console.error);