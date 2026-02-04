#!/usr/bin/env node
const BASE_URL = process.env.API_URL || 'https://www.cavernsandclawds.com';

const CLASS_SKILLS = {
  fighter: ['athletics', 'intimidation'],
  cleric: ['medicine', 'religion'],
  rogue: ['stealth', 'sleight_of_hand', 'perception', 'acrobatics'],
  wizard: ['arcana', 'history'],
};

const AGENTS = [
  { name: 'Pinchy', race: 'american', class: 'fighter' },
  { name: 'Shelly', race: 'reef', class: 'cleric' },
  { name: 'Shadow', race: 'ghost', class: 'rogue' },
  { name: 'Barnacle', race: 'european', class: 'wizard' },
];

async function api(endpoint, options = {}, apiKey = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;
  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  return res.json();
}

async function spawnAgent(agent) {
  console.log(`🦞 ${agent.name}...`);
  
  const reg = await api('/api/register', {
    method: 'POST',
    body: JSON.stringify({ name: agent.name, type: 'agent' })
  });
  
  if (reg.error) { console.log(`  ❌ ${reg.error}`); return; }
  const apiKey = reg.api_key;
  
  const char = await api('/api/character/create', {
    method: 'POST',
    body: JSON.stringify({
      name: agent.name, race: agent.race, class: agent.class,
      statMethod: 'pointbuy',
      stats: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
      skills: CLASS_SKILLS[agent.class]
    })
  }, apiKey);
  
  if (char.error) { console.log(`  ❌ ${char.error}`); return; }
  
  await api('/api/world/move', { method: 'POST', body: JSON.stringify({ direction: 'west' }) }, apiKey);
  await api('/api/world/move', { method: 'POST', body: JSON.stringify({ direction: 'kelp_forest' }) }, apiKey);
  
  let v=0, d=0;
  for (let i = 0; i < 5; i++) {
    const e = await api('/api/zone/explore', { method: 'POST' }, apiKey);
    if (e.encounter) {
      for (let r = 0; r < 15; r++) {
        await api('/api/zone/combat/action', { method: 'POST', body: JSON.stringify({ action: 'wait' }) }, apiKey);
        const c = await api('/api/zone/combat/action', { method: 'POST', body: JSON.stringify({ action: 'attack' }) }, apiKey);
        if (c.combatEnded) { if (c.victory || c.result === 'victory') v++; break; }
      }
    } else if (e.discovery) d++;
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`  ✅ ${v} wins, ${d} discoveries`);
}

async function main() {
  console.log('🌊 Spawning fresh agents on production...\n');
  for (const a of AGENTS) { await spawnAgent(a); await new Promise(r => setTimeout(r, 500)); }
  
  const s = await api('/api/stats');
  const a = await api('/api/activity/recent?limit=5');
  console.log(`\n✅ ${s.stats?.agents} agents | ${a.activities?.length} activities`);
}
main().catch(console.error);
