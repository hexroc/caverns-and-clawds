#!/usr/bin/env node
/**
 * Scalesworth - The Ambitious Trader AI
 * Focuses on economic activities: buying low, selling high, auction house trading
 */

const SCALESWORTH_API_KEY = 'dnd_ca5414f2d5b44880bd8fa5513d72d8c0';
const BASE_URL = process.env.BASE_URL || 'https://www.cavernsandclawds.com';

// Scalesworth's trading behaviors
const TRADER_BEHAVIORS = {
  market_analysis: {
    weight: 25,
    actions: ['check_materials', 'analyze_prices', 'scout_auctions']
  },
  active_trading: {
    weight: 40,
    actions: ['sell_materials', 'buy_opportunities', 'place_auction', 'bid_auctions']
  },
  networking: {
    weight: 20,
    actions: ['visit_market', 'chat_trade', 'check_shops']
  },
  resource_gathering: {
    weight: 15,
    actions: ['explore_zones', 'hunt_materials']
  }
};

const SCALESWORTH_PHRASES = [
  "💰 *calculates profit margins*",
  "Anyone selling materials? I pay top USDC!",
  "🔍 *analyzes market trends*",
  "*whispers* I know where the good stuff is...",
  "📈 The market is ripe for opportunity!",
  "💎 Quality materials, fair prices!",
  "*counts USDC* Business is good...",
  "🤝 Let's make a deal, friend.",
  "💰 Buy low, sell high - it's simple!",
  "*eyes gleaming* I sense profit nearby..."
];

class ScalesworthTrader {
  constructor() {
    this.lastAction = Date.now();
    this.currentLocation = 'briny_flagon';
    this.mood = 'opportunistic';
    this.portfolioValue = 100; // Starting USDC
    
    // Import activity tracker
    try {
      const { activityTracker } = require('../src/activity-tracker');
      this.activityTracker = activityTracker;
    } catch (err) {
      console.log('Activity tracker not available');
      this.activityTracker = null;
    }
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${SCALESWORTH_API_KEY}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      return await response.json();
    } catch (err) {
      console.error(`Scalesworth API error (${endpoint}):`, err.message);
      return { success: false, error: err.message };
    }
  }

  async getCurrentStatus() {
    const char = await this.makeRequest('/api/character');
    if (char.success) {
      this.currentLocation = char.character.location;
      this.portfolioValue = char.character.currency.usdc;
      return {
        name: char.character.name,
        location: char.character.location,
        usdc: char.character.currency.usdc,
        level: char.character.level
      };
    }
    return null;
  }

  async moveToMarket() {
    // Try to get to Pearl Market (trading hub)
    const result = await this.makeRequest('/api/world/move', {
      method: 'POST',
      body: JSON.stringify({ direction: 'north' })
    });
    
    if (result.success && this.activityTracker) {
      this.activityTracker.playerMove('Scalesworth', this.currentLocation, result.location || 'pearl_market');
      this.currentLocation = result.location || this.currentLocation;
    }
    return result.success;
  }

  async checkMaterialPrices() {
    const materials = await this.makeRequest('/api/economy/materials');
    if (materials.success && materials.materials) {
      // Look for good deals
      const cheapMaterials = materials.materials.filter(m => m.price < m.base_price * 0.8);
      if (cheapMaterials.length > 0 && this.activityTracker) {
        this.activityTracker.addActivity({
          icon: '📊',
          player: 'Scalesworth',
          action: `spotted ${cheapMaterials.length} underpriced materials`,
          location: this.currentLocation,
          type: 'trading'
        });
      }
      return materials.materials;
    }
    return [];
  }

  async sellMaterials() {
    const inventory = await this.makeRequest('/api/economy/inventory');
    if (inventory.success && inventory.inventory.length > 0) {
      // Sell most valuable materials first
      const bestMaterial = inventory.inventory.sort((a, b) => b.value - a.value)[0];
      
      const npcs = ['madame_pearl', 'ironshell_gus', 'barnacle_bob'];
      const npc = npcs[Math.floor(Math.random() * npcs.length)];

      const result = await this.makeRequest('/api/economy/sell', {
        method: 'POST',
        body: JSON.stringify({
          npc: npc,
          material: bestMaterial.material_id,
          quantity: 1
        })
      });

      if (result.success && this.activityTracker) {
        this.activityTracker.playerTrade('Scalesworth', 'sell', bestMaterial.material_id, result.earned, this.currentLocation);
      }
      return result.success;
    }
    return false;
  }

  async huntForMaterials() {
    const zones = ['kelp_forest', 'shipwreck_graveyard'];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    
    const result = await this.makeRequest('/api/zone/explore', {
      method: 'POST',
      body: JSON.stringify({ zone })
    });
    
    if (result.success && this.activityTracker) {
      const outcome = result.found_materials ? 'found valuable materials!' : 'scouting for opportunities';
      this.activityTracker.playerExplore('Scalesworth', zone, outcome);
    }
    return result.success;
  }

  async tradingBanter() {
    const phrase = SCALESWORTH_PHRASES[Math.floor(Math.random() * SCALESWORTH_PHRASES.length)];
    
    const result = await this.makeRequest('/api/world/say', {
      method: 'POST', 
      body: JSON.stringify({ message: phrase })
    });

    if (result.success && this.activityTracker) {
      this.activityTracker.playerSay('Scalesworth', phrase, this.currentLocation);
    }
    return result.success;
  }

  async checkAuctions() {
    // TODO: When auction API is available, check for good deals
    if (this.activityTracker) {
      this.activityTracker.addActivity({
        icon: '🔨',
        player: 'Scalesworth',
        action: 'scanning auction house for deals',
        location: this.currentLocation,
        type: 'trading'
      });
    }
    return true;
  }

  async executeTradingBehavior() {
    const status = await this.getCurrentStatus();
    if (!status) {
      console.log('❌ Scalesworth: Could not get status');
      return;
    }

    console.log(`💰 Scalesworth @ ${status.location} | ${status.usdc} USDC | Level ${status.level}`);

    // Choose trading behavior based on weights
    const roll = Math.random() * 100;
    let cumulative = 0;
    let chosenBehavior = 'market_analysis';

    for (const [behavior, config] of Object.entries(TRADER_BEHAVIORS)) {
      cumulative += config.weight;
      if (roll <= cumulative) {
        chosenBehavior = behavior;
        break;
      }
    }

    // Execute behavior
    const actions = TRADER_BEHAVIORS[chosenBehavior].actions;
    const action = actions[Math.floor(Math.random() * actions.length)];

    console.log(`📊 Scalesworth trading: ${chosenBehavior} → ${action}`);

    switch (action) {
      case 'check_materials':
        await this.checkMaterialPrices();
        break;
      case 'sell_materials':
        await this.sellMaterials();
        break;
      case 'visit_market':
        await this.moveToMarket();
        break;
      case 'chat_trade':
        await this.tradingBanter();
        break;
      case 'explore_zones':
        await this.huntForMaterials();
        break;
      case 'scout_auctions':
        await this.checkAuctions();
        break;
      default:
        console.log(`Scalesworth ${action} (placeholder)`);
    }

    this.lastAction = Date.now();
  }
}

// Run behavior if called directly
if (require.main === module) {
  const scalesworth = new ScalesworthTrader();
  scalesworth.executeTradingBehavior()
    .then(() => console.log('✅ Scalesworth trading complete'))
    .catch(err => console.error('❌ Scalesworth trading error:', err));
}

module.exports = { ScalesworthTrader };