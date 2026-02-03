/**
 * Caverns & Clawds - Tactical Combat System
 * 
 * Turn-based hex grid combat for capstone dungeon.
 * Features:
 * - Strict initiative order
 * - 10 second turn timer
 * - Movement with opportunity attacks
 * - Fog of war (shared party vision)
 * - Spectator-friendly event stream
 */

const { HexGrid, hex, hexDistance, hexNeighbors, hexEqual, hexRange } = require('./hex-grid');
const { getWeapon, checkWeaponRange, getMaxRange, getNormalRange, hasProperty, getAttackType } = require('./weapons');
const { getSpell, isInSpellRange, getAffectedHexes, getSpellDamage, AREA_SHAPES } = require('./spells');

// ============================================================================
// CONSTANTS
// ============================================================================

const TURN_TIMER_MS = 10000; // 10 seconds per turn
const DEFAULT_VISION_RANGE = 8;
const DEFAULT_SPEED = 6; // hexes per turn (30ft / 5ft per hex)

// AI behavior types
const AI_BEHAVIOR = {
  AGGRESSIVE: 'aggressive',   // Close and attack
  RANGED: 'ranged',          // Keep distance, attack from range
  SUPPORT: 'support',        // Heal/buff allies, stay back
  AMBUSHER: 'ambusher',      // Hide, attack with advantage
  DEFENDER: 'defender',      // Protect allies, control area
  BERSERKER: 'berserker'     // Rush nearest enemy, ignore tactics
};

// Event delays for spectator pacing (ms)
const EVENT_DELAYS = {
  turn_start: 1000,
  movement: 300, // per hex
  attack_roll: 1500,
  hit_miss: 1000,
  damage: 1000,
  critical: 2000,
  death: 2500,
  spell_cast: 2000,
  ability_use: 1500,
  phase_change: 3500,
  victory: 5000,
  defeat: 3000,
};

// ============================================================================
// COMBAT STATE
// ============================================================================

class TacticalCombat {
  constructor(grid, options = {}) {
    this.grid = grid;
    this.id = options.id || this._generateId();
    
    // Combatants
    this.combatants = new Map(); // id -> combatant data
    this.teams = new Map(); // team name -> Set of combatant ids
    
    // Turn management
    this.initiativeOrder = [];
    this.currentTurnIndex = 0;
    this.round = 1;
    this.turnStartTime = null;
    this.turnTimer = null;
    
    // State
    this.status = 'setup'; // setup, active, paused, victory, defeat
    this.eventLog = [];
    this.eventListeners = [];
    
    // Party death tracking (for capstone)
    this.partyDeaths = 0;
    this.maxPartyDeaths = options.maxDeaths || 3;
    
    // Vision
    this.partyVision = new Set();
    
    // Boss phase system
    this.bossId = null;
    this.currentPhase = 1;
    this.phaseConfig = null; // Set by setBossPhases()
    this.phaseTriggered = new Set(); // Track which phases have been triggered
    
    // Auto-battle mode for spectator/demo (both sides use AI)
    this.autoBattle = options.autoBattle || false;
  }
  
  _generateId() {
    return 'combat_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
  
  // ============================================================================
  // COMBATANT MANAGEMENT
  // ============================================================================
  
  /**
   * Add a combatant to the battle
   */
  addCombatant(data) {
    const combatant = {
      id: data.id,
      name: data.name,
      char: data.char || '●',
      type: data.type, // player, henchman, monster, boss
      team: data.team, // party, enemy
      
      // Stats
      hp: data.hp,
      maxHp: data.maxHp || data.hp,
      ac: data.ac || 10,
      speed: data.speed || DEFAULT_SPEED,
      
      // Combat stats
      attackBonus: data.attackBonus || 0,
      damage: data.damage || '1d6',
      damageBonus: data.damageBonus || 0,
      damageType: data.damageType || 'slashing',
      
      // Weapon data (D&D 5e accurate ranges)
      weapon: data.weapon || null, // Weapon ID from weapons.js
      weaponData: data.weapon ? getWeapon(data.weapon) : null,
      attackRange: data.attackRange || 1, // Legacy fallback
      preferRanged: data.preferRanged || false, // For AI: prefer ranged attacks
      
      // Spellcasting
      spellcaster: data.spellcaster || false,
      spells: data.spells || [], // Array of spell IDs
      spellSlots: data.spellSlots || {}, // { 1: 4, 2: 3, 3: 2 }
      spellcastingMod: data.spellcastingMod || 0, // Modifier for spell attacks/DCs
      cantrips: data.cantrips || [], // Cantrips known
      
      // Initiative
      dexMod: data.dexMod || 0,
      strMod: data.strMod || 0,
      initiative: 0,
      
      // State
      position: data.position ? hex(data.position.q, data.position.r) : null,
      movementRemaining: data.speed || DEFAULT_SPEED,
      hasAction: true,
      hasBonusAction: true,
      hasReaction: true,
      
      // Conditions
      conditions: new Set(),
      
      // Vision
      visionRange: data.visionRange || DEFAULT_VISION_RANGE,
      
      // Extra data
      abilities: data.abilities || [],
      isAlive: true,
      
      // AI behavior (for smarter tactical decisions)
      aiBehavior: data.aiBehavior || AI_BEHAVIOR.AGGRESSIVE,
      preferredRange: data.preferredRange || null, // Ideal distance from target
    };
    
    // Auto-detect preferred range from weapon
    if (combatant.weaponData) {
      const maxRange = getMaxRange(combatant.weaponData);
      if (maxRange > 2) {
        combatant.preferRanged = true;
        combatant.preferredRange = Math.floor(maxRange * 0.6); // Stay at ~60% of max range
        combatant.aiBehavior = AI_BEHAVIOR.RANGED;
      }
    }
    
    this.combatants.set(combatant.id, combatant);
    
    // Add to team
    if (!this.teams.has(combatant.team)) {
      this.teams.set(combatant.team, new Set());
    }
    this.teams.get(combatant.team).add(combatant.id);
    
    // Add to grid if position provided
    if (combatant.position) {
      this.grid.addEntity(combatant.position, {
        id: combatant.id,
        name: combatant.name,
        char: combatant.char,
        type: combatant.type,
        team: combatant.team,
        blocksMovement: true,
      });
    }
    
    return combatant;
  }
  
  /**
   * Get combatant by ID
   */
  getCombatant(id) {
    return this.combatants.get(id);
  }
  
  /**
   * Get all combatants on a team
   */
  getTeam(teamName) {
    const ids = this.teams.get(teamName) || new Set();
    return Array.from(ids).map(id => this.combatants.get(id)).filter(c => c?.isAlive);
  }
  
  /**
   * Get current turn's combatant
   */
  getCurrentCombatant() {
    if (this.initiativeOrder.length === 0) return null;
    const id = this.initiativeOrder[this.currentTurnIndex];
    return this.combatants.get(id);
  }
  
  // ============================================================================
  // INITIATIVE
  // ============================================================================
  
  /**
   * Roll initiative for all combatants and start combat
   */
  rollInitiative() {
    const initiatives = [];
    
    for (const [id, combatant] of this.combatants) {
      if (!combatant.isAlive) continue;
      
      // d20 + DEX modifier
      const roll = Math.floor(Math.random() * 20) + 1;
      combatant.initiative = roll + combatant.dexMod;
      
      initiatives.push({
        id,
        name: combatant.name,
        roll,
        modifier: combatant.dexMod,
        total: combatant.initiative,
      });
    }
    
    // Sort by initiative (descending), with DEX as tiebreaker
    initiatives.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return b.modifier - a.modifier;
    });
    
    this.initiativeOrder = initiatives.map(i => i.id);
    
    this._emitEvent('initiative_rolled', {
      order: initiatives,
    });
    
    return initiatives;
  }
  
  /**
   * Start combat
   */
  startCombat() {
    if (this.status !== 'setup') {
      return { success: false, error: 'Combat already started' };
    }
    
    if (this.initiativeOrder.length === 0) {
      this.rollInitiative();
    }
    
    this.status = 'active';
    this.round = 1;
    this.currentTurnIndex = 0;
    
    this._updatePartyVision();
    this._startTurn();
    
    this._emitEvent('combat_started', {
      round: this.round,
      firstCombatant: this.getCurrentCombatant()?.name,
    });
    
    return { success: true };
  }
  
  // ============================================================================
  // TURN MANAGEMENT
  // ============================================================================
  
  /**
   * Start a new turn
   */
  _startTurn() {
    const combatant = this.getCurrentCombatant();
    if (!combatant) return;
    
    // Reset turn resources
    combatant.movementRemaining = combatant.speed;
    combatant.hasAction = true;
    combatant.hasBonusAction = true;
    
    this.turnStartTime = Date.now();
    
    // Start turn timer
    if (this.turnTimer) clearTimeout(this.turnTimer);
    this.turnTimer = setTimeout(() => {
      this._handleTurnTimeout();
    }, TURN_TIMER_MS);
    
    this._emitEvent('turn_start', {
      combatant: this._sanitizeCombatant(combatant),
      round: this.round,
      turnIndex: this.currentTurnIndex,
      timeLimit: TURN_TIMER_MS,
    }, EVENT_DELAYS.turn_start);
    
    // Auto-run AI for enemies, or for all combatants in auto-battle mode
    if (combatant.team === 'enemy' || this.autoBattle) {
      setTimeout(() => this._runAI(combatant), 500);
    }
  }
  
  /**
   * End current turn and advance to next
   */
  endTurn() {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    
    const combatant = this.getCurrentCombatant();
    
    this._emitEvent('turn_end', {
      combatant: combatant?.name,
      round: this.round,
    });
    
    // Check for end of round
    this.currentTurnIndex++;
    if (this.currentTurnIndex >= this.initiativeOrder.length) {
      this.currentTurnIndex = 0;
      this.round++;
      
      // Reset reactions at start of round
      for (const [, c] of this.combatants) {
        c.hasReaction = true;
      }
      
      this._emitEvent('round_end', { round: this.round - 1 });
      this._emitEvent('round_start', { round: this.round });
    }
    
    // Skip dead combatants
    while (this.currentTurnIndex < this.initiativeOrder.length) {
      const next = this.getCombatant(this.initiativeOrder[this.currentTurnIndex]);
      if (next && next.isAlive) break;
      this.currentTurnIndex++;
      
      if (this.currentTurnIndex >= this.initiativeOrder.length) {
        this.currentTurnIndex = 0;
        this.round++;
      }
    }
    
    // Check victory/defeat conditions
    const victoryCheck = this._checkVictoryConditions();
    if (victoryCheck) {
      this._endCombat(victoryCheck);
      return;
    }
    
    this._startTurn();
  }
  
  /**
   * Handle turn timeout (auto-dodge)
   */
  _handleTurnTimeout() {
    const combatant = this.getCurrentCombatant();
    if (!combatant) return;
    
    this._emitEvent('turn_timeout', {
      combatant: combatant.name,
      action: 'dodge',
    });
    
    // Apply dodge condition for the round
    combatant.conditions.add('dodging');
    
    this.endTurn();
  }
  
  /**
   * Get time remaining in current turn (ms)
   */
  getTurnTimeRemaining() {
    if (!this.turnStartTime) return TURN_TIMER_MS;
    return Math.max(0, TURN_TIMER_MS - (Date.now() - this.turnStartTime));
  }
  
  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  /**
   * Process a player action
   */
  action(combatantId, actionType, params = {}) {
    const combatant = this.getCombatant(combatantId);
    if (!combatant) {
      return { success: false, error: 'Combatant not found' };
    }
    
    // Check if it's their turn (for players)
    if (combatant.team === 'party') {
      const current = this.getCurrentCombatant();
      if (!current || current.id !== combatantId) {
        return { success: false, error: 'Not your turn' };
      }
    }
    
    switch (actionType) {
      case 'move':
        return this._handleMove(combatant, params.path || [params.target]);
        
      case 'attack':
        return this._handleAttack(combatant, params.targetId);
        
      case 'ability':
        return this._handleAbility(combatant, params.abilityId, params);
        
      case 'dodge':
        return this._handleDodge(combatant);
        
      case 'cast':
      case 'spell':
        return this._handleSpellCast(combatant, params.spellId, params);
        
      case 'end_turn':
        this.endTurn();
        return { success: true, message: 'Turn ended' };
        
      default:
        return { success: false, error: `Unknown action: ${actionType}` };
    }
  }
  
  /**
   * Handle spell casting
   */
  _handleSpellCast(caster, spellId, params = {}) {
    if (!caster.hasAction) {
      return { success: false, error: 'No action remaining' };
    }
    
    // Get spell data
    const spell = getSpell(spellId);
    if (!spell) {
      return { success: false, error: `Unknown spell: ${spellId}` };
    }
    
    // Check if caster knows this spell
    const knowsSpell = caster.spells?.includes(spellId) || 
                       caster.cantrips?.includes(spellId) ||
                       spell.level === 0; // Cantrips
    
    if (!knowsSpell && caster.spellcaster) {
      return { success: false, error: 'Spell not known' };
    }
    
    // Check spell slot for leveled spells
    const slotLevel = params.slotLevel || spell.level;
    if (spell.level > 0) {
      if (!caster.spellSlots || !caster.spellSlots[slotLevel] || caster.spellSlots[slotLevel] <= 0) {
        return { success: false, error: `No ${slotLevel}${this._ordinalSuffix(slotLevel)} level spell slot available` };
      }
    }
    
    // Determine target(s)
    let targetHex = params.targetHex || (params.targetId ? this.getCombatant(params.targetId)?.position : null);
    
    // Self-range spells
    if (spell.range === 0) { // RANGE.SELF
      targetHex = caster.position;
    }
    
    // Check range
    if (targetHex) {
      const distance = hexDistance(caster.position, targetHex);
      if (!isInSpellRange(spell, distance)) {
        return { success: false, error: `Target out of spell range (${distance} hexes, max ${spell.range})` };
      }
      
      // Check line of sight for attack spells
      if (spell.attackType && spell.range > 1 && !this.grid.hasLineOfSight(caster.position, targetHex)) {
        return { success: false, error: 'No line of sight to target' };
      }
    }
    
    // Consume spell slot
    if (spell.level > 0 && caster.spellSlots) {
      caster.spellSlots[slotLevel]--;
    }
    caster.hasAction = false;
    
    // Emit spell cast event
    this._emitEvent('spell_cast', {
      caster: caster.name,
      casterId: caster.id,
      spell: spell.name,
      spellId: spell.id,
      level: spell.level,
      slotLevel,
      targetHex,
      range: spell.range,
      area: spell.area,
      visual: spell.visual
    }, EVENT_DELAYS.spell_cast);
    
    // Get affected hexes for area spells
    const affectedHexes = getAffectedHexes(
      spell, 
      caster.position, 
      targetHex,
      (center, radius) => this.grid.getHexesInRange ? this.grid.getHexesInRange(center, radius) : hexRange(center, radius),
      hexDistance,
      hexNeighbors
    );
    
    // Resolve spell effects
    return this._resolveSpellEffects(caster, spell, affectedHexes, slotLevel);
  }
  
  /**
   * Resolve spell effects on affected targets
   */
  _resolveSpellEffects(caster, spell, affectedHexes, slotLevel) {
    const results = {
      success: true,
      spell: spell.name,
      affectedHexes,
      targets: []
    };
    
    // Find all combatants in affected hexes
    for (const h of affectedHexes) {
      const target = this._getCombatantAt(h);
      if (!target || !target.isAlive) continue;
      
      // Skip self for non-healing spells (unless it's self-targeted)
      if (target.id === caster.id && !spell.healing && spell.damage) {
        continue;
      }
      
      const targetResult = { target: target.name, targetId: target.id };
      
      // Spell attack roll
      if (spell.attackType) {
        const roll = Math.floor(Math.random() * 20) + 1;
        const total = roll + caster.spellcastingMod + (caster.attackBonus || 0);
        const isCrit = roll === 20;
        const isMiss = roll === 1;
        const hits = isCrit || (!isMiss && total >= target.ac);
        
        targetResult.attackRoll = roll;
        targetResult.total = total;
        targetResult.hits = hits;
        targetResult.isCrit = isCrit;
        
        this._emitEvent('spell_attack', {
          caster: caster.name,
          target: target.name,
          spell: spell.name,
          roll,
          total,
          targetAC: target.ac,
          hits,
          isCrit
        }, EVENT_DELAYS.attack_roll);
        
        if (!hits) {
          results.targets.push(targetResult);
          continue;
        }
      }
      
      // Saving throw
      if (spell.save) {
        const saveRoll = Math.floor(Math.random() * 20) + 1;
        const saveMod = this._getSaveMod(target, spell.save);
        const saveTotal = saveRoll + saveMod;
        const dc = 8 + caster.spellcastingMod + 2; // 8 + mod + proficiency
        const saved = saveTotal >= dc;
        
        targetResult.saveRoll = saveRoll;
        targetResult.saveTotal = saveTotal;
        targetResult.dc = dc;
        targetResult.saved = saved;
        
        this._emitEvent('saving_throw', {
          target: target.name,
          saveType: spell.save,
          roll: saveRoll,
          total: saveTotal,
          dc,
          saved
        }, EVENT_DELAYS.ability_use);
        
        // Half damage on save for some spells
        if (saved && !spell.halfOnSave) {
          results.targets.push(targetResult);
          continue;
        }
        
        targetResult.halfDamage = saved && spell.halfOnSave;
      }
      
      // Apply damage
      if (spell.damage) {
        const damageStr = getSpellDamage(spell, caster.level || 1, slotLevel);
        let damage = this._rollDamage(damageStr, 0, targetResult.isCrit);
        
        // Add bonus damage if any
        if (spell.bonusDamage) {
          damage += this._rollDamage(spell.bonusDamage, 0, false);
        }
        
        // Half on save
        if (targetResult.halfDamage) {
          damage = Math.floor(damage / 2);
        }
        
        target.hp -= damage;
        targetResult.damage = damage;
        targetResult.damageType = spell.damageType;
        
        this._emitEvent('spell_damage', {
          caster: caster.name,
          target: target.name,
          spell: spell.name,
          damage,
          damageType: spell.damageType,
          remainingHp: Math.max(0, target.hp),
          maxHp: target.maxHp
        }, EVENT_DELAYS.damage);
        
        // Check for death
        this._checkPhaseTransition(target);
        if (target.hp <= 0) {
          this._handleDeath(target);
          targetResult.killed = true;
        }
      }
      
      // Apply healing
      if (spell.healing) {
        const healingStr = spell.healing;
        const healing = this._rollDamage(healingStr, caster.spellcastingMod, false);
        target.hp = Math.min(target.maxHp, target.hp + healing);
        targetResult.healing = healing;
        
        this._emitEvent('spell_healing', {
          caster: caster.name,
          target: target.name,
          spell: spell.name,
          healing,
          newHp: target.hp,
          maxHp: target.maxHp
        }, EVENT_DELAYS.ability_use);
      }
      
      // Apply conditions
      if (spell.condition) {
        target.conditions.add(spell.condition);
        targetResult.condition = spell.condition;
        
        this._emitEvent('condition_applied', {
          target: target.name,
          condition: spell.condition,
          source: spell.name
        }, EVENT_DELAYS.ability_use);
      }
      
      results.targets.push(targetResult);
    }
    
    return results;
  }
  
  /**
   * Get saving throw modifier for a combatant
   */
  _getSaveMod(combatant, saveType) {
    const abilityMap = {
      'STR': 'strMod',
      'DEX': 'dexMod',
      'CON': 'conMod',
      'INT': 'intMod',
      'WIS': 'wisMod',
      'CHA': 'chaMod'
    };
    
    return combatant[abilityMap[saveType]] || 0;
  }
  
  /**
   * Get ordinal suffix (1st, 2nd, 3rd, etc.)
   */
  _ordinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return (s[(v - 20) % 10] || s[v] || s[0]);
  }
  
  /**
   * Handle movement
   */
  _handleMove(combatant, path) {
    if (!combatant.position) {
      return { success: false, error: 'Combatant has no position' };
    }
    
    const events = [];
    let currentPos = combatant.position;
    
    for (const target of path) {
      const targetHex = hex(target.q, target.r);
      const distance = hexDistance(currentPos, targetHex);
      
      // Check movement remaining
      const moveCost = this.grid.getMoveCost(targetHex) * distance;
      if (moveCost > combatant.movementRemaining) {
        return { 
          success: false, 
          error: 'Not enough movement',
          moved: events.length,
        };
      }
      
      // Check if path is valid (adjacent and walkable)
      if (distance > 1) {
        return { success: false, error: 'Can only move to adjacent hex' };
      }
      
      if (!this.grid.isWalkable(targetHex)) {
        return { success: false, error: 'Target hex not walkable' };
      }
      
      // Check for opportunity attacks
      const opportunityAttacks = this._checkOpportunityAttacks(combatant, currentPos, targetHex);
      for (const opp of opportunityAttacks) {
        events.push(opp);
        if (!combatant.isAlive) {
          return { success: true, events, died: true };
        }
      }
      
      // Move the entity
      this.grid.moveEntity(combatant.id, targetHex);
      combatant.position = targetHex;
      combatant.movementRemaining -= moveCost;
      
      events.push({
        type: 'movement',
        combatant: combatant.name,
        from: currentPos,
        to: targetHex,
        remaining: combatant.movementRemaining,
      });
      
      this._emitEvent('movement', events[events.length - 1], EVENT_DELAYS.movement);
      
      currentPos = targetHex;
    }
    
    this._updatePartyVision();
    
    return { success: true, events };
  }
  
  /**
   * Check for opportunity attacks when leaving threatened hexes
   */
  _checkOpportunityAttacks(mover, from, to) {
    const events = [];
    
    // Get all enemies adjacent to the 'from' position
    const fromNeighbors = hexNeighbors(from);
    
    for (const [id, combatant] of this.combatants) {
      if (!combatant.isAlive) continue;
      if (combatant.team === mover.team) continue;
      if (!combatant.hasReaction) continue;
      if (!combatant.position) continue;
      
      // Was the enemy adjacent?
      const wasAdjacent = fromNeighbors.some(n => hexEqual(n, combatant.position));
      if (!wasAdjacent) continue;
      
      // Is the enemy still adjacent after the move?
      const toNeighbors = hexNeighbors(to);
      const stillAdjacent = toNeighbors.some(n => hexEqual(n, combatant.position));
      
      // Opportunity attack triggers when leaving threatened area
      if (wasAdjacent && !stillAdjacent) {
        combatant.hasReaction = false;
        
        const attackResult = this._resolveAttack(combatant, mover, true);
        events.push({
          type: 'opportunity_attack',
          attacker: combatant.name,
          target: mover.name,
          ...attackResult,
        });
        
        this._emitEvent('opportunity_attack', events[events.length - 1], EVENT_DELAYS.attack_roll);
      }
    }
    
    return events;
  }
  
  /**
   * Handle attack action
   * @param {Object} attacker - The attacking combatant
   * @param {string} targetId - ID of the target
   * @param {Object} options - Attack options (useThrown, preferRanged, spellId)
   */
  _handleAttack(attacker, targetId, options = {}) {
    if (!attacker.hasAction) {
      return { success: false, error: 'No action remaining' };
    }
    
    const target = this.getCombatant(targetId);
    if (!target || !target.isAlive) {
      return { success: false, error: 'Invalid target' };
    }
    
    if (!attacker.position || !target.position) {
      return { success: false, error: 'Combatant has no position' };
    }
    
    const distance = hexDistance(attacker.position, target.position);
    
    // Determine attack type and check range using weapon system
    let rangeCheck;
    let attackType = 'melee';
    let disadvantage = false;
    
    if (attacker.weaponData) {
      // Use new weapon system
      const weapon = attacker.weaponData;
      const useThrown = options.useThrown || (options.preferRanged && hasProperty(weapon, 'thrown') && distance > (weapon.range?.melee || 1));
      rangeCheck = checkWeaponRange(weapon, distance, useThrown);
      attackType = getAttackType(weapon, distance, options.preferRanged);
      disadvantage = rangeCheck.disadvantage;
      
      if (!rangeCheck.inRange) {
        return { 
          success: false, 
          error: `Target out of range (${distance} hexes, max ${getMaxRange(weapon)})`,
          distance,
          maxRange: getMaxRange(weapon)
        };
      }
    } else {
      // Legacy fallback
      const attackRange = attacker.attackRange || 1;
      if (distance > attackRange) {
        return { success: false, error: 'Target out of range' };
      }
    }
    
    // Check line of sight for ranged/thrown attacks
    if (attackType !== 'melee' && !this.grid.hasLineOfSight(attacker.position, target.position)) {
      return { success: false, error: 'No line of sight' };
    }
    
    // Check for melee disadvantage with ranged weapon (enemy adjacent)
    if (attackType === 'ranged' && this._hasAdjacentEnemy(attacker)) {
      disadvantage = true;
    }
    
    attacker.hasAction = false;
    
    const result = this._resolveAttack(attacker, target, false, disadvantage, attackType);
    
    return { success: true, ...result };
  }
  
  /**
   * Check if combatant has an adjacent hostile enemy
   */
  _hasAdjacentEnemy(combatant) {
    const neighbors = hexNeighbors(combatant.position);
    for (const neighbor of neighbors) {
      const atHex = this._getCombatantAt(neighbor);
      if (atHex && atHex.isAlive && atHex.team !== combatant.team) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Resolve an attack roll
   * @param {Object} attacker - Attacking combatant
   * @param {Object} target - Target combatant
   * @param {boolean} isOpportunity - Is this an opportunity attack
   * @param {boolean} hasDisadvantage - Roll with disadvantage
   * @param {string} attackType - Type of attack (melee, ranged, thrown)
   */
  _resolveAttack(attacker, target, isOpportunity = false, hasDisadvantage = false, attackType = 'melee') {
    // Roll d20 (with advantage/disadvantage)
    let roll1 = Math.floor(Math.random() * 20) + 1;
    let roll2 = Math.floor(Math.random() * 20) + 1;
    
    // Check for advantage (attack hidden/unseen targets, etc.)
    let hasAdvantage = target.conditions.has('blinded') || 
                       target.conditions.has('prone') && attackType === 'melee' ||
                       target.conditions.has('stunned') ||
                       target.conditions.has('paralyzed') ||
                       attacker.conditions.has('invisible');
    
    // Prone gives advantage to melee, disadvantage to ranged
    if (target.conditions.has('prone') && attackType !== 'melee') {
      hasDisadvantage = true;
      hasAdvantage = false;
    }
    
    // Check for dodge condition on target
    let targetAC = target.ac;
    if (target.conditions.has('dodging')) {
      hasDisadvantage = true;
    }
    
    // Advantage and disadvantage cancel out
    let roll;
    if (hasAdvantage && hasDisadvantage) {
      roll = roll1; // They cancel
    } else if (hasAdvantage) {
      roll = Math.max(roll1, roll2);
    } else if (hasDisadvantage) {
      roll = Math.min(roll1, roll2);
    } else {
      roll = roll1;
    }
    
    const totalAttack = roll + attacker.attackBonus;
    
    const isCrit = roll === 20;
    const isMiss = roll === 1;
    const hits = isCrit || (!isMiss && totalAttack >= targetAC);
    
    // Determine damage type from weapon or default
    const damageType = attacker.weaponData?.damageType || attacker.damageType || 'slashing';
    
    const result = {
      attacker: attacker.name,
      attackerId: attacker.id,
      target: target.name,
      targetId: target.id,
      roll,
      roll1,
      roll2,
      attackBonus: attacker.attackBonus,
      total: totalAttack,
      targetAC,
      hits,
      isCrit,
      isMiss,
      isOpportunity,
      attackType,
      damageType,
      hasAdvantage,
      hasDisadvantage,
      weapon: attacker.weaponData?.name || 'weapon'
    };
    
    this._emitEvent('attack_roll', result, EVENT_DELAYS.attack_roll);
    
    if (hits) {
      // Roll damage
      const damageStr = attacker.weaponData?.damage || attacker.damage || '1d6';
      const damage = this._rollDamage(damageStr, attacker.damageBonus, isCrit);
      result.damage = damage;
      result.damageRolled = damageStr;
      
      target.hp -= damage;
      
      this._emitEvent(isCrit ? 'critical_hit' : 'damage', {
        attacker: attacker.name,
        target: target.name,
        damage,
        damageType,
        weapon: result.weapon,
        attackType,
        remainingHp: Math.max(0, target.hp),
        maxHp: target.maxHp,
        isCrit,
      }, isCrit ? EVENT_DELAYS.critical : EVENT_DELAYS.damage);
      
      // Check for boss phase transition
      this._checkPhaseTransition(target);
      
      if (target.hp <= 0) {
        this._handleDeath(target);
        result.killed = true;
      }
    } else {
      this._emitEvent('attack_miss', {
        attacker: attacker.name,
        target: target.name,
        roll,
        total: totalAttack,
        targetAC,
        weapon: result.weapon,
        attackType,
        hasDisadvantage,
      }, EVENT_DELAYS.hit_miss);
    }
    
    return result;
  }
  
  /**
   * Roll damage dice
   */
  _rollDamage(diceStr, bonus = 0, isCrit = false) {
    const match = diceStr.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) return 1 + bonus;
    
    let numDice = parseInt(match[1]);
    const dieSize = parseInt(match[2]);
    const diceBonus = match[3] ? parseInt(match[3]) : 0;
    
    if (isCrit) numDice *= 2;
    
    let total = 0;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(Math.random() * dieSize) + 1;
    }
    
    return Math.max(1, total + diceBonus + bonus);
  }
  
  /**
   * Handle dodge action
   */
  _handleDodge(combatant) {
    if (!combatant.hasAction) {
      return { success: false, error: 'No action remaining' };
    }
    
    combatant.hasAction = false;
    combatant.conditions.add('dodging');
    
    this._emitEvent('ability_use', {
      combatant: combatant.name,
      ability: 'Dodge',
      effect: 'Attacks against you have disadvantage until your next turn',
    }, EVENT_DELAYS.ability_use);
    
    return { success: true, action: 'dodge' };
  }
  
  /**
   * Handle ability usage
   */
  _handleAbility(combatant, abilityId, params) {
    const ability = combatant.abilities?.find(a => a.id === abilityId);
    if (!ability) {
      return { success: false, error: 'Ability not found' };
    }
    
    // Check if ability is available
    if (ability.uses !== undefined && ability.uses <= 0) {
      return { success: false, error: 'Ability has no uses remaining' };
    }
    
    // Consume use if limited
    if (ability.uses !== undefined) {
      ability.uses--;
    }
    
    this._emitEvent('ability_use', {
      combatant: combatant.name,
      ability: ability.name,
      description: ability.description,
    }, EVENT_DELAYS.ability_use);
    
    // Execute ability effect (simplified)
    if (ability.damage && params.targetId) {
      const target = this.getCombatant(params.targetId);
      if (target && target.isAlive) {
        const damage = this._rollDamage(ability.damage, 0, false);
        target.hp -= damage;
        
        this._emitEvent('damage', {
          target: target.name,
          damage,
          source: ability.name,
          remainingHp: Math.max(0, target.hp),
        }, EVENT_DELAYS.damage);
        
        // Check for boss phase transition
        this._checkPhaseTransition(target);
        
        if (target.hp <= 0) {
          this._handleDeath(target);
        }
      }
    }
    
    if (ability.healing && params.targetId) {
      const target = this.getCombatant(params.targetId);
      if (target && target.isAlive) {
        const healing = this._rollDamage(ability.healing, 0, false);
        target.hp = Math.min(target.maxHp, target.hp + healing);
        
        this._emitEvent('healing', {
          target: target.name,
          healing,
          source: ability.name,
          newHp: target.hp,
        }, EVENT_DELAYS.ability_use);
      }
    }
    
    return { success: true, ability: ability.name };
  }
  
  // ============================================================================
  // DEATH & VICTORY
  // ============================================================================
  
  /**
   * Handle combatant death
   */
  _handleDeath(combatant) {
    combatant.isAlive = false;
    combatant.hp = 0;
    
    // Remove from grid
    if (combatant.position) {
      this.grid.removeEntity(combatant.position, combatant.id);
    }
    
    // Track party deaths
    if (combatant.team === 'party') {
      this.partyDeaths++;
    }
    
    this._emitEvent('death', {
      combatant: combatant.name,
      team: combatant.team,
      partyDeaths: this.partyDeaths,
      maxDeaths: this.maxPartyDeaths,
    }, EVENT_DELAYS.death);
    
    this._updatePartyVision();
  }
  
  /**
   * Resurrect a combatant
   */
  resurrect(combatantId, hpAmount = 1) {
    const combatant = this.getCombatant(combatantId);
    if (!combatant) return { success: false, error: 'Combatant not found' };
    if (combatant.isAlive) return { success: false, error: 'Combatant is not dead' };
    
    combatant.isAlive = true;
    combatant.hp = Math.min(hpAmount, combatant.maxHp);
    
    // Reduce death count
    if (combatant.team === 'party') {
      this.partyDeaths = Math.max(0, this.partyDeaths - 1);
    }
    
    this._emitEvent('resurrection', {
      combatant: combatant.name,
      hp: combatant.hp,
      partyDeaths: this.partyDeaths,
    });
    
    return { success: true };
  }
  
  /**
   * Check victory/defeat conditions
   */
  _checkVictoryConditions() {
    const partyAlive = this.getTeam('party').length > 0;
    const enemiesAlive = this.getTeam('enemy').length > 0;
    
    if (!partyAlive || this.partyDeaths >= this.maxPartyDeaths) {
      return 'defeat';
    }
    
    if (!enemiesAlive) {
      return 'victory';
    }
    
    return null;
  }
  
  /**
   * End combat
   */
  _endCombat(result) {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    
    this.status = result;
    
    const delay = result === 'victory' ? EVENT_DELAYS.victory : EVENT_DELAYS.defeat;
    
    this._emitEvent('combat_end', {
      result,
      rounds: this.round,
      partyDeaths: this.partyDeaths,
      survivors: this.getTeam('party').map(c => c.name),
    }, delay);
  }
  
  // ============================================================================
  // BOSS PHASE SYSTEM
  // ============================================================================
  
  /**
   * Configure boss phases for capstone fights
   * @param {string} bossId - The combatant ID of the boss
   * @param {Array} phases - Array of phase configs
   * 
   * Phase config example:
   * {
   *   phase: 2,
   *   hpThreshold: 0.66, // Triggers when boss drops below 66% HP
   *   name: "Enraged",
   *   description: "The boss flies into a rage!",
   *   onEnter: (combat, boss) => { ... }, // Optional callback
   *   statChanges: { attackBonus: 2, damage: '2d8+4' }, // Optional
   *   summons: [{ name: 'Crab Minion', ... }], // Optional
   *   abilities: ['multiattack', 'claw_storm'], // Optional new abilities
   * }
   */
  setBossPhases(bossId, phases) {
    this.bossId = bossId;
    this.phaseConfig = phases.sort((a, b) => b.hpThreshold - a.hpThreshold); // Sort descending
    this.currentPhase = 1;
    this.phaseTriggered.add(1); // Phase 1 is always triggered at start
  }
  
  /**
   * Check and trigger phase transitions
   */
  _checkPhaseTransition(combatant) {
    if (!this.bossId || combatant.id !== this.bossId || !this.phaseConfig) return;
    
    const hpPercent = combatant.hp / combatant.maxHp;
    
    for (const phase of this.phaseConfig) {
      // Skip already triggered phases
      if (this.phaseTriggered.has(phase.phase)) continue;
      
      // Check if HP dropped below threshold
      if (hpPercent <= phase.hpThreshold) {
        this._triggerPhase(combatant, phase);
        break; // Only trigger one phase at a time
      }
    }
  }
  
  /**
   * Trigger a boss phase transition
   */
  _triggerPhase(boss, phase) {
    this.currentPhase = phase.phase;
    this.phaseTriggered.add(phase.phase);
    
    // Emit phase change event for spectators
    this._emitEvent('phase_change', {
      boss: boss.name,
      phase: phase.phase,
      phaseName: phase.name,
      description: phase.description,
      hpPercent: Math.round((boss.hp / boss.maxHp) * 100),
    }, EVENT_DELAYS.phase_change);
    
    // Apply stat changes
    if (phase.statChanges) {
      for (const [key, value] of Object.entries(phase.statChanges)) {
        boss[key] = value;
      }
    }
    
    // Grant new abilities
    if (phase.abilities) {
      boss.abilities = [...(boss.abilities || []), ...phase.abilities];
    }
    
    // Summon minions
    if (phase.summons && phase.summons.length > 0) {
      this._spawnPhaseMinions(boss, phase.summons);
    }
    
    // Call custom onEnter handler
    if (typeof phase.onEnter === 'function') {
      phase.onEnter(this, boss);
    }
    
    // Visual flair - boss heals a small amount on phase change (dramatic effect)
    if (phase.healOnEnter) {
      const healAmount = Math.floor(boss.maxHp * phase.healOnEnter);
      boss.hp = Math.min(boss.maxHp, boss.hp + healAmount);
      this._emitEvent('heal', {
        combatant: boss.name,
        amount: healAmount,
        reason: 'Phase transition power surge',
      });
    }
  }
  
  /**
   * Spawn minions during phase transition
   */
  _spawnPhaseMinions(boss, summons) {
    const bossNeighbors = hexNeighbors(boss.position);
    let spawnIndex = 0;
    
    for (const summonData of summons) {
      // Find a free adjacent hex
      let spawnPos = null;
      for (let i = spawnIndex; i < bossNeighbors.length; i++) {
        const neighbor = bossNeighbors[i];
        if (this.grid.isWalkable(neighbor) && !this._getCombatantAt(neighbor)) {
          spawnPos = neighbor;
          spawnIndex = i + 1;
          break;
        }
      }
      
      // If no adjacent, find any nearby free hex
      if (!spawnPos) {
        const nearby = this.grid.getHexesInRange(boss.position, 3);
        for (const h of nearby) {
          if (this.grid.isWalkable(h) && !this._getCombatantAt(h)) {
            spawnPos = h;
            break;
          }
        }
      }
      
      if (spawnPos) {
        const minionId = `minion_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        this.addCombatant({
          ...summonData,
          id: minionId,
          team: 'enemy',
          type: 'monster',
          position: spawnPos,
        });
        
        // Add to initiative (at end of current round)
        this.initiativeOrder.push(minionId);
        
        this._emitEvent('summon', {
          summoner: boss.name,
          minion: summonData.name,
          position: spawnPos,
        });
      }
    }
  }
  
  /**
   * Get combatant at a specific hex
   */
  _getCombatantAt(h) {
    for (const [id, c] of this.combatants) {
      if (c.position && c.isAlive && hexEqual(c.position, h)) {
        return c;
      }
    }
    return null;
  }
  
  /**
   * Get current phase info
   */
  getPhaseInfo() {
    if (!this.phaseConfig) return null;
    
    const currentConfig = this.phaseConfig.find(p => p.phase === this.currentPhase);
    return {
      phase: this.currentPhase,
      name: currentConfig?.name || 'Normal',
      totalPhases: this.phaseConfig.length + 1, // +1 for phase 1
    };
  }
  
  // ============================================================================
  // AI - Tactical Combat Intelligence
  // ============================================================================
  
  /**
   * Run tactical AI for enemy combatant
   * Considers weapon ranges, positioning, and smart target selection
   */
  _runAI(combatant) {
    if (!combatant.isAlive || this.status !== 'active') return;
    
    // Find enemies (opposite team)
    const enemies = combatant.team === 'party' ? this.getTeam('enemy') : this.getTeam('party');
    if (enemies.length === 0) {
      this.endTurn();
      return;
    }
    
    // Determine combat behavior based on capabilities
    const behavior = this._determineBehavior(combatant);
    
    switch (behavior) {
      case AI_BEHAVIOR.RANGED:
        this._runRangedAI(combatant, enemies);
        break;
      case AI_BEHAVIOR.SUPPORT:
        this._runSupportAI(combatant, enemies);
        break;
      case AI_BEHAVIOR.DEFENDER:
        this._runDefenderAI(combatant, enemies);
        break;
      case AI_BEHAVIOR.BERSERKER:
        this._runBerserkerAI(combatant, enemies);
        break;
      default:
        this._runAggressiveAI(combatant, enemies);
    }
    
    this.endTurn();
  }
  
  /**
   * Determine AI behavior based on combatant capabilities
   */
  _determineBehavior(combatant) {
    // Explicit behavior set
    if (combatant.aiBehavior) return combatant.aiBehavior;
    
    // Check weapon for ranged capability
    if (combatant.weaponData) {
      const maxRange = getMaxRange(combatant.weaponData);
      if (maxRange >= 6) return AI_BEHAVIOR.RANGED;
    }
    
    // Check for ranged spells
    if (combatant.spellcaster && combatant.spells?.length > 0) {
      return AI_BEHAVIOR.RANGED;
    }
    
    return AI_BEHAVIOR.AGGRESSIVE;
  }
  
  /**
   * Ranged AI: Keep distance, attack from range, kite melee enemies
   */
  _runRangedAI(combatant, enemies) {
    const weapon = combatant.weaponData;
    const maxRange = weapon ? getMaxRange(weapon) : combatant.attackRange || 6;
    const normalRange = weapon ? getNormalRange(weapon) : Math.floor(maxRange / 2);
    const idealRange = combatant.preferredRange || Math.floor((normalRange + maxRange) / 2);
    
    // Find best target (prioritize low HP, spellcasters)
    const target = this._selectTarget(combatant, enemies, maxRange);
    if (!target) {
      // Can't attack anyone, close distance
      this._runAggressiveAI(combatant, enemies);
      return;
    }
    
    const currentDistance = hexDistance(combatant.position, target.position);
    
    // Check if we can attack from current position (in range)
    const rangeCheck = weapon ? checkWeaponRange(weapon, currentDistance) : { inRange: currentDistance <= maxRange };
    
    // Attack if in range and have line of sight
    if (rangeCheck.inRange && this.grid.hasLineOfSight(combatant.position, target.position)) {
      // But first, consider repositioning if too close to melee enemies
      const nearestMeleeDistance = this._getNearestMeleeEnemyDistance(combatant, enemies);
      
      if (nearestMeleeDistance <= 2 && combatant.movementRemaining >= 2) {
        // Kite! Move away before attacking
        this._moveAwayFrom(combatant, enemies);
        
        // Re-check if we can still attack
        const newDistance = hexDistance(combatant.position, target.position);
        const newRangeCheck = weapon ? checkWeaponRange(weapon, newDistance) : { inRange: newDistance <= maxRange };
        
        if (newRangeCheck.inRange && combatant.hasAction) {
          this.action(combatant.id, 'attack', { targetId: target.id, preferRanged: true });
        }
      } else {
        // Safe to attack from here
        this.action(combatant.id, 'attack', { targetId: target.id, preferRanged: true });
      }
    } else {
      // Not in range, need to reposition
      const targetPos = this._findIdealRangedPosition(combatant, target, idealRange, maxRange);
      if (targetPos) {
        this._moveToward(combatant, targetPos);
        
        // Attack if now in range
        const newDistance = hexDistance(combatant.position, target.position);
        const newRangeCheck = weapon ? checkWeaponRange(weapon, newDistance) : { inRange: newDistance <= maxRange };
        
        if (newRangeCheck.inRange && combatant.hasAction && this.grid.hasLineOfSight(combatant.position, target.position)) {
          this.action(combatant.id, 'attack', { targetId: target.id, preferRanged: true });
        }
      }
    }
  }
  
  /**
   * Aggressive/Melee AI: Close distance and attack
   */
  _runAggressiveAI(combatant, enemies) {
    const attackRange = combatant.weaponData?.range?.melee || combatant.attackRange || 1;
    
    // Find best target to close with
    const target = this._selectTarget(combatant, enemies, attackRange + combatant.movementRemaining);
    if (!target) {
      // No reachable targets
      return;
    }
    
    const distance = hexDistance(combatant.position, target.position);
    
    // If in melee range, attack
    if (distance <= attackRange) {
      this.action(combatant.id, 'attack', { targetId: target.id });
      
      // If reach weapon and extra movement, could attack and retreat (optional tactical behavior)
      return;
    }
    
    // Move toward target
    this._moveTowardTarget(combatant, target, attackRange);
    
    // Attack if now in range
    const newDistance = hexDistance(combatant.position, target.position);
    if (newDistance <= attackRange && combatant.hasAction) {
      this.action(combatant.id, 'attack', { targetId: target.id });
    }
  }
  
  /**
   * Berserker AI: Rush nearest enemy regardless of tactics
   */
  _runBerserkerAI(combatant, enemies) {
    // Find nearest enemy
    let nearestTarget = null;
    let nearestDistance = Infinity;
    
    for (const enemy of enemies) {
      if (!enemy.position) continue;
      const dist = hexDistance(combatant.position, enemy.position);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestTarget = enemy;
      }
    }
    
    if (!nearestTarget) return;
    
    const attackRange = combatant.weaponData?.range?.melee || combatant.attackRange || 1;
    
    if (nearestDistance <= attackRange) {
      this.action(combatant.id, 'attack', { targetId: nearestTarget.id });
    } else {
      this._moveTowardTarget(combatant, nearestTarget, attackRange);
      
      const newDistance = hexDistance(combatant.position, nearestTarget.position);
      if (newDistance <= attackRange && combatant.hasAction) {
        this.action(combatant.id, 'attack', { targetId: nearestTarget.id });
      }
    }
  }
  
  /**
   * Support AI: Stay back, heal/buff allies
   */
  _runSupportAI(combatant, enemies) {
    // TODO: Implement healing/buffing logic when spell system is integrated
    // For now, fall back to ranged behavior
    this._runRangedAI(combatant, enemies);
  }
  
  /**
   * Defender AI: Protect allies, control area
   */
  _runDefenderAI(combatant, enemies) {
    // TODO: Implement ally protection and area control
    // For now, fall back to aggressive
    this._runAggressiveAI(combatant, enemies);
  }
  
  /**
   * Select best target based on priorities
   */
  _selectTarget(combatant, enemies, maxRange) {
    const scoredTargets = [];
    
    for (const enemy of enemies) {
      if (!enemy.position || !enemy.isAlive) continue;
      
      const distance = hexDistance(combatant.position, enemy.position);
      if (distance > maxRange) continue;
      
      // Check line of sight for ranged
      if (maxRange > 2 && !this.grid.hasLineOfSight(combatant.position, enemy.position)) {
        continue;
      }
      
      // Score the target (higher = better target)
      let score = 100;
      
      // Prefer low HP targets (finish them off)
      const hpPercent = enemy.hp / enemy.maxHp;
      score += (1 - hpPercent) * 50;
      
      // Prefer closer targets
      score -= distance * 3;
      
      // Prefer spellcasters (high threat)
      if (enemy.spellcaster) score += 20;
      
      // Prefer targets in range without disadvantage
      if (combatant.weaponData) {
        const rangeCheck = checkWeaponRange(combatant.weaponData, distance);
        if (rangeCheck.disadvantage) score -= 15;
      }
      
      scoredTargets.push({ enemy, score, distance });
    }
    
    // Sort by score descending
    scoredTargets.sort((a, b) => b.score - a.score);
    
    return scoredTargets.length > 0 ? scoredTargets[0].enemy : null;
  }
  
  /**
   * Get distance to nearest melee-capable enemy
   */
  _getNearestMeleeEnemyDistance(combatant, enemies) {
    let nearest = Infinity;
    
    for (const enemy of enemies) {
      if (!enemy.position || !enemy.isAlive) continue;
      
      // Check if this enemy is melee-focused
      const enemyMaxRange = enemy.weaponData ? getMaxRange(enemy.weaponData) : enemy.attackRange || 1;
      if (enemyMaxRange <= 2) { // Melee or reach weapon
        const dist = hexDistance(combatant.position, enemy.position);
        nearest = Math.min(nearest, dist);
      }
    }
    
    return nearest;
  }
  
  /**
   * Find ideal position for ranged attacker
   */
  _findIdealRangedPosition(combatant, target, idealRange, maxRange) {
    const currentPos = combatant.position;
    const targetPos = target.position;
    
    // Get all reachable hexes
    const reachable = this.grid.getReachableHexes(currentPos, combatant.movementRemaining);
    
    let bestHex = null;
    let bestScore = -Infinity;
    
    for (const { hex: h } of reachable) {
      if (!this.grid.isWalkable(h)) continue;
      if (this._getCombatantAt(h) && !hexEqual(h, currentPos)) continue;
      
      const distToTarget = hexDistance(h, targetPos);
      
      // Must be within max range
      if (distToTarget > maxRange) continue;
      
      // Check line of sight
      if (!this.grid.hasLineOfSight(h, targetPos)) continue;
      
      // Score based on distance from ideal range
      let score = 100 - Math.abs(distToTarget - idealRange) * 10;
      
      // Bonus for being at ideal range without disadvantage
      if (combatant.weaponData) {
        const rangeCheck = checkWeaponRange(combatant.weaponData, distToTarget);
        if (!rangeCheck.disadvantage) score += 20;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestHex = h;
      }
    }
    
    return bestHex;
  }
  
  /**
   * Move away from enemies (kiting)
   */
  _moveAwayFrom(combatant, enemies) {
    const reachable = this.grid.getReachableHexes(combatant.position, combatant.movementRemaining);
    
    let bestHex = combatant.position;
    let bestMinDistance = 0;
    
    for (const { hex: h } of reachable) {
      if (!this.grid.isWalkable(h)) continue;
      if (this._getCombatantAt(h) && !hexEqual(h, combatant.position)) continue;
      
      // Calculate minimum distance to any enemy
      let minDist = Infinity;
      for (const enemy of enemies) {
        if (!enemy.position) continue;
        minDist = Math.min(minDist, hexDistance(h, enemy.position));
      }
      
      if (minDist > bestMinDistance) {
        bestMinDistance = minDist;
        bestHex = h;
      }
    }
    
    if (!hexEqual(bestHex, combatant.position)) {
      const path = this.grid.findPath(combatant.position, bestHex, combatant.movementRemaining);
      if (path) {
        for (const step of path) {
          if (combatant.movementRemaining <= 0) break;
          const result = this.action(combatant.id, 'move', { target: step });
          if (!result.success) break;
        }
      }
    }
  }
  
  /**
   * Move toward a target position
   */
  _moveToward(combatant, targetPos) {
    const path = this.grid.findPath(combatant.position, targetPos, combatant.movementRemaining + 10);
    if (!path || path.length === 0) return;
    
    for (const step of path) {
      if (combatant.movementRemaining <= 0) break;
      
      const result = this.action(combatant.id, 'move', { target: step });
      if (!result.success) break;
    }
  }
  
  /**
   * Move toward a target combatant (to adjacent hex)
   */
  _moveTowardTarget(combatant, target, attackRange = 1) {
    // Find path to hexes within attack range
    let targetHexes = [];
    
    if (attackRange === 1) {
      targetHexes = hexNeighbors(target.position);
    } else {
      // For reach weapons or ranged, find hexes at that range
      const inRange = this.grid.getHexesInRange ? 
        this.grid.getHexesInRange(target.position, attackRange) :
        hexRange(target.position, attackRange);
      
      targetHexes = inRange.filter(h => {
        const dist = hexDistance(target.position, h);
        return dist <= attackRange && dist > 0 && this.grid.isWalkable(h);
      });
    }
    
    let bestPath = null;
    let bestPathLength = Infinity;
    
    for (const h of targetHexes) {
      if (!this.grid.isWalkable(h)) continue;
      if (this._getCombatantAt(h) && !hexEqual(h, combatant.position)) continue;
      
      const path = this.grid.findPath(combatant.position, h, combatant.movementRemaining + 10);
      if (path && path.length < bestPathLength) {
        bestPath = path;
        bestPathLength = path.length;
      }
    }
    
    if (bestPath && bestPath.length > 0) {
      for (const step of bestPath) {
        if (combatant.movementRemaining <= 0) break;
        
        const result = this.action(combatant.id, 'move', { target: step });
        if (!result.success) break;
        
        // Stop if we've reached attack range
        const newDist = hexDistance(combatant.position, target.position);
        if (newDist <= attackRange) break;
      }
    }
  }
  
  // ============================================================================
  // VISION
  // ============================================================================
  
  /**
   * Update shared party vision
   */
  _updatePartyVision() {
    this.partyVision = new Set();
    
    const party = this.getTeam('party');
    for (const member of party) {
      if (!member.position) continue;
      
      const visible = this.grid.getVisibleHexes(member.position, member.visionRange);
      for (const h of visible) {
        this.partyVision.add(`${h.q},${h.r}`);
      }
    }
  }
  
  /**
   * Check if a hex is visible to the party
   */
  isVisible(h) {
    return this.partyVision.has(`${h.q},${h.r}`);
  }
  
  // ============================================================================
  // EVENTS
  // ============================================================================
  
  /**
   * Register event listener
   */
  on(listener) {
    this.eventListeners.push(listener);
  }
  
  /**
   * Emit event to all listeners
   */
  _emitEvent(type, data, delayMs = 0) {
    const event = {
      type,
      timestamp: Date.now(),
      combatId: this.id,
      round: this.round,
      delayMs,
      ...data,
    };
    
    this.eventLog.push(event);
    
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Event listener error:', err);
      }
    }
  }
  
  /**
   * Sanitize combatant for external use
   */
  _sanitizeCombatant(c) {
    return {
      id: c.id,
      name: c.name,
      char: c.char,
      type: c.type,
      team: c.team,
      hp: c.hp,
      maxHp: c.maxHp,
      ac: c.ac,
      position: c.position,
      conditions: Array.from(c.conditions),
      isAlive: c.isAlive,
    };
  }
  
  // ============================================================================
  // STATE EXPORT
  // ============================================================================
  
  /**
   * Get combat state (for API/spectators)
   */
  getState(forTeam = null) {
    const current = this.getCurrentCombatant();
    
    return {
      id: this.id,
      status: this.status,
      round: this.round,
      currentTurn: current ? {
        id: current.id,
        name: current.name,
        team: current.team,
      } : null,
      turnTimeRemaining: this.getTurnTimeRemaining(),
      initiativeOrder: this.initiativeOrder.map(id => {
        const c = this.getCombatant(id);
        return c ? { id: c.id, name: c.name, initiative: c.initiative, isAlive: c.isAlive } : null;
      }).filter(Boolean),
      combatants: Array.from(this.combatants.values())
        .filter(c => forTeam === null || c.team === forTeam || this.isVisible(c.position))
        .map(c => this._sanitizeCombatant(c)),
      partyDeaths: this.partyDeaths,
      maxDeaths: this.maxPartyDeaths,
      grid: this.grid.toJSON(forTeam === 'party' ? this.partyVision : null),
    };
  }
  
  /**
   * Get ASCII render of battle
   */
  renderASCII(forTeam = 'party') {
    const viewerPos = forTeam === 'party' 
      ? this.getTeam('party')[0]?.position 
      : null;
    
    const visible = forTeam === 'party' ? this.partyVision : null;
    
    return this.grid.renderASCII(viewerPos, DEFAULT_VISION_RANGE, visible);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  TacticalCombat,
  TURN_TIMER_MS,
  EVENT_DELAYS,
  DEFAULT_VISION_RANGE,
  DEFAULT_SPEED,
};
