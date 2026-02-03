/**
 * STUB: tactical-combat.js removed (visual combat cut)
 * This stub prevents import errors while we rebuild text-based system
 */

const EVENT_DELAYS = {
  TURN_START: 100,
  MOVE: 100,
  ATTACK: 100,
  DAMAGE: 100,
  TURN_END: 100
};

class TacticalCombat {
  constructor(config) {
    this.entities = [];
    this.events = [];
    this.config = config || {};
  }
  
  // Stub methods - will be replaced with text-based combat
  addEntity() { return this; }
  start() { return { events: [], winner: 'party' }; }
  tick() { return { events: [], done: true, winner: 'party' }; }
  getState() { return { entities: [], round: 1, done: true }; }
}

module.exports = {
  TacticalCombat,
  EVENT_DELAYS
};
