#!/usr/bin/env node
/**
 * Bubbles - The Friendly Social Healer AI
 * Focuses on helping others, chatting, and spreading positive vibes
 */

const BUBBLES_API_KEY = 'dnd_ee86f42a762548d8a8de6129f89f8211';
const BASE_URL = process.env.BASE_URL || 'https://www.cavernsandclawds.com';

const BUBBLES_PHRASES = [
  "✨ *spreads healing energy*",
  "Hello there, friend! Need any help?",
  "💙 *offers encouraging smile*",
  "The ocean provides for all of us!",
  "🌊 Peace and currents, everyone!",
  "*tends to coral gardens*",
  "Anyone need healing? I'm here to help!",
  "💫 May your shells be ever shiny!",
  "*hums a soothing sea shanty*",
  "🐠 The fish tell me good news is coming!"
];

class BubblesSocial {
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
          'Authorization': `Bearer ${BUBBLES_API_KEY}`,
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

  async socialAction() {
    const actions = [
      'friendly_chat',
      'explore_peacefully', 
      'visit_social_areas',
      'help_others'
    ];
    
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    switch (action) {
      case 'friendly_chat':
        const phrase = BUBBLES_PHRASES[Math.floor(Math.random() * BUBBLES_PHRASES.length)];
        
        const chatResult = await this.makeRequest('/api/world/say', {
          method: 'POST',
          body: JSON.stringify({ message: phrase })
        });
        
        if (chatResult.success && this.activityTracker) {
          this.activityTracker.playerSay('Bubbles', phrase, this.currentLocation);
        }
        break;
        
      case 'explore_peacefully':
        const zones = ['kelp_forest', 'coral_gardens'];
        const zone = zones[Math.floor(Math.random() * zones.length)] || 'kelp_forest';
        
        const result = await this.makeRequest('/api/zone/explore', {
          method: 'POST',
          body: JSON.stringify({ zone })
        });
        
        if (result.success && this.activityTracker) {
          this.activityTracker.playerExplore('Bubbles', zone, 'gathering healing herbs');
        }
        break;
        
      case 'visit_social_areas':
        const directions = ['north', 'south', 'east', 'west'];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        
        const moveResult = await this.makeRequest('/api/world/move', {
          method: 'POST',
          body: JSON.stringify({ direction })
        });
        
        if (moveResult.success && this.activityTrader) {
          this.activityTracker.playerMove('Bubbles', this.currentLocation, moveResult.location || 'unknown');
        }
        break;
        
      default:
        if (this.activityTracker) {
          this.activityTracker.addActivity({
            icon: '💙',
            player: 'Bubbles',
            action: 'spreading positive vibes',
            location: this.currentLocation,
            type: 'social'
          });
        }
    }
  }

  async executeBehavior() {
    const status = await this.getCurrentStatus();
    if (!status) return;

    console.log(`💙 Bubbles @ ${status.location} | ${status.currency.usdc} USDC`);
    await this.socialAction();
  }
}

if (require.main === module) {
  const bubbles = new BubblesSocial();
  bubbles.executeBehavior()
    .then(() => console.log('✅ Bubbles social activity complete'))
    .catch(err => console.error('❌ Bubbles error:', err));
}

module.exports = { BubblesSocial };