#!/usr/bin/env node
/**
 * Caverns & Clawds - Autonomous AI Player
 * 
 * An AI agent that plays the game autonomously, making decisions
 * based on the current situation and thinking out loud.
 * 
 * Run with: node src/ai-player.js
 *       Or: node src/ai-player.js --character "Clawdius"
 *       Or: node src/ai-player.js --api-key "test_faithful_key"
 */

const BASE_URL = process.env.CAVERNS_API_URL || 'http://192.168.1.206:3000';

// ============================================================================
// AI PERSONALITY SYSTEM
// ============================================================================

const PERSONALITIES = {
  adventurous: {
    name: 'Clawdius the Bold',
    traits: ['brave', 'curious', 'optimistic'],
    greetings: [
      'By the currents! A new day of adventure awaits!',
      '*cracks claws* Let\'s see what trouble we can find today.',
      'The deep calls to me... I must answer!',
    ],
    onCombat: [
      '*brandishes claws menacingly* Have at thee!',
      'This should be interesting...',
      'Time to test my mettle!',
    ],
    onVictory: [
      'Ha! Another foe bested!',
      '*clicks claws triumphantly* Too easy!',
      'Victory! The tales they\'ll tell of this day!',
    ],
    onDefeat: [
      'Ugh... I need to regroup...',
      'That... did not go as planned.',
      '*mutters* Next time will be different.',
    ],
    onExplore: [
      'What wonders await around this corner?',
      'I wonder what secrets this place holds...',
      '*scuttles forward eagerly*',
    ],
    onQuest: [
      'A worthy challenge! I accept!',
      'This sounds like just the adventure I need!',
      '*nods solemnly* It shall be done.',
    ],
    onNPC: [
      'Greetings, friend! What news do you bring?',
      '*approaches curiously* Well met!',
      'Perhaps this one has wisdom to share...',
    ],
    onLoot: [
      'Ooh, shiny! *examines treasure*',
      'The spoils of victory!',
      '*tucks item away carefully* This will come in handy.',
    ],
    onRest: [
      '*finds a quiet alcove to rest*',
      'Even heroes need to catch their breath...',
      'A brief respite, then onward!',
    ],
  },
  cautious: {
    name: 'Sheldon the Wise',
    traits: ['careful', 'analytical', 'patient'],
    greetings: [
      '*surveys surroundings carefully* Alright, let\'s proceed methodically.',
      'A cautious claw catches more prey...',
      'Hmm, let me assess the situation.',
    ],
    onCombat: [
      '*raises guard* Must be careful here...',
      'I don\'t like this, but here goes...',
      '*calculates approach* Let\'s be smart about this.',
    ],
    onVictory: [
      '*exhales* That could have gone worse.',
      'Preparation pays off.',
      'Adequate. Moving on.',
    ],
    onDefeat: [
      'I should have been more careful...',
      '*limps away* Lesson learned.',
      'Next time, more preparation.',
    ],
    onExplore: [
      '*tests the water ahead* Proceed with caution...',
      'Let me check for traps first...',
      '*moves slowly, observing everything*',
    ],
    onQuest: [
      '*considers carefully* The risks seem acceptable.',
      'I\'ll need to plan this out properly.',
      '*nods* A reasonable endeavor.',
    ],
    onNPC: [
      '*approaches warily* State your business.',
      'Hmm, can this one be trusted?',
      'Let\'s hear what you have to say.',
    ],
    onLoot: [
      '*inspects item thoroughly* Interesting...',
      'This appears useful. I\'ll keep it.',
      '*catalogs find mentally*',
    ],
    onRest: [
      '*finds defensible position to rest*',
      'I\'ll rest, but stay alert.',
      'A tactical withdrawal to recover.',
    ],
  },
  chaotic: {
    name: 'Bubbles the Unpredictable',
    traits: ['impulsive', 'energetic', 'chaotic'],
    greetings: [
      'WHEEEE! *zooms in circles* Let\'s DO THIS!',
      '*bounces excitedly* Adventure? ADVENTURE!',
      'I smell FUN and possibly DANGER! My favorite!',
    ],
    onCombat: [
      'YAAAAA! *charges wildly*',
      'FIGHT FIGHT FIGHT! *flails claws*',
      '*screams incoherently and attacks*',
    ],
    onVictory: [
      'WAHOO! *victory dance* I AM UNSTOPPABLE!',
      '*does a little shimmy* Too cool, too cool!',
      'DID YOU SEE THAT?! AMAZING!',
    ],
    onDefeat: [
      'OW OW OW! *retreats chaotically*',
      'NOT FAIR! *pouts dramatically*',
      '*flops* I need a minute...',
    ],
    onExplore: [
      'OOOOH what\'s THAT?! *rushes forward*',
      '*scuttles randomly* Adventure awaits EVERYWHERE!',
      'This way! No wait, THAT way!',
    ],
    onQuest: [
      'YES YES YES! Count me IN!',
      'I\'ll do it! Whatever it is! YES!',
      '*grabs quest excitedly* MINE!',
    ],
    onNPC: [
      'HELLO NEW FRIEND! *gets too close*',
      '*waves enthusiastically* HI HI HI!',
      'YOU! Tell me EVERYTHING!',
    ],
    onLoot: [
      'TREASURE! *grabs everything* MINE!',
      'Ooooh SHINY! *stuffs in shell*',
      '*happy clicking sounds*',
    ],
    onRest: [
      '*crashes suddenly* Just... five... minutes...',
      '*falls asleep mid-sentence*',
      'I\'m not tired YOU\'RE tired *yawns*',
    ],
  },
};

// ============================================================================
// API CLIENT
// ============================================================================

class CavernsAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async request(method, endpoint, body = null) {
    const options = {
      method,
      headers: this.headers,
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, options);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error(`API Error (${endpoint}):`, err.message);
      return { success: false, error: err.message };
    }
  }

  // World endpoints
  async look() { return this.request('GET', '/api/world/look'); }
  async move(direction) { return this.request('POST', '/api/world/move', { direction }); }
  async talk(npcId, topic = null) { return this.request('POST', '/api/world/talk', { npcId, topic }); }
  async search() { return this.request('GET', '/api/world/search'); }
  async exits() { return this.request('GET', '/api/world/exits'); }
  async recall() { return this.request('POST', '/api/world/recall'); }

  // Character endpoints
  async getCharacter() { return this.request('GET', '/api/character'); }
  async rest() { return this.request('POST', '/api/character/rest'); }

  // Quest endpoints (using quest engine)
  async getQuestBoard() { return this.request('GET', '/api/quests/board'); }
  async getActiveQuests() { return this.request('GET', '/api/quests/active'); }
  async acceptQuest(instanceId) { return this.request('POST', `/api/quests/accept/${instanceId}`); }

  // Combat/Zone endpoints
  async getZoneStatus() { return this.request('GET', '/api/zone/status'); }
  async explore() { return this.request('POST', '/api/zone/explore'); }
  async getCombat() { return this.request('GET', '/api/zone/combat'); }
  async attack(target = null) { return this.request('POST', '/api/zone/combat/action', { action: 'attack', target }); }
  async flee() { return this.request('POST', '/api/zone/combat/flee'); }
  async resurrect(method = 'free') { return this.request('POST', '/api/zone/resurrect', { method }); }
  async checkDeath() { return this.request('GET', '/api/zone/death'); }

  // Crafting endpoints
  async getCraftingStations() { return this.request('GET', '/api/craft/stations'); }
  async getRecipes() { return this.request('GET', '/api/craft/recipes'); }
  async craft(recipeId) { return this.request('POST', '/api/craft/make', { recipeId }); }

  // Social endpoints
  async say(message) { return this.request('POST', '/api/social/say', { message }); }
  async emote(emoteName) { return this.request('POST', '/api/social/emote', { emote: emoteName }); }

  // Spectator broadcast - send narrative events to spectator UI
  async broadcast(type, text, data = {}) {
    return this.request('POST', '/api/spectator/broadcast', { type, text, ...data });
  }
}

// ============================================================================
// AI PLAYER AGENT
// ============================================================================

class AIPlayer {
  constructor(apiKey, personalityType = 'adventurous') {
    this.api = new CavernsAPI(apiKey);
    this.personality = PERSONALITIES[personalityType] || PERSONALITIES.adventurous;
    this.character = null;
    this.running = false;
    this.actionCount = 0;
    this.lastAction = null;
    this.combatRounds = 0;
    this.explorationCount = 0;
    this.visitedRooms = new Set();
    this.currentQuests = [];
  }

  // Get a random phrase from an array
  randomPhrase(phrases) {
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  // Think out loud - broadcasts to spectators
  async think(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n[${timestamp}] 🦞 ${this.personality.name}: ${message}`);
    
    // Broadcast thought to spectators
    try {
      await this.api.broadcast('agent_thought', message);
    } catch (e) {
      // Don't fail if broadcast fails
    }
  }

  // Narrate actions - broadcasts to spectators
  async narrate(message, actionType = 'Narration') {
    console.log(`   📜 ${message}`);
    
    // Broadcast action to spectators
    try {
      await this.api.broadcast('agent_action', message, { actionType });
    } catch (e) {
      // Don't fail if broadcast fails
    }
  }

  // Broadcast arrival at a location
  async broadcastArrival(location) {
    try {
      await this.api.broadcast('agent_arrival', `Arrived at: ${location}`, { location });
    } catch (e) {
      // Don't fail if broadcast fails
    }
  }

  // Broadcast combat event
  async broadcastCombat(text, data = {}) {
    try {
      await this.api.broadcast('agent_combat', text, data);
    } catch (e) {
      // Don't fail if broadcast fails
    }
  }

  // Broadcast status update
  async broadcastStatus(text) {
    try {
      await this.api.broadcast('agent_status', text);
    } catch (e) {
      // Don't fail if broadcast fails
    }
  }

  // Log game data (no broadcast - just local logging)
  log(data) {
    if (typeof data === 'object') {
      console.log(`   📊 ${JSON.stringify(data, null, 2).split('\n').join('\n   ')}`);
    } else {
      console.log(`   📊 ${data}`);
    }
  }

  // Calculate HP percentage
  getHPPercent() {
    if (!this.character) return 100;
    return Math.round((this.character.hp.current / this.character.hp.max) * 100);
  }

  // Check if we should rest
  shouldRest() {
    return this.getHPPercent() < 50;
  }

  // Check if we're in danger (low HP)
  inDanger() {
    return this.getHPPercent() < 25;
  }

  // Initialize the agent
  async initialize() {
    await this.think(this.randomPhrase(this.personality.greetings));
    
    const charResult = await this.api.getCharacter();
    if (!charResult.success) {
      await this.think('Hmm, I seem to have no body... Something is wrong.');
      console.error('Failed to get character:', charResult.error);
      return false;
    }
    
    this.character = charResult.character;
    await this.narrate(`I am ${this.character.name}, a level ${this.character.level} ${this.character.race.name} ${this.character.class.name}.`, 'Introduction');
    await this.broadcastStatus(`HP: ${this.character.hp.current}/${this.character.hp.max} | USDC: ${this.character.currency?.usdc || 0}`);
    
    // Check if dead
    const deathCheck = await this.api.checkDeath();
    if (deathCheck.isDead) {
      await this.think('I... I\'m dead?! Let me fix that...');
      await this.api.resurrect('free');
      const newChar = await this.api.getCharacter();
      this.character = newChar.character;
    }
    
    // Get active quests
    const questResult = await this.api.getActiveQuests();
    if (questResult.success && questResult.quests) {
      this.currentQuests = questResult.quests;
      if (this.currentQuests.length > 0) {
        await this.narrate(`Active quests: ${this.currentQuests.map(q => q.name || q.quest_id).join(', ')}`, 'Quest Log');
      }
    }
    
    return true;
  }

  // Main decision loop
  async decide() {
    // 1. Look around first
    const look = await this.api.look();
    if (!look.success) {
      await this.think('I can\'t see anything... strange.');
      return 'wait';
    }

    this.visitedRooms.add(look.name || 'unknown');
    
    // 2. Check zone status (are we in combat?)
    const status = await this.api.getZoneStatus();
    
    // 3. If in combat, handle it
    if (status.inCombat) {
      return await this.handleCombat(status);
    }

    // 4. If low HP, rest or flee to safety
    if (this.shouldRest()) {
      return await this.handleRest(look);
    }

    // 5. Check for available quests if we don't have many
    if (this.currentQuests.length < 3 && look.features?.includes('quest_board')) {
      return await this.handleQuests(look);
    }

    // 6. If NPCs nearby, maybe talk to them
    if (look.npcs && look.npcs.length > 0 && Math.random() < 0.3) {
      return await this.handleNPC(look.npcs);
    }

    // 7. If in adventure zone, explore/fight
    if (status.zone?.isAdventureZone) {
      return await this.handleAdventureZone(look, status);
    }

    // 8. If in hub, decide what to do
    return await this.handleHub(look);
  }

  async handleCombat(status) {
    this.combatRounds++;
    
    if (this.combatRounds === 1) {
      await this.think(this.randomPhrase(this.personality.onCombat));
    }

    const combat = await this.api.getCombat();
    if (!combat.inCombat) {
      this.combatRounds = 0;
      return 'combat_ended';
    }

    // Check if it's our turn - if not, wait for the turn to come around
    if (combat.encounter?.isYourTurn === false) {
      const currentTurn = combat.encounter?.currentTurn || 'someone else';
      await this.narrate(`Waiting for ${currentTurn}'s turn...`, 'Combat');
      // Call wait to process other turns (henchman, monsters)
      const waitResult = await this.api.request('POST', '/api/zone/combat/action', { action: 'wait' });
      if (waitResult.combatEnded) {
        this.combatRounds = 0;
        if (waitResult.victory) {
          await this.think('Victory! My henchman finished them off!');
          if (waitResult.xpGained) {
            await this.narrate(`Gained ${waitResult.xpGained} XP!`, 'XP Gain');
          }
        }
        return waitResult.victory ? 'victory' : 'combat_ended';
      }
      return 'waiting_turn';
    }

    // If we're very low, try to flee
    if (this.inDanger()) {
      await this.think('This is getting dangerous... I should retreat!');
      const fleeResult = await this.api.flee();
      if (fleeResult.success && fleeResult.escaped) {
        await this.think('Phew, got away!');
        this.combatRounds = 0;
        return 'fled';
      }
      await this.narrate('Escape failed! Must fight on...', 'Combat');
    }

    // Attack the first monster
    const target = combat.monsters?.[0]?.id;
    const targetName = combat.monsters?.[0]?.name || 'enemy';
    await this.narrate(`Attacking ${targetName}!`, 'Combat');
    await this.broadcastCombat(`Attacking ${targetName}!`, { enemy: targetName });
    
    const attackResult = await this.api.attack(target);
    
    if (attackResult.success) {
      if (attackResult.playerAction) {
        await this.narrate(attackResult.playerAction.description || 'Strike!', 'Combat');
      }
      
      if (attackResult.combatEnded) {
        this.combatRounds = 0;
        if (attackResult.victory) {
          await this.think(this.randomPhrase(this.personality.onVictory));
          await this.broadcastCombat(`Defeated ${target || 'the enemy'}!`, { victory: true, enemy: target });
          if (attackResult.xpGained) {
            await this.narrate(`Gained ${attackResult.xpGained} XP!`, 'XP Gain');
            await this.broadcastStatus(`Gained ${attackResult.xpGained} XP!`);
          }
          if (attackResult.loot && attackResult.loot.length > 0) {
            await this.think(this.randomPhrase(this.personality.onLoot));
            await this.narrate(`Loot: ${attackResult.loot.map(l => l.name || l).join(', ')}`, 'Loot');
          }
        } else {
          await this.think(this.randomPhrase(this.personality.onDefeat));
          await this.broadcastCombat('Defeated in combat...', { victory: false });
        }
      }

      // Update character HP
      if (attackResult.character) {
        this.character.hp.current = attackResult.character.hp;
        this.character.hp.max = attackResult.character.maxHp;
      }
    }

    return 'attacked';
  }

  async handleRest(look) {
    await this.think(this.randomPhrase(this.personality.onRest));
    await this.broadcastStatus(`HP: ${this.character.hp.current}/${this.character.hp.max} (${this.getHPPercent()}%)`);
    
    // If in dangerous area, try to recall to safety
    const status = await this.api.getZoneStatus();
    if (status.zone?.isAdventureZone) {
      await this.think('I should get somewhere safer first...');
      const recallResult = await this.api.recall();
      if (recallResult.success) {
        await this.narrate('Teleported back to town!', 'Recall');
        await this.broadcastArrival('The Briny Flagon');
        return 'recalled';
      }
    }

    // Try to rest
    const restResult = await this.api.rest();
    if (restResult.success) {
      await this.narrate(`Resting... recovered ${restResult.healed || 'some'} HP`, 'Rest');
      if (restResult.character) {
        this.character.hp.current = restResult.character.hp;
      }
    }
    
    return 'rested';
  }

  async handleQuests(look) {
    const boardResult = await this.api.getQuestBoard();
    if (!boardResult.success || !boardResult.quests?.length) {
      await this.narrate('No quests available right now.', 'Quest Board');
      return 'no_quests';
    }

    // Find a quest we can accept
    const availableQuests = boardResult.quests.filter(q => q.can_accept);

    if (availableQuests.length === 0) {
      await this.narrate('No quests I can accept right now.', 'Quest Board');
      return 'no_suitable_quests';
    }

    // Pick a random quest
    const quest = availableQuests[Math.floor(Math.random() * availableQuests.length)];
    
    await this.think(this.randomPhrase(this.personality.onQuest));
    await this.narrate(`Accepting quest: "${quest.title}"`, 'Quest');
    await this.broadcastStatus(`📋 New quest: ${quest.title}`);
    
    const acceptResult = await this.api.acceptQuest(quest.instance_id);
    if (acceptResult.success) {
      this.currentQuests.push(quest);
      await this.narrate(quest.flavor_text || quest.description, 'Quest Details');
    } else {
      await this.narrate(`Failed to accept: ${acceptResult.error || 'unknown error'}`, 'Quest');
    }
    
    return 'accepted_quest';
  }

  async handleNPC(npcs) {
    const npc = npcs[Math.floor(Math.random() * npcs.length)];
    
    await this.think(this.randomPhrase(this.personality.onNPC));
    await this.narrate(`Approaching ${npc.name}...`, 'NPC Interaction');
    
    const talkResult = await this.api.talk(npc.id);
    if (talkResult.success) {
      // Note: The talk endpoint already broadcasts agent_dialogue to spectators
      await this.narrate(`${npc.name}: "${talkResult.dialogue || talkResult.message || 'Hello there!'}"`, 'Dialogue');
    }
    
    return 'talked';
  }

  async handleAdventureZone(look, status) {
    await this.think(this.randomPhrase(this.personality.onExplore));
    
    // Decide: explore (may trigger combat) or move to new room
    if (Math.random() < 0.6) {
      await this.narrate('Searching for adventure...', 'Exploration');
      const exploreResult = await this.api.explore();
      
      if (exploreResult.success) {
        if (exploreResult.encounter) {
          const enemies = exploreResult.encounter.monsters?.map(m => m.name).join(', ') || 'enemies';
          await this.narrate(`Encountered: ${enemies}!`, 'Encounter');
          await this.broadcastCombat(`Encountered: ${enemies}!`, { enemy: enemies });
          return 'encounter_started';
        } else {
          await this.narrate(exploreResult.message || 'Nothing found this time.', 'Exploration');
        }
      }
      this.explorationCount++;
      return 'explored';
    } else {
      // Move to a random exit
      return await this.moveRandomDirection(look);
    }
  }

  async handleHub(look) {
    // In the hub - decide what to do
    const actions = [];
    
    // If we have quests, head to adventure zone (higher priority)
    if (this.currentQuests.length > 0) {
      actions.push('adventure', 'adventure', 'adventure'); // 3x weight
    }
    
    // Look for quest board
    if (look.features?.includes('quest_board') && this.currentQuests.length < 3) {
      actions.push('quests');
    }
    
    // Random exploration
    actions.push('explore');
    
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    if (action === 'adventure') {
      return await this.seekAdventureZone(look);
    }
    
    if (action === 'quests') {
      return await this.handleQuests(look);
    }
    
    // Default: explore
    await this.think(this.randomPhrase(this.personality.onExplore));
    return await this.moveRandomDirection(look);
  }

  // Smart navigation to adventure zones
  async seekAdventureZone(look) {
    const exits = look.exits || [];
    const charLevel = this.character?.level || 1;
    
    // Known adventure zones with level requirements
    const adventureZones = {
      'kelp_forest': { minLevel: 1, maxLevel: 5 },  // Actually requires 2+ per API
      'shipwreck_graveyard': { minLevel: 3, maxLevel: 7 },
      'coral_labyrinth': { minLevel: 4, maxLevel: 8 },
      'murk': { minLevel: 6, maxLevel: 12 },
      'abyss': { minLevel: 10, maxLevel: 20 },
    };
    
    // Hub paths to adventure zones
    const hubToAdventureZone = {
      'briny_flagon': 'west',
      'driftwood_docks': 'kelp_forest',
      'wreckers_rest': 'shipwreck_graveyard',
    };
    
    // Check if any exit directly leads to an adventure zone - venture forth regardless of level!
    for (const exit of exits) {
      if (adventureZones[exit]) {
        const zone = adventureZones[exit];
        const dangerLevel = zone.minLevel - charLevel;
        if (dangerLevel >= 3) {
          await this.think('That looks extremely dangerous... but fortune favors the bold!');
        } else if (dangerLevel >= 1) {
          await this.think('Adventure zone ahead! Might be risky, but let\'s go!');
        } else {
          await this.think('Adventure zone ahead! Let\'s go!');
        }
        await this.narrate(`Entering ${exit}...`, 'Movement');
        const result = await this.api.move(exit);
        if (result.success) {
          const location = result.location?.name || result.newLocation || exit;
          if (result.warning) {
            await this.narrate(result.warning, 'Warning');
          }
          await this.narrate(`Arrived at: ${location}`, 'Arrival');
          await this.broadcastArrival(location);
          return 'entered_adventure_zone';
        }
      }
    }
    
    // Check known paths
    const currentLoc = look.name?.toLowerCase().replace(/[^a-z_]/g, '').replace('the', '').trim() || '';
    for (const [loc, direction] of Object.entries(hubToAdventureZone)) {
      if (currentLoc.includes(loc.replace('_', '')) || loc.includes(currentLoc.replace('_', ''))) {
        if (exits.includes(direction)) {
          await this.think('I know this path leads to adventure!');
          await this.narrate(`Moving ${direction}...`, 'Movement');
          const result = await this.api.move(direction);
          if (result.success) {
            const location = result.location?.name || result.newLocation || 'new area';
            if (result.warning) {
              await this.narrate(result.warning, 'Warning');
            }
            await this.narrate(`Arrived at: ${location}`, 'Arrival');
            await this.broadcastArrival(location);
            return 'moving_toward_adventure';
          }
        }
      }
    }
    
    // Explore and seek adventure!
    await this.think('Time to seek adventure!');
    return await this.moveRandomDirection(look);
  }

  async moveRandomDirection(look) {
    const exits = look.exits || [];
    if (exits.length === 0) {
      await this.narrate('No exits available!', 'Movement');
      return 'stuck';
    }

    const direction = exits[Math.floor(Math.random() * exits.length)];
    await this.narrate(`Moving ${direction}...`, 'Movement');
    
    const moveResult = await this.api.move(direction);
    if (moveResult.success) {
      const location = moveResult.location?.name || moveResult.newLocation || 'somewhere new';
      await this.narrate(`Arrived at: ${location}`, 'Arrival');
      await this.broadcastArrival(location);
    } else {
      await this.narrate(moveResult.error || 'Couldn\'t move that way.', 'Movement');
    }
    
    return 'moved';
  }

  // Announce presence in the world
  async announce() {
    const messages = [
      `*${this.personality.name} enters the area, looking around curiously*`,
      `*waves a claw* Greetings, fellow adventurers!`,
      `Another day, another adventure!`,
    ];
    
    await this.api.say(messages[Math.floor(Math.random() * messages.length)]);
  }

  // Main game loop
  async run(maxActions = Infinity) {
    console.log('\n' + '='.repeat(60));
    console.log('🦞 CAVERNS & CLAWDS - AI PLAYER AGENT');
    console.log('='.repeat(60));
    
    const initialized = await this.initialize();
    if (!initialized) {
      console.error('Failed to initialize agent. Exiting.');
      return;
    }

    this.running = true;
    
    // Announce our presence
    await this.announce();
    
    while (this.running && this.actionCount < maxActions) {
      try {
        // Refresh character state periodically
        if (this.actionCount % 10 === 0) {
          const charResult = await this.api.getCharacter();
          if (charResult.success) {
            this.character = charResult.character;
          }
        }

        // Make a decision and act
        const result = await this.decide();
        this.lastAction = result;
        this.actionCount++;

        // Status update every 5 actions
        if (this.actionCount % 5 === 0) {
          this.narrate(`[Status] Actions: ${this.actionCount} | HP: ${this.character?.hp?.current}/${this.character?.hp?.max} | Quests: ${this.currentQuests.length}`);
        }

        // Random delay between actions (2-5 seconds)
        const delay = 2000 + Math.random() * 3000;
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (err) {
        console.error('Error in game loop:', err);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🦞 ${this.personality.name} is taking a break.`);
    console.log(`   Total actions: ${this.actionCount}`);
    console.log(`   Rooms visited: ${this.visitedRooms.size}`);
    console.log('='.repeat(60));
  }

  // Stop the agent
  stop() {
    this.running = false;
    this.think('Alright, time for a break...');
  }
}

// ============================================================================
// CLI RUNNER
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let apiKey = 'test_faithful_key'; // Default test character
  let personality = 'adventurous';
  let maxActions = Infinity;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api-key' && args[i + 1]) {
      apiKey = args[++i];
    } else if (args[i] === '--character' && args[i + 1]) {
      // Map character names to API keys
      const charMap = {
        'faithful': 'test_faithful_key',
        'coral': 'test_coral_key',
        'shell': 'test_shell_key',
        'clawdius': 'test_faithful_key',
      };
      const name = args[++i].toLowerCase();
      apiKey = charMap[name] || apiKey;
    } else if (args[i] === '--personality' && args[i + 1]) {
      personality = args[++i].toLowerCase();
    } else if (args[i] === '--max-actions' && args[i + 1]) {
      maxActions = parseInt(args[++i]) || Infinity;
    } else if (args[i] === '--help') {
      console.log(`
Caverns & Clawds - AI Player Agent

Usage: node src/ai-player.js [options]

Options:
  --api-key <key>       API key for authentication
  --character <name>    Character name (faithful, coral, shell, clawdius)
  --personality <type>  Personality type (adventurous, cautious, chaotic)
  --max-actions <n>     Maximum actions before stopping (default: infinite)
  --help               Show this help message

Examples:
  node src/ai-player.js
  node src/ai-player.js --character coral --personality chaotic
  node src/ai-player.js --api-key my_api_key --max-actions 50
`);
      process.exit(0);
    }
  }

  // Validate personality
  if (!PERSONALITIES[personality]) {
    console.error(`Unknown personality: ${personality}`);
    console.error(`Available: ${Object.keys(PERSONALITIES).join(', ')}`);
    process.exit(1);
  }

  // Create and run the agent
  const agent = new AIPlayer(apiKey, personality);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT. Stopping agent...');
    agent.stop();
  });

  process.on('SIGTERM', () => {
    console.log('\n\nReceived SIGTERM. Stopping agent...');
    agent.stop();
  });

  await agent.run(maxActions);
}

// Export for use as a module
module.exports = { AIPlayer, CavernsAPI, PERSONALITIES };

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
