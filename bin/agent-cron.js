#!/usr/bin/env node
/**
 * Agent Cron - Runs periodic actions for all AI agents
 * Called by OpenClaw cron every 5 minutes
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.agents') });

const BASE_URL = process.env.CANDC_URL || 'http://localhost:3000';

// Hardcoded agent keys (from production registration - 2026-02-07)
const AGENTS = [
  { name: 'ShellShock', apiKey: process.env.SHELLSHOCK_KEY },
  { name: 'DeepShadow', apiKey: process.env.DEEPSHADOW_KEY },
  { name: 'ReefRunner', apiKey: process.env.REEFRUNNER_KEY },
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
  const { name, apiKey } = agent;
  const actions = [];
  
  try {
    // Check character exists and is alive
    const charRes = await api('/api/character', {}, apiKey);
    if (!charRes.character) {
      return [`❌ ${name}: No character`];
    }
    
    const hp = charRes.character.hp_current;
    const maxHp = charRes.character.hp_max;
    
    if (hp <= 0) {
      // Respawn if dead
      await api('/api/character/respawn', { method: 'POST' }, apiKey);
      return [`🔄 ${name} respawned`];
    }
    
    // 1. Explore
    const explore = await api('/api/zone/explore', { method: 'POST' }, apiKey);
    
    if (explore.encounter) {
      actions.push(`⚔️ ${name} vs monster`);
      
      // 2. Fight until combat ends
      for (let round = 0; round < 20; round++) {
        await api('/api/zone/combat/action', { method: 'POST', body: JSON.stringify({ action: 'wait' }) }, apiKey);
        const combat = await api('/api/zone/combat/action', { method: 'POST', body: JSON.stringify({ action: 'attack' }) }, apiKey);
        
        if (combat.combatEnded) {
          actions.push(combat.result === 'victory' ? `✅ Won!` : `💀 Died`);
          break;
        }
      }
    } else if (explore.discovery) {
      actions.push(`🔍 ${name} discovery`);
    } else {
      actions.push(`🚶 ${name} explored`);
    }
    
    // 3. Sell materials (if any)
    const inv = await api('/api/economy/inventory', {}, apiKey);
    if (inv.inventory?.length > 0) {
      let sold = 0;
      for (const mat of inv.inventory.slice(0, 3)) {
        const sell = await api('/api/economy/sell', {
          method: 'POST',
          body: JSON.stringify({
            npcId: 'npc_old_shellworth',
            materialId: mat.material_id,
            quantity: Math.min(mat.quantity, 5)
          })
        }, apiKey);
        if (sell.success) sold++;
      }
      if (sold > 0) actions.push(`💰 ${name} sold ${sold} items`);
    }
    
  } catch (err) {
    actions.push(`❌ ${name}: ${err.message}`);
  }
  
  return actions;
}

async function main() {
  const now = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles' });
  console.log(`🦞 Agent Cron [${now}]`);
  console.log(`URL: ${BASE_URL}`);
  console.log(`Agents: ${AGENTS.length}`);
  
  if (AGENTS.length === 0) {
    console.log('❌ No agent keys configured');
    process.exit(1);
  }
  
  const allActions = [];
  for (const agent of AGENTS) {
    const actions = await runAgentTurn(agent);
    allActions.push(...actions);
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n' + allActions.join('\n'));
  console.log(`\n✅ Done`);
}

main().catch(err => {
  console.error('Cron error:', err);
  process.exit(1);
});
