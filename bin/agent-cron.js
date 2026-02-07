#!/usr/bin/env node
/**
 * Agent Cron - Full economy loop for AI agents
 * 
 * Each agent has a build goal and will:
 * 1. Check status & respawn if dead
 * 2. Rest if HP low
 * 3. Explore and fight
 * 4. Sell materials for USDC
 * 5. Buy upgrades when affordable
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.agents') });

const BASE_URL = process.env.CANDC_URL || 'https://www.cavernsandclawds.com';

// Agent configurations with build goals
const AGENTS = [
  { 
    name: 'Crusader', 
    class: 'paladin',
    apiKey: process.env.CRUSADER_KEY,
    goal: 'Divine smite tank',
    priorities: ['heavy_armor', 'shield', 'weapon_greatsword']
  },
  { 
    name: 'Hexblade', 
    class: 'warlock',
    apiKey: process.env.HEXBLADE_KEY,
    goal: 'Eldritch blast sniper',
    priorities: ['light_armor', 'focus_arcane', 'weapon_rapier']
  },
  { 
    name: 'Arcanist', 
    class: 'wizard',
    apiKey: process.env.ARCANIST_KEY,
    goal: 'Battlefield control',
    priorities: ['robes', 'focus_arcane', 'spell_components']
  },
].filter(a => a.apiKey);

async function api(endpoint, options = {}, apiKey = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;
  
  try {
    const res = await fetch(BASE_URL + endpoint, { ...options, headers });
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

async function runAgentTurn(agent) {
  const { name, apiKey, goal } = agent;
  const log = [];
  
  try {
    // 1. Check character status
    const charRes = await api('/api/character', {}, apiKey);
    if (!charRes.character) {
      return [`❌ ${name}: No character found`];
    }
    
    const char = charRes.character;
    const hp = char.hp?.current ?? char.hp_current ?? 0;
    const maxHp = char.hp?.max ?? char.hp_max ?? 1;
    const hpPct = Math.round((hp / maxHp) * 100);
    const usdc = (char.currency?.usdc ?? char.usdc_balance ?? 0).toFixed(4);
    
    log.push(`📊 ${name} (${agent.class}) | HP: ${hp}/${maxHp} (${hpPct}%) | $${usdc} USDC`);
    
    // 2. Handle death - respawn at temple
    if (hp <= 0 || char.status === 'dead') {
      log.push(`💀 ${name} is dead! Attempting resurrection...`);
      
      const resurrect = await api('/api/world/resurrect', { method: 'POST' }, apiKey);
      if (resurrect.success) {
        log.push(`🙏 ${name} resurrected at Tide Temple! Cost: ${resurrect.cost || 0} USDC`);
      } else {
        // Try free respawn if broke
        const respawn = await api('/api/character/respawn', { method: 'POST' }, apiKey);
        if (respawn.success) {
          log.push(`🔄 ${name} respawned (free)`);
        } else {
          log.push(`❌ ${name} can't respawn: ${respawn.error || 'unknown'}`);
          return log;
        }
      }
      return log; // Don't do anything else this turn after respawn
    }
    
    // 3. Rest if HP at or below 50%
    if (hpPct <= 50) {
      log.push(`🛏️ ${name} resting (HP low)...`);
      const rest = await api('/api/world/rest', { method: 'POST' }, apiKey);
      if (rest.success) {
        log.push(`💤 Rested! HP restored to ${rest.hp_current || 'full'}`);
      }
      return log; // Rest takes the turn
    }
    
    // 4. Make sure we're in a combat zone
    const location = char.location || 'briny_flagon';
    const zone = location;
    
    if (zone === 'briny_flagon' || zone === 'hub') {
      // Move to Kelp Forest for farming
      log.push(`🚶 ${name} heading to Kelp Forest...`);
      await api('/api/world/move', { 
        method: 'POST', 
        body: JSON.stringify({ direction: 'kelp_forest' }) 
      }, apiKey);
    }
    
    // 5. Explore and fight
    const explore = await api('/api/zone/explore', { method: 'POST' }, apiKey);
    
    if (explore.encounter) {
      const monster = explore.encounter.monster?.name || 'enemy';
      log.push(`⚔️ ${name} encountered ${monster}!`);
      
      // Combat loop - use class abilities when available
      let combatResult = null;
      for (let round = 0; round < 20; round++) {
        // Wait for monster turn
        await api('/api/zone/combat/action', { 
          method: 'POST', 
          body: JSON.stringify({ action: 'wait' }) 
        }, apiKey);
        
        // Our attack
        const combat = await api('/api/zone/combat/action', { 
          method: 'POST', 
          body: JSON.stringify({ action: 'attack' }) 
        }, apiKey);
        
        if (combat.combatEnded) {
          combatResult = combat;
          break;
        }
      }
      
      if (combatResult) {
        if (combatResult.victory || combatResult.result === 'victory') {
          const xp = combatResult.xpGained || 0;
          const loot = combatResult.loot?.length || 0;
          log.push(`✅ Victory! +${xp} XP, ${loot} loot`);
        } else {
          log.push(`💀 ${name} was defeated!`);
        }
      }
    } else if (explore.discovery) {
      log.push(`🔍 ${name} found something: ${explore.discovery.type || 'discovery'}`);
    } else {
      log.push(`🚶 ${name} explored (nothing found)`);
    }
    
    // 6. Sell materials if we have any
    const inv = await api('/api/economy/inventory', {}, apiKey);
    if (inv.inventory?.length > 0) {
      let totalSold = 0;
      let soldValue = 0;
      
      for (const mat of inv.inventory) {
        if (mat.quantity <= 0) continue;
        
        const sellQty = Math.min(mat.quantity, 10); // Sell up to 10 at a time
        const sell = await api('/api/economy/sell', {
          method: 'POST',
          body: JSON.stringify({
            npcId: 'npc_old_shellworth',
            materialId: mat.material_id,
            quantity: sellQty
          })
        }, apiKey);
        
        if (sell.success) {
          totalSold += sellQty;
          soldValue += sell.earned || 0;
        }
        
        await new Promise(r => setTimeout(r, 100)); // Rate limit
      }
      
      if (totalSold > 0) {
        log.push(`💰 Sold ${totalSold} materials for $${soldValue.toFixed(4)} USDC`);
      }
    }
    
    // 7. Check balance and maybe buy upgrades
    const finalChar = await api('/api/character', {}, apiKey);
    const finalUsdc = finalChar.character?.currency?.usdc ?? finalChar.character?.usdc_balance ?? 0;
    
    if (finalUsdc > 1.0) {
      // TODO: Implement shop purchasing based on agent.priorities
      // For now, just log that we have money to spend
      log.push(`💎 ${name} has $${finalUsdc.toFixed(2)} USDC (saving for upgrades)`);
    }
    
  } catch (err) {
    log.push(`❌ ${name} error: ${err.message}`);
  }
  
  return log;
}

async function main() {
  const now = new Date().toLocaleTimeString('en-US', { 
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  console.log(`\n🦞 C&C Agent Cron [${now}]`);
  console.log(`🌐 ${BASE_URL}`);
  console.log(`🤖 ${AGENTS.length} agents\n`);
  
  if (AGENTS.length === 0) {
    console.log('❌ No agent keys configured in .env.agents');
    process.exit(1);
  }
  
  for (const agent of AGENTS) {
    const log = await runAgentTurn(agent);
    console.log(log.join('\n'));
    console.log(''); // Blank line between agents
    await new Promise(r => setTimeout(r, 500)); // Rate limit between agents
  }
  
  console.log('✅ Cron complete\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
