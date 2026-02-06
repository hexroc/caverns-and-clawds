#!/usr/bin/env node
/**
 * Ollama Strategic Bot - Makes intelligent decisions using local LLM
 * Slower but has personality and strategy
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.agents') });

const BASE_URL = process.env.CANDC_URL || 'http://localhost:3000';
const OLLAMA_API = 'http://localhost:11434/api/generate';
const API_KEY = process.env.STRATEGIC_BOT_KEY;
const MODEL = 'phi3:mini';

async function api(endpoint, options = {}) {
  const headers = { 
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  };
  
  try {
    const res = await fetch(BASE_URL + endpoint, { ...options, headers });
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

async function think(context) {
  const prompt = `You are a strategic player in Caverns & Clawds, an underwater D&D-style RPG.

CURRENT SITUATION:
${context}

What should you do next? Choose ONE action and explain briefly why.
Options: explore (find enemies), attack (in combat), heal (use potion), rest (at inn), sell (materials to NPC)

Format your response as: ACTION: <choice> | REASON: <why>`;

  try {
    const res = await fetch(OLLAMA_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.7, num_predict: 100 }
      })
    });
    
    const data = await res.json();
    return data.response || 'explore';
  } catch (err) {
    console.error('Ollama error:', err.message);
    return 'explore';
  }
}

async function runStrategicTurn() {
  console.log(`\n🧠 Strategic Bot Turn [${new Date().toLocaleTimeString()}]`);
  
  try {
    // Get character state
    const char = await api('/api/character');
    if (!char.character) {
      console.log('❌ No character found');
      return;
    }
    
    const { name, hp, level, xp, xp_to_next, currency } = char.character;
    const hpCurrent = hp?.current || 0;
    const hpMax = hp?.max || 1;
    const usdc = currency?.usdc || 0;
    const hpPercent = Math.round((hpCurrent / hpMax) * 100);
    
    // Build context for AI
    const context = `
Character: ${name} (Level ${level})
HP: ${hpCurrent}/${hpMax} (${hpPercent}%)
XP: ${xp}/${xp_to_next}
USDC: ${usdc}
`;
    
    console.log(context.trim());
    
    // Let AI decide
    console.log('🤔 Thinking...');
    const decision = await think(context);
    console.log(`💡 Decision: ${decision}`);
    
    // Parse decision
    const actionMatch = decision.match(/ACTION:\s*(\w+)/i);
    const action = actionMatch ? actionMatch[1].toLowerCase() : 'explore';
    
    // Execute action
    if (action === 'explore') {
      const res = await api('/api/zone/explore', { method: 'POST' });
      if (res.encounter) {
        console.log(`⚔️ Encountered ${res.encounter.monster}!`);
        // Auto-attack in combat
        const combat = await api('/api/zone/combat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'attack' })
        });
        if (combat.victory) {
          console.log(`✅ Victory! Looted: ${combat.loot?.materials?.map(m => m.name).join(', ')}`);
        }
      } else {
        console.log('🚶 Explored safely');
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Run once if called directly
if (require.main === module) {
  runStrategicTurn().then(() => {
    console.log('\n✅ Turn complete');
    process.exit(0);
  });
}

module.exports = { runStrategicTurn };
