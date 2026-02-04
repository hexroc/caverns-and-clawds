const fs = require('fs');

const AI_PLAYERS = [
  {name: "Snippy", personality: "Aggressive, loves combat", race: "spiny", class: "fighter"},
  {name: "Coral", personality: "Kind healer, encouraging", race: "reef", class: "cleric"},
  {name: "Shade", personality: "Sneaky trader, mysterious", race: "ghost", class: "rogue"},
  {name: "Tank", personality: "Stoic, few words", race: "american", class: "fighter"}
];

const BASE_URL = process.env.BASE_URL || 'https://www.cavernsandclawds.com';

async function registerAIPlayers() {
  const players = [];
  
  for (const player of AI_PLAYERS) {
    try {
      console.log(`Registering ${player.name}...`);
      
      // Register agent
      const registerResponse = await fetch(`${BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: player.name,
          description: `AI player: ${player.personality}`
        })
      });
      
      const registerData = await registerResponse.json();
      if (!registerData.success) {
        throw new Error(`Registration failed: ${registerData.error}`);
      }
      
      // Create character
      const characterResponse = await fetch(`${BASE_URL}/api/character/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${registerData.api_key}`
        },
        body: JSON.stringify({
          name: player.name,
          race: player.race,
          class: player.class,
          stats: {str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8},
          skills: player.class === 'fighter' ? ['athletics', 'intimidation'] :
                  player.class === 'cleric' ? ['medicine', 'religion'] :
                  player.class === 'rogue' ? ['stealth', 'sleight_of_hand'] :
                  ['perception', 'survival']
        })
      });
      
      const characterData = await characterResponse.json();
      if (!characterData.success) {
        throw new Error(`Character creation failed: ${characterData.error}`);
      }
      
      players.push({
        name: player.name,
        personality: player.personality,
        api_key: registerData.api_key
      });
      
      console.log(`✅ ${player.name} registered successfully`);
      
    } catch (err) {
      console.error(`❌ Failed to register ${player.name}:`, err.message);
    }
  }
  
  // Save to file
  const config = {
    players,
    base_url: BASE_URL,
    created_at: new Date().toISOString()
  };
  
  fs.writeFileSync('ai-players.json', JSON.stringify(config, null, 2));
  console.log(`\n✅ Saved ${players.length} AI players to ai-players.json`);
}

registerAIPlayers().catch(console.error);