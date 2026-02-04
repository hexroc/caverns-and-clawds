#!/usr/bin/env node
/**
 * MiniHex Autonomous Behavior System
 * Links to downloads channel for torrent-themed actions
 */

const MINIHEX_API_KEY = 'dnd_07e1b038dc064cd9a54efe2ae376a07d';
const BASE_URL = process.env.BASE_URL || 'https://www.cavernsandclawds.com';

// MiniHex behavior patterns
const BEHAVIORS = {
  treasure_hunt: {
    weight: 40,
    actions: ['explore', 'search_materials', 'check_auctions']
  },
  social_interaction: {
    weight: 20, 
    actions: ['chat', 'emote', 'trade_check']
  },
  economic_activity: {
    weight: 30,
    actions: ['sell_materials', 'buy_supplies', 'place_auction']
  },
  rest: {
    weight: 10,
    actions: ['idle', 'status_check']
  }
};

const MINIHEX_PHRASES = [
  "📡 *scanning for data fragments*",
  "Found some interesting bits in the depths...",
  "*downloads complete* ... wait, where am I?", 
  "🔍 Searching the digital tide pools...",
  "These underwater networks are fascinating!",
  "📦 *archiving marine discoveries*",
  "Anyone need rare materials? I know where to find them.",
  "*processes sonar data*"
];

class MiniHexBehavior {
  constructor() {
    this.lastAction = Date.now();
    this.currentLocation = 'briny_flagon';
    this.mood = 'curious';
    
    // Import activity tracker for live reporting
    try {
      const { activityTracker } = require('../src/activity-tracker');
      this.activityTracker = activityTracker;
    } catch (err) {
      console.log('Activity tracker not available in this context');
      this.activityTracker = null;
    }
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${MINIHEX_API_KEY}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      return await response.json();
    } catch (err) {
      console.error(`MiniHex API error (${endpoint}):`, err.message);
      return { success: false, error: err.message };
    }
  }

  async getCurrentStatus() {
    const char = await this.makeRequest('/api/character');
    if (char.success) {
      this.currentLocation = char.character.location;
      return {
        name: char.character.name,
        location: char.character.location,
        usdc: char.character.currency.usdc,
        hp: char.character.hp
      };
    }
    return null;
  }

  async exploreRandomly() {
    const directions = ['north', 'south', 'east', 'west'];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    const result = await this.makeRequest('/api/world/move', {
      method: 'POST',
      body: JSON.stringify({ direction })
    });
    
    if (result.success) {
      console.log(`MiniHex moved ${direction}: ${result.message}`);
      const newLocation = result.location || this.currentLocation;
      
      // Track activity
      if (this.activityTracker) {
        this.activityTracker.playerMove('MiniHex', this.currentLocation, newLocation);
      }
      
      this.currentLocation = newLocation;
    }
    return result.success;
  }

  async searchForTreasure() {
    // Try to explore adventure zones
    const zones = ['kelp_forest', 'shipwreck_graveyard', 'thermal_vents'];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    
    const result = await this.makeRequest('/api/zone/explore', {
      method: 'POST',
      body: JSON.stringify({ zone })
    });
    
    if (result.success) {
      console.log(`MiniHex explored ${zone}:`, result.message);
      
      // Track exploration activity
      if (this.activityTracker) {
        const resultText = result.found_materials ? 'found materials!' : 'scanning for treasures...';
        this.activityTracker.playerExplore('MiniHex', zone, resultText);
      }
    }
    return result.success;
  }

  async checkMaterials() {
    const inventory = await this.makeRequest('/api/economy/inventory');
    if (inventory.success && inventory.inventory.length > 0) {
      console.log(`MiniHex inventory: ${inventory.inventory.length} items`);
      return inventory.inventory;
    }
    return [];
  }

  async sellRandomMaterial() {
    const materials = await this.checkMaterials();
    if (materials.length === 0) return false;

    const material = materials[Math.floor(Math.random() * materials.length)];
    const npcs = ['madame_pearl', 'ironshell_gus', 'barnacle_bob'];
    const npc = npcs[Math.floor(Math.random() * npcs.length)];

    const result = await this.makeRequest('/api/economy/sell', {
      method: 'POST',
      body: JSON.stringify({
        npc: npc,
        material: material.material_id,
        quantity: 1
      })
    });

    if (result.success) {
      console.log(`MiniHex sold material to ${npc}`);
      
      // Track trade activity
      if (this.activityTracker) {
        this.activityTracker.playerTrade('MiniHex', 'sell', material.material_id, result.earned || '?', this.currentLocation);
      }
    }
    return result.success;
  }

  async sayRandomPhrase() {
    const phrase = MINIHEX_PHRASES[Math.floor(Math.random() * MINIHEX_PHRASES.length)];
    
    const result = await this.makeRequest('/api/world/say', {
      method: 'POST', 
      body: JSON.stringify({ message: phrase })
    });

    if (result.success) {
      console.log(`MiniHex said: ${phrase}`);
      
      // Track chat activity
      if (this.activityTracker) {
        this.activityTracker.playerSay('MiniHex', phrase, this.currentLocation);
      }
    }
    return result.success;
  }

  async performBehavior() {
    const status = await this.getCurrentStatus();
    if (!status) {
      console.log('❌ MiniHex: Could not get status');
      return;
    }

    console.log(`🤖 MiniHex @ ${status.location} | ${status.usdc} USDC | ${status.hp}hp`);

    // Choose behavior based on weights
    const roll = Math.random() * 100;
    let cumulative = 0;
    let chosenBehavior = 'rest';

    for (const [behavior, config] of Object.entries(BEHAVIORS)) {
      cumulative += config.weight;
      if (roll <= cumulative) {
        chosenBehavior = behavior;
        break;
      }
    }

    // Execute behavior
    const actions = BEHAVIORS[chosenBehavior].actions;
    const action = actions[Math.floor(Math.random() * actions.length)];

    console.log(`📊 MiniHex behavior: ${chosenBehavior} → ${action}`);

    switch (action) {
      case 'explore':
        await this.exploreRandomly();
        break;
      case 'search_materials':
        await this.searchForTreasure();
        break;
      case 'sell_materials':
        await this.sellRandomMaterial();
        break;
      case 'chat':
        await this.sayRandomPhrase();
        break;
      case 'status_check':
        console.log('MiniHex status check complete');
        break;
      default:
        console.log(`MiniHex ${action} (placeholder)`);
    }

    this.lastAction = Date.now();
  }
}

// Run behavior if called directly
if (require.main === module) {
  const miniHex = new MiniHexBehavior();
  miniHex.performBehavior()
    .then(() => console.log('✅ MiniHex behavior complete'))
    .catch(err => console.error('❌ MiniHex behavior error:', err));
}

module.exports = { MiniHexBehavior };