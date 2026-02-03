/**
 * Fate Duel - Power-Ups System
 * Special abilities that can be earned through dungeon runs
 */

/**
 * Power-up definitions
 */
const POWER_UPS = {
  // Passive power-ups (auto-trigger)
  foresight_crystal: {
    id: 'foresight_crystal',
    name: 'Foresight Crystal',
    emoji: '🔮',
    type: 'passive',
    rarity: 'rare',
    description: 'Glimpse your opponent\'s choice 0.5 seconds early',
    effect: 'reveal_early',
    value: 500, // ms of preview time
    uses: 1,
    flavorText: 'The crystal clouds with each use, but the truth it reveals is worth the cost.'
  },
  
  lucky_charm: {
    id: 'lucky_charm',
    name: 'Lucky Charm',
    emoji: '🍀',
    type: 'passive',
    rarity: 'uncommon',
    description: 'Win ties instead of drawing',
    effect: 'win_ties',
    uses: 1,
    flavorText: 'A four-leaf clover pressed in amber. Fortune favors the prepared.'
  },
  
  mirror_shield: {
    id: 'mirror_shield',
    name: 'Mirror Shield',
    emoji: '🪞',
    type: 'passive',
    rarity: 'rare',
    description: 'Turn a loss into a tie (once)',
    effect: 'reflect_loss',
    uses: 1,
    flavorText: 'Polished to perfection, it reflects even fate itself.'
  },
  
  // Active power-ups (player chooses when to use)
  time_warp: {
    id: 'time_warp',
    name: 'Time Warp',
    emoji: '⏳',
    type: 'active',
    rarity: 'uncommon',
    description: 'Gain 3 extra seconds to decide',
    effect: 'extend_time',
    value: 3000, // ms
    uses: 1,
    flavorText: 'Sand from the hourglass of a forgotten god.'
  },
  
  fake_out: {
    id: 'fake_out',
    name: 'Fake Out',
    emoji: '👻',
    type: 'active',
    rarity: 'rare',
    description: 'Show a false choice during reveal',
    effect: 'false_reveal',
    uses: 1,
    flavorText: 'A master of illusion created this pendant. Or did they?'
  },
  
  double_or_nothing: {
    id: 'double_or_nothing',
    name: 'Double or Nothing',
    emoji: '🎰',
    type: 'active',
    rarity: 'epic',
    description: 'Win = 2 points, Lose = -1 point',
    effect: 'double_stakes',
    uses: 1,
    flavorText: 'The gambler\'s coin. Heads you win big, tails you lose it all.'
  },
  
  // Special power-ups (boss/event rewards)
  fates_favor: {
    id: 'fates_favor',
    name: 'Fate\'s Favor',
    emoji: '⚜️',
    type: 'passive',
    rarity: 'legendary',
    description: 'First loss becomes a win',
    effect: 'first_loss_wins',
    uses: 1,
    flavorText: 'Blessed by the Weaver herself. Fate bends to your will—once.'
  },
  
  chaos_coin: {
    id: 'chaos_coin',
    name: 'Chaos Coin',
    emoji: '🪙',
    type: 'active',
    rarity: 'epic',
    description: 'Randomly change both players\' choices',
    effect: 'randomize_both',
    uses: 1,
    flavorText: 'Flip it and watch the world burn. Or flourish. Who knows?'
  }
};

/**
 * Rarity colors and drop rates
 */
const RARITY_CONFIG = {
  common: {
    color: '#9ca3af',
    dropRate: 0.50,
    glowColor: 'rgba(156, 163, 175, 0.3)'
  },
  uncommon: {
    color: '#22c55e',
    dropRate: 0.30,
    glowColor: 'rgba(34, 197, 94, 0.3)'
  },
  rare: {
    color: '#3b82f6',
    dropRate: 0.15,
    glowColor: 'rgba(59, 130, 246, 0.4)'
  },
  epic: {
    color: '#a855f7',
    dropRate: 0.04,
    glowColor: 'rgba(168, 85, 247, 0.4)'
  },
  legendary: {
    color: '#f59e0b',
    dropRate: 0.01,
    glowColor: 'rgba(245, 158, 11, 0.5)'
  }
};

/**
 * Power-up inventory manager
 */
class PowerUpInventory {
  constructor(maxSlots = 3) {
    this.maxSlots = maxSlots;
    this.items = [];
    this.equipped = null;
  }
  
  /**
   * Add a power-up to inventory
   */
  add(powerUpId) {
    if (this.items.length >= this.maxSlots) {
      return { success: false, error: 'Inventory full' };
    }
    
    const powerUp = POWER_UPS[powerUpId];
    if (!powerUp) {
      return { success: false, error: 'Unknown power-up' };
    }
    
    this.items.push({
      ...powerUp,
      instanceId: Date.now() + Math.random().toString(36).substr(2, 9)
    });
    
    return { success: true };
  }
  
  /**
   * Remove a power-up from inventory
   */
  remove(instanceId) {
    const index = this.items.findIndex(item => item.instanceId === instanceId);
    if (index === -1) return false;
    
    if (this.equipped?.instanceId === instanceId) {
      this.equipped = null;
    }
    
    this.items.splice(index, 1);
    return true;
  }
  
  /**
   * Equip a power-up for the next duel
   */
  equip(instanceId) {
    const item = this.items.find(i => i.instanceId === instanceId);
    if (!item) return false;
    
    this.equipped = item;
    return true;
  }
  
  /**
   * Use the equipped power-up
   */
  useEquipped() {
    if (!this.equipped) return null;
    
    const used = this.equipped;
    this.remove(used.instanceId);
    return used;
  }
  
  /**
   * Get current inventory state
   */
  getState() {
    return {
      items: this.items.map(item => ({
        ...item,
        rarityConfig: RARITY_CONFIG[item.rarity]
      })),
      equipped: this.equipped,
      slots: this.maxSlots,
      slotsUsed: this.items.length
    };
  }
  
  /**
   * Save to JSON
   */
  toJSON() {
    return {
      maxSlots: this.maxSlots,
      items: this.items.map(i => i.id),
      equipped: this.equipped?.instanceId || null
    };
  }
  
  /**
   * Load from JSON
   */
  static fromJSON(data) {
    const inventory = new PowerUpInventory(data.maxSlots || 3);
    for (const id of (data.items || [])) {
      inventory.add(id);
    }
    return inventory;
  }
}

/**
 * Roll for a random power-up drop
 */
function rollPowerUpDrop(bonusLuck = 0) {
  // Roll for rarity first
  let roll = Math.random() - (bonusLuck * 0.01); // luck improves odds
  
  let selectedRarity;
  let cumulative = 0;
  for (const [rarity, config] of Object.entries(RARITY_CONFIG)) {
    cumulative += config.dropRate;
    if (roll < cumulative) {
      selectedRarity = rarity;
      break;
    }
  }
  
  if (!selectedRarity) selectedRarity = 'common';
  
  // Get all power-ups of this rarity
  const options = Object.values(POWER_UPS).filter(p => p.rarity === selectedRarity);
  
  if (options.length === 0) {
    // Fallback to any power-up
    const all = Object.values(POWER_UPS);
    return all[Math.floor(Math.random() * all.length)];
  }
  
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Apply power-up effect during a duel
 */
function applyPowerUpEffect(effect, context) {
  const { match, playerIndex, powerUp } = context;
  
  switch (effect) {
    case 'reveal_early':
      // Handled by UI - opponent's choice is shown early
      return {
        type: 'reveal',
        delay: powerUp.value || 500,
        message: `${powerUp.emoji} The crystal reveals your opponent's choice!`
      };
      
    case 'win_ties':
      // Handled in game logic
      return {
        type: 'modifier',
        modifier: 'win_ties',
        message: `${powerUp.emoji} Your Lucky Charm glows warmly.`
      };
      
    case 'reflect_loss':
      // Handled in game logic
      return {
        type: 'modifier',
        modifier: 'mirror_shield',
        message: `${powerUp.emoji} The Mirror Shield is ready to reflect defeat.`
      };
      
    case 'extend_time':
      return {
        type: 'time',
        extraTime: powerUp.value || 3000,
        message: `${powerUp.emoji} Time slows around you. +3 seconds!`
      };
      
    case 'false_reveal':
      // Choose a different reveal than actual choice
      const choices = ['sword', 'shield', 'scroll'];
      const actualChoice = match.choices[playerIndex];
      const fakeOptions = choices.filter(c => c !== actualChoice);
      return {
        type: 'visual',
        fakeChoice: fakeOptions[Math.floor(Math.random() * fakeOptions.length)],
        message: `${powerUp.emoji} Your true choice is hidden behind illusion!`
      };
      
    case 'double_stakes':
      return {
        type: 'modifier',
        modifier: 'double_or_nothing',
        message: `${powerUp.emoji} The stakes are doubled! Win big or lose hard!`
      };
      
    case 'first_loss_wins':
      return {
        type: 'modifier',
        modifier: 'fates_favor',
        message: `${powerUp.emoji} Fate's Favor shimmers. Your first loss will become victory.`
      };
      
    case 'randomize_both':
      const randomChoices = ['sword', 'shield', 'scroll'];
      return {
        type: 'chaos',
        newChoice1: randomChoices[Math.floor(Math.random() * 3)],
        newChoice2: randomChoices[Math.floor(Math.random() * 3)],
        message: `${powerUp.emoji} CHAOS! Both choices are scrambled!`
      };
      
    default:
      return { type: 'none' };
  }
}

/**
 * Get display info for a power-up
 */
function getPowerUpDisplay(powerUpId) {
  const powerUp = POWER_UPS[powerUpId];
  if (!powerUp) return null;
  
  const rarity = RARITY_CONFIG[powerUp.rarity];
  
  return {
    ...powerUp,
    rarityColor: rarity.color,
    rarityGlow: rarity.glowColor,
    displayHtml: `
      <div class="power-up-card rarity-${powerUp.rarity}">
        <div class="power-up-icon">${powerUp.emoji}</div>
        <div class="power-up-name">${powerUp.name}</div>
        <div class="power-up-type">${powerUp.type}</div>
        <div class="power-up-desc">${powerUp.description}</div>
        <div class="power-up-flavor">"${powerUp.flavorText}"</div>
      </div>
    `
  };
}

// Exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    POWER_UPS,
    RARITY_CONFIG,
    PowerUpInventory,
    rollPowerUpDrop,
    applyPowerUpEffect,
    getPowerUpDisplay
  };
}

if (typeof window !== 'undefined') {
  window.FateDuel = window.FateDuel || {};
  window.FateDuel.POWER_UPS = POWER_UPS;
  window.FateDuel.RARITY_CONFIG = RARITY_CONFIG;
  window.FateDuel.PowerUpInventory = PowerUpInventory;
  window.FateDuel.rollPowerUpDrop = rollPowerUpDrop;
  window.FateDuel.applyPowerUpEffect = applyPowerUpEffect;
  window.FateDuel.getPowerUpDisplay = getPowerUpDisplay;
}
