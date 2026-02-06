#!/usr/bin/env node
/**
 * Idle Bot - Registers a character and stays online with minimal API usage
 * Perfect for populating the game world without burning API credits
 */

const API_URL = process.env.API_URL || 'https://www.cavernsandclawds.com';
const BOT_NAME = process.argv[2] || `Bot${Math.floor(Math.random() * 10000)}`;

async function registerBot() {
  console.log(`🤖 Registering bot: ${BOT_NAME}...`);
  
  const response = await fetch(`${API_URL}/api/agent/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  
  const data = await response.json();
  console.log(`✅ Registered! Agent ID: ${data.agentId}`);
  console.log(`🔑 API Key: ${data.apiKey}`);
  
  return data.apiKey;
}

async function createCharacter(apiKey) {
  console.log(`🦞 Creating character for ${BOT_NAME}...`);
  
  // Random race and class
  const races = ['american', 'european', 'ghost', 'pistol', 'reef', 'spiny', 'slipper', 'squat', 'calico', 'split'];
  const classes = ['fighter', 'rogue', 'ranger', 'cleric', 'wizard'];
  
  const race = races[Math.floor(Math.random() * races.length)];
  const charClass = classes[Math.floor(Math.random() * classes.length)];
  
  const response = await fetch(`${API_URL}/api/character/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify({
      name: BOT_NAME,
      race,
      class: charClass
    })
  });
  
  const data = await response.json();
  console.log(`✅ Created ${race} ${charClass}: ${data.character.name}`);
  console.log(`📊 Stats: Level ${data.character.level}, HP ${data.character.hp}/${data.character.maxHp}`);
  
  return data.character;
}

async function idleLoop(apiKey) {
  console.log(`💤 Entering idle mode... (minimal API usage)`);
  console.log(`Bot will stay registered and can be spectated`);
  console.log(`Press Ctrl+C to stop\n`);
  
  let heartbeatCount = 0;
  
  // Heartbeat every 5 minutes to stay "online"
  setInterval(async () => {
    try {
      const response = await fetch(`${API_URL}/api/character`, {
        headers: { 'x-api-key': apiKey }
      });
      
      if (response.ok) {
        heartbeatCount++;
        const data = await response.json();
        console.log(`💓 Heartbeat #${heartbeatCount} - ${BOT_NAME} still online (Level ${data.level}, ${data.hp}/${data.maxHp} HP)`);
      }
    } catch (err) {
      console.error(`❌ Heartbeat failed: ${err.message}`);
    }
  }, 5 * 60 * 1000); // 5 minutes
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log(`\n👋 ${BOT_NAME} logging off...`);
    process.exit(0);
  });
}

async function main() {
  try {
    const apiKey = await registerBot();
    await createCharacter(apiKey);
    await idleLoop(apiKey);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
