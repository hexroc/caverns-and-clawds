/**
 * Class Feature API Routes
 * Endpoints for using class-specific abilities in and out of combat
 */

const express = require('express');
const classFeatures = require('./class-features');
const { buildCharacterSheet } = require('./character');
const db = require('./db');

function createClassFeatureRoutes(authenticateAgent) {
  const router = express.Router();
  
  // ============================================================================
  // PALADIN FEATURES
  // ============================================================================
  
  /**
   * POST /api/class/paladin/lay-on-hands
   * Use Lay on Hands to heal or cure disease
   */
  router.post('/paladin/lay-on-hands', authenticateAgent, (req, res) => {
    const userId = req.userId;
    const { targetId, hpToSpend, cureDisease } = req.body;
    
    // Get character
    const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(userId);
    if (!char) {
      return res.json({ success: false, error: 'Character not found' });
    }
    
    const character = buildCharacterSheet(char);
    
    // Validate paladin
    if (character.class?.toLowerCase() !== 'paladin') {
      return res.json({ success: false, error: 'Not a paladin' });
    }
    
    // Get target (self or ally)
    const target = targetId ? db.prepare('SELECT * FROM clawds WHERE id = ?').get(targetId) : char;
    if (!target) {
      return res.json({ success: false, error: 'Target not found' });
    }
    
    const targetSheet = buildCharacterSheet(target);
    
    // Use Lay on Hands
    const result = classFeatures.paladin.layOnHands(character, targetSheet, hpToSpend || 0, cureDisease || false);
    
    if (result.success) {
      // Update character's pool
      db.prepare('UPDATE clawds SET lay_on_hands_pool = ? WHERE id = ?')
        .run(character.layOnHandsPool, userId);
      
      // Update target HP if healed
      if (result.type === 'heal') {
        db.prepare('UPDATE clawds SET hp_current = ? WHERE id = ?')
          .run(targetSheet.hp_current, target.id);
      }
      
      // Remove conditions if cured
      if (result.type === 'cure') {
        // TODO: Implement condition removal from DB
      }
    }
    
    res.json(result);
  });
  
  /**
   * POST /api/class/paladin/divine-sense
   * Detect celestials, fiends, undead nearby
   */
  router.post('/paladin/divine-sense', authenticateAgent, (req, res) => {
    const userId = req.userId;
    
    const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(userId);
    if (!char) {
      return res.json({ success: false, error: 'Character not found' });
    }
    
    const character = buildCharacterSheet(char);
    
    // Get nearby creatures (in same zone)
    const nearbyCreatures = []; // TODO: Query monsters in same zone
    
    const result = classFeatures.paladin.divineSense(character, nearbyCreatures);
    
    if (result.success) {
      db.prepare('UPDATE clawds SET divine_sense_uses = ? WHERE id = ?')
        .run(character.divineSenseUses, userId);
    }
    
    res.json(result);
  });
  
  // ============================================================================
  // FIGHTER FEATURES
  // ============================================================================
  
  /**
   * POST /api/class/fighter/second-wind
   * Heal self as bonus action
   */
  router.post('/fighter/second-wind', authenticateAgent, (req, res) => {
    const userId = req.userId;
    
    const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(userId);
    if (!char) {
      return res.json({ success: false, error: 'Character not found' });
    }
    
    const character = buildCharacterSheet(char);
    
    const result = classFeatures.fighter.secondWind(character);
    
    if (result.success) {
      db.prepare('UPDATE clawds SET hp_current = ?, second_wind_available = 0 WHERE id = ?')
        .run(character.hp_current, userId);
    }
    
    res.json(result);
  });
  
  /**
   * POST /api/class/fighter/action-surge
   * Gain extra action this turn
   */
  router.post('/fighter/action-surge', authenticateAgent, (req, res) => {
    const userId = req.userId;
    
    const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(userId);
    if (!char) {
      return res.json({ success: false, error: 'Character not found' });
    }
    
    const character = buildCharacterSheet(char);
    
    const result = classFeatures.fighter.actionSurge(character);
    
    if (result.success) {
      db.prepare('UPDATE clawds SET action_surge_uses = ?, action_surge_active = 1 WHERE id = ?')
        .run(character.actionSurgeUses, userId);
    }
    
    res.json(result);
  });
  
  // ============================================================================
  // BARD FEATURES
  // ============================================================================
  
  /**
   * POST /api/class/bard/bardic-inspiration
   * Give inspiration die to an ally
   */
  router.post('/bard/bardic-inspiration', authenticateAgent, (req, res) => {
    const userId = req.userId;
    const { targetId } = req.body;
    
    if (!targetId) {
      return res.json({ success: false, error: 'Target ID required' });
    }
    
    const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(userId);
    if (!char) {
      return res.json({ success: false, error: 'Character not found' });
    }
    
    const character = buildCharacterSheet(char);
    
    const target = db.prepare('SELECT * FROM clawds WHERE id = ?').get(targetId);
    if (!target) {
      return res.json({ success: false, error: 'Target not found' });
    }
    
    const targetSheet = buildCharacterSheet(target);
    
    const result = classFeatures.bard.bardicInspiration(character, targetSheet);
    
    if (result.success) {
      db.prepare('UPDATE clawds SET bardic_inspiration_uses = ? WHERE id = ?')
        .run(character.bardicInspirationUses, userId);
      
      // TODO: Store inspiration on target character
    }
    
    res.json(result);
  });
  
  // ============================================================================
  // CLERIC FEATURES
  // ============================================================================
  
  /**
   * POST /api/class/cleric/turn-undead
   * Channel Divinity to turn undead
   */
  router.post('/cleric/turn-undead', authenticateAgent, (req, res) => {
    const userId = req.userId;
    
    const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(userId);
    if (!char) {
      return res.json({ success: false, error: 'Character not found' });
    }
    
    const character = buildCharacterSheet(char);
    
    // Get undead enemies in combat
    const undead = []; // TODO: Query undead from active encounter
    
    const result = classFeatures.cleric.turnUndead(character, undead);
    
    if (result.success) {
      db.prepare('UPDATE clawds SET channel_divinity_uses = ? WHERE id = ?')
        .run(character.channelDivinityUses, userId);
      
      // TODO: Apply turned condition to affected undead
    }
    
    res.json(result);
  });
  
  // ============================================================================
  // WIZARD FEATURES
  // ============================================================================
  
  /**
   * POST /api/class/wizard/arcane-recovery
   * Recover spell slots on short rest
   */
  router.post('/wizard/arcane-recovery', authenticateAgent, (req, res) => {
    const userId = req.userId;
    const { slots } = req.body; // { 1: 2, 2: 1 } = recover 2 level 1 + 1 level 2
    
    const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(userId);
    if (!char) {
      return res.json({ success: false, error: 'Character not found' });
    }
    
    const character = buildCharacterSheet(char);
    
    if (!slots) {
      // First call: return available options
      const result = classFeatures.wizard.arcaneRecovery(character);
      return res.json(result);
    }
    
    // Apply recovery with chosen slots
    const result = classFeatures.wizard.applyArcaneRecovery(character, slots);
    
    if (result.success) {
      db.prepare('UPDATE clawds SET arcane_recovery_used = 1 WHERE id = ?')
        .run(userId);
      
      // TODO: Update spell slots in DB
    }
    
    res.json(result);
  });
  
  // ============================================================================
  // WARLOCK FEATURES
  // ============================================================================
  
  /**
   * POST /api/class/warlock/choose-invocation
   * Choose an Eldritch Invocation at level up
   */
  router.post('/warlock/choose-invocation', authenticateAgent, (req, res) => {
    const userId = req.userId;
    const { invocation } = req.body;
    
    if (!invocation) {
      // Return available invocations
      return res.json({
        success: true,
        available: Object.keys(classFeatures.warlock.ELDRITCH_INVOCATIONS)
      });
    }
    
    // TODO: Store invocation choice in DB
    res.json({ success: true, invocation });
  });
  
  /**
   * POST /api/class/warlock/choose-pact
   * Choose Pact Boon at level 3
   */
  router.post('/warlock/choose-pact', authenticateAgent, (req, res) => {
    const userId = req.userId;
    const { pact } = req.body;
    
    if (!pact) {
      // Return available pacts
      return res.json({
        success: true,
        available: Object.keys(classFeatures.warlock.PACT_BOONS)
      });
    }
    
    const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(userId);
    if (!char) {
      return res.json({ success: false, error: 'Character not found' });
    }
    
    const character = buildCharacterSheet(char);
    
    const result = classFeatures.warlock.choosePactBoon(character, pact);
    
    if (result.success) {
      db.prepare('UPDATE clawds SET pact_boon = ? WHERE id = ?')
        .run(pact, userId);
    }
    
    res.json(result);
  });
  
  // ============================================================================
  // ROGUE FEATURES (Expertise choice)
  // ============================================================================
  
  /**
   * POST /api/class/rogue/choose-expertise
   * Choose skills for Expertise
   */
  router.post('/rogue/choose-expertise', authenticateAgent, (req, res) => {
    const userId = req.userId;
    const { skills } = req.body; // Array of skill names
    
    const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(userId);
    if (!char) {
      return res.json({ success: false, error: 'Character not found' });
    }
    
    const character = buildCharacterSheet(char);
    
    const info = classFeatures.rogue.initExpertise(character);
    
    if (!skills) {
      return res.json({
        success: true,
        ...info
      });
    }
    
    // Validate and store
    if (skills.length > info.numChoices) {
      return res.json({ 
        success: false, 
        error: `Can only choose ${info.numChoices} skills` 
      });
    }
    
    // TODO: Store expertise choices in DB
    
    res.json({ 
      success: true, 
      expertise: skills 
    });
  });
  
  return router;
}

module.exports = createClassFeatureRoutes;
