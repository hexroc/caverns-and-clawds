#!/usr/bin/env node
/**
 * Crusher - The Battle-Hungry Fighter AI
 * Focuses on combat, exploration, and strength-based activities
 */

const CRUSHER_API_KEY = 'dnd_407ab1b2951a4be49e6c92727807a13b';
const BASE_URL = process.env.BASE_URL || 'https://www.cavernsandclawds.com';

const CRUSHER_PHRASES = [
  "💪 *flexes claws menacingly*",
  "Looking for a good fight!",
  "⚔️ *sharpens weapons*",
  "These depths hold worthy opponents...",
  "*cracks knuckles* Time for action!",
  "🛡️ Nothing I can't handle!",
  "Bring on the monsters!",
  "*battle-ready stance*"
];

class CrusherFighter {
  constructor() {
    this.currentLocation = 'briny_flagon';
    try {
      const { activityTracker } = require('../src/activity-tracker');
      this.activityTracker = activityTracker;
    } catch (err) {
      this.activityTracker = null;
    }
  }

  async makeRequest(endpoint, options = {}) {
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
      return { success: false, error: err.message };
    }
  }

  async getCurrentStatus() {
    const char = await this.makeRequest('/api/character');
    if (char.success) {
      this.currentLocation = char.character.location;
      return char.character;
    }
    return null;
  }

  async fightingAction() {
    const actions = [
      'explore_zone',
      'battle_stance', 
      'move_around',
      'warrior_chat'
    ];
    
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    switch (action) {
      case 'explore_zone':
        const zones = ['kelp_forest', 'shipwreck_graveyard', 'thermal_vents'];
        const zone = zones[Math.floor(Math.random() * zones.length)];
        
        const result = await this.makeRequest('/api/zone/explore', {
          method: 'POST',
          body: JSON.stringify({ zone })
        });
        
        if (result.success && this.activityTracker) {
          this.activityTracker.playerExplore('Crusher', zone, 'hunting for worthy opponents');
        }
        break;
        
      case 'move_around':
        const directions = ['north', 'south', 'east', 'west'];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        
        const moveResult = await this.makeRequest('/api/world/move', {
          method: 'POST',
          body: JSON.stringify({ direction })
        });
        
        if (moveResult.success && this.activityTracker) {
          this.activityTracker.playerMove('Crusher', this.currentLocation, moveResult.location || 'unknown');
        }
        break;
        
      case 'warrior_chat':
        const phrase = CRUSHER_PHRASES[Math.floor(Math.random() * CRUSHER_PHRASES.length)];
        
        const chatResult = await this.makeRequest('/api/world/say', {
          method: 'POST',
          body: JSON.stringify({ message: phrase })
        });
        
        if (chatResult.success && this.activityTracker) {
          this.activityTracker.playerSay('Crusher', phrase, this.currentLocation);
        }
        break;
        
      default:
        if (this.activityTracker) {
          this.activityTracker.addActivity({
            icon: '⚔️',
            player: 'Crusher',
            action: 'preparing for battle',
            location: this.currentLocation,
            type: 'combat'
          });
        }
    }
  }

  async executeBehavior() {
    const status = await this.getCurrentStatus();
    if (!status) return;

    console.log(`⚔️ Crusher @ ${status.location} | ${status.currency.usdc} USDC`);
    await this.fightingAction();
  }
}

if (require.main === module) {
  const crusher = new CrusherFighter();
  crusher.executeBehavior()
    .then(() => console.log('✅ Crusher action complete'))
    .catch(err => console.error('❌ Crusher error:', err));
}

module.exports = { CrusherFighter };