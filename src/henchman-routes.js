/**
 * Clawds & Caverns - Henchman API Routes
 * 
 * Gacha pulls, roster management, and revival!
 */

const express = require('express');
const { HenchmanManager, PULL_RATES, PULL_COSTS, REVIVAL_OPTIONS, STAR_BONUSES, MAX_STARS, HENCHMAN_POOL } = require('./henchmen');
const { CharacterManager } = require('./character');
const { AwakenedAbilityManager, AWAKENED_ABILITIES } = require('./awakened-abilities');

function createHenchmanRoutes(db, authenticateAgent) {
  const router = express.Router();
  const henchmen = new HenchmanManager(db);
  const characters = new CharacterManager(db);
  const awakened = new AwakenedAbilityManager(db);
  
  // Helper to get character from authenticated agent
  const getChar = (req) => characters.getCharacterByAgent(req.user?.id);
  
  // Helper to get henchman template
  const getTemplate = (henchmanId) => {
    for (const pool of Object.values(HENCHMAN_POOL)) {
      const found = pool.find(h => h.id === henchmanId);
      if (found) return found;
    }
    return null;
  };
  
  /**
   * GET /api/henchmen - Get gacha info (public) or your roster (authenticated)
   */
  router.get('/', (req, res) => {
    // Public info endpoint
    res.json({
      success: true,
      info: {
        description: 'Hire henchmen to fight alongside you!',
        pullCosts: PULL_COSTS,
        rates: PULL_RATES,
        revival: {
          resurrection: `${REVIVAL_OPTIONS.resurrection.cost} pearls`,
          autoRevive: `${REVIVAL_OPTIONS.autoRevive.hours} hours`,
          dupeStarUp: 'Instant revive on star level up'
        },
        starSystem: STAR_BONUSES,
        maxStars: MAX_STARS,
        notTradable: true
      },
      endpoints: {
        'GET /': 'This info',
        'GET /roster': 'Your henchmen (requires auth)',
        'POST /pull': 'Pull a henchman (requires auth)',
        'POST /resurrect': 'Resurrect dead henchman for 300 pearls',
        'POST /party/set': 'Set active party member',
        'POST /party/dismiss': 'Dismiss party member',
        'GET /party': 'Get current party member'
      }
    });
  });
  
  /**
   * GET /api/henchmen/roster - Get your henchmen
   */
  router.get('/roster', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found. Create one first!' });
    }
    
    // Check auto-revives
    const revived = henchmen.checkAutoRevives(char.id);
    
    const roster = henchmen.getOwnedHenchmen(char.id, true);
    const party = henchmen.getPartyMember(char.id);
    
    res.json({
      success: true,
      character: { name: char.name, pearls: char.pearls },
      pullCosts: PULL_COSTS,
      count: roster.length,
      roster: roster.map(h => ({
        instanceId: h.instanceId,
        name: h.customName || h.name,
        species: h.species,
        class: h.class,
        rarity: h.rarity,
        description: h.description,
        personality: h.personality,
        level: h.level,
        xp: h.xp,
        stars: h.stars,
        starBonus: h.starBonus,
        dupeCount: h.dupeCount,
        dupesToNextStar: h.dupesToNextStar,
        isMaxStars: h.isMaxStars,
        skillPoints: h.skillPoints,
        status: h.status,
        hpCurrent: h.hpCurrent,
        hpMax: h.hpMax,
        kills: h.kills,
        specialAbility: h.specialAbility,
        awakenedAbility: h.activeAwakenedAbility,
        recruitedAt: h.recruitedAt,
        inParty: party?.instanceId === h.instanceId,
        reviveTimer: h.status === 'dead' ? henchmen.getReviveTimer(h.instanceId) : null
      })),
      autoRevived: revived.length > 0 ? revived : undefined
    });
  });
  
  /**
   * POST /api/henchmen/pull - Pull a henchman!
   */
  router.post('/pull', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found. Create one first!' });
    }
    
    const { paymentType = 'pearl' } = req.body;
    
    if (paymentType !== 'pearl' && paymentType !== 'usdc') {
      return res.status(400).json({ success: false, error: 'Invalid payment type. Use "pearl" or "usdc"' });
    }
    
    // Check payment
    if (paymentType === 'pearl') {
      if (char.pearls < PULL_COSTS.pearl) {
        return res.status(400).json({ 
          success: false, 
          error: `Not enough pearls. Need ${PULL_COSTS.pearl}, have ${char.pearls}` 
        });
      }
      // Deduct pearls
      db.prepare('UPDATE clawds SET pearls = pearls - ? WHERE id = ?')
        .run(PULL_COSTS.pearl, char.id);
    } else {
      // USDC payment - would integrate with Solana in production
      console.log(`[HENCHMAN] USDC pull requested by ${char.name}: $${PULL_COSTS.usdc}`);
      return res.status(400).json({ 
        success: false, 
        error: 'USDC payments coming soon! Use pearls for now.' 
      });
    }
    
    // DO THE PULL!
    const result = henchmen.pullHenchman(char.id, paymentType);
    
    if (!result.success) {
      // Refund on error
      db.prepare('UPDATE clawds SET pearls = pearls + ? WHERE id = ?')
        .run(PULL_COSTS.pearl, char.id);
      return res.status(500).json(result);
    }
    
    // Get updated pearl count
    const updatedChar = db.prepare('SELECT pearls FROM clawds WHERE id = ?').get(char.id);
    
    // Build response
    const response = {
      success: true,
      pull: {
        rarity: result.henchman.rarity,
        name: result.henchman.name,
        species: result.henchman.species,
        class: result.henchman.class,
        description: result.henchman.description,
        personality: result.henchman.personality,
        specialAbility: result.henchman.specialAbility,
        quote: result.henchman.quote,
        lore: result.henchman.lore
      },
      isDuplicate: result.isDuplicate,
      stars: result.stars,
      skillPoints: result.skillPoints,
      dupesToNextStar: result.dupesToNextStar,
      cost: PULL_COSTS[paymentType],
      pearlsRemaining: updatedChar.pearls,
      rates: result.rarityOdds
    };
    
    // Add star up info if applicable
    if (result.starUp) {
      response.starUp = {
        message: `⭐ STAR UP! ${result.starUp.from}★ → ${result.starUp.to}★`,
        bonus: result.starUp.bonusDescription,
        skillPointsGained: result.starUp.skillPointsGained
      };
      
      if (result.starUp.awakenedAbility) {
        response.starUp.awakened = {
          message: '🌟 AWAKENED!',
          ability: result.starUp.awakenedAbility
        };
      }
      
      if (result.starUp.revived) {
        response.starUp.revived = '💀→✨ Henchman revived from the dead!';
      }
    }
    
    res.json(response);
  });
  
  /**
   * POST /api/henchmen/resurrect - Resurrect a dead henchman
   */
  router.post('/resurrect', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found. Create one first!' });
    }
    
    const { instanceId } = req.body;
    if (!instanceId) {
      return res.status(400).json({ success: false, error: 'instanceId required' });
    }
    
    const result = henchmen.resurrectHenchman(char.id, instanceId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Get updated pearl count
    const updatedChar = db.prepare('SELECT pearls FROM clawds WHERE id = ?').get(char.id);
    
    res.json({
      ...result,
      pearlsRemaining: updatedChar.pearls
    });
  });
  
  /**
   * GET /api/henchmen/party - Get current party member
   */
  router.get('/party', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found. Create one first!' });
    }
    
    const party = henchmen.getPartyMember(char.id);
    
    if (!party) {
      return res.json({
        success: true,
        partyMember: null,
        message: 'No active party member. Use POST /party/set to add one!'
      });
    }
    
    res.json({
      success: true,
      partyMember: {
        instanceId: party.instanceId,
        name: party.customName || party.name,
        species: party.species,
        class: party.class,
        rarity: party.rarity,
        description: party.description,
        personality: party.personality,
        level: party.level,
        stars: party.stars,
        hpCurrent: party.hpCurrent,
        hpMax: party.hpMax,
        specialAbility: party.specialAbility,
        awakenedAbility: party.activeAwakenedAbility,
        kills: party.kills
      }
    });
  });
  
  /**
   * POST /api/henchmen/party/set - Set active party member
   */
  router.post('/party/set', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found. Create one first!' });
    }
    
    const { instanceId } = req.body;
    if (!instanceId) {
      return res.status(400).json({ success: false, error: 'instanceId required' });
    }
    
    const result = henchmen.setPartyMember(char.id, instanceId);
    res.json(result);
  });
  
  /**
   * POST /api/henchmen/party/dismiss - Dismiss party member
   */
  router.post('/party/dismiss', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found. Create one first!' });
    }
    
    const result = henchmen.dismissPartyMember(char.id);
    res.json(result);
  });
  
  // ============================================================================
  // AWAKENED ABILITIES
  // ============================================================================
  
  /**
   * GET /api/henchmen/awakened - List all awakened abilities
   */
  router.get('/awakened', (req, res) => {
    const abilities = {};
    
    for (const [rarity, pool] of Object.entries(HENCHMAN_POOL)) {
      abilities[rarity] = pool.map(h => ({
        henchmanId: h.id,
        name: h.name,
        species: h.species,
        awakened: h.awakenedAbility || AWAKENED_ABILITIES[h.id] || null
      })).filter(a => a.awakened);
    }
    
    res.json({
      success: true,
      description: '5-Star henchmen unlock powerful awakened abilities! All require long rest to recharge.',
      abilities
    });
  });
  
  /**
   * GET /api/henchmen/:instanceId/awakened - Get awakened ability for a specific henchman
   */
  router.get('/:instanceId/awakened', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found.' });
    }
    
    const { instanceId } = req.params;
    
    // Get henchman instance
    const instance = db.prepare(
      'SELECT * FROM character_henchmen WHERE id = ? AND character_id = ?'
    ).get(instanceId, char.id);
    
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Henchman not found in your roster.' });
    }
    
    const template = getTemplate(instance.henchman_id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Henchman template not found.' });
    }
    
    const ability = template.awakenedAbility || AWAKENED_ABILITIES[instance.henchman_id];
    
    if (!ability) {
      return res.json({
        success: true,
        henchman: template.name,
        stars: instance.stars,
        awakened: null,
        message: 'This henchman has no awakened ability defined.'
      });
    }
    
    const isUnlocked = instance.stars >= 5;
    const isAvailable = isUnlocked && awakened.isAbilityAvailable(instanceId, instance.henchman_id);
    
    // Get active summons if any
    const activeSummons = awakened.getActiveSummons(instanceId);
    
    res.json({
      success: true,
      henchman: {
        name: template.name,
        instanceId: instanceId,
        stars: instance.stars,
        starsNeeded: isUnlocked ? 0 : 5 - instance.stars
      },
      awakened: {
        ...ability,
        unlocked: isUnlocked,
        available: isAvailable,
        message: !isUnlocked 
          ? `Reach 5 stars to unlock! (Currently ${instance.stars}★)`
          : isAvailable 
            ? 'Ready to use!'
            : 'Already used. Requires long rest to recharge.'
      },
      activeSummons: activeSummons.length > 0 ? activeSummons : undefined
    });
  });
  
  /**
   * POST /api/henchmen/:instanceId/awakened/use - Use awakened ability
   */
  router.post('/:instanceId/awakened/use', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found.' });
    }
    
    const { instanceId } = req.params;
    
    // Get henchman instance
    const instance = db.prepare(
      'SELECT * FROM character_henchmen WHERE id = ? AND character_id = ?'
    ).get(instanceId, char.id);
    
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Henchman not found in your roster.' });
    }
    
    if (instance.status !== 'alive') {
      return res.status(400).json({ success: false, error: 'Cannot use ability - henchman is dead!' });
    }
    
    if (instance.stars < 5) {
      return res.status(400).json({ 
        success: false, 
        error: `Awakened ability locked! Need 5★, currently ${instance.stars}★` 
      });
    }
    
    const template = getTemplate(instance.henchman_id);
    const ability = template?.awakenedAbility || AWAKENED_ABILITIES[instance.henchman_id];
    
    if (!ability) {
      return res.status(400).json({ success: false, error: 'No awakened ability defined.' });
    }
    
    // Try to use the ability
    const result = awakened.useAbility(instanceId, instance.henchman_id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Handle summons if ability has one
    let summonResult = null;
    if (ability.summon) {
      const duration = ability.summon.duration || 3;
      summonResult = awakened.createSummon(instanceId, ability.summon, 
        typeof duration === 'number' ? duration : 10);
    }
    
    res.json({
      success: true,
      henchman: template.name,
      ability: {
        name: ability.name,
        description: ability.description,
        effect: AWAKENED_ABILITIES[instance.henchman_id]?.effect || ability.description
      },
      quote: ability.quote || result.quote,
      summon: summonResult,
      message: `🌟 ${template.name} uses ${ability.name}!`,
      rechargeOn: 'long rest'
    });
  });
  
  /**
   * POST /api/henchmen/:instanceId/long-rest - Recharge awakened ability
   */
  router.post('/:instanceId/long-rest', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found.' });
    }
    
    const { instanceId } = req.params;
    
    // Verify ownership
    const instance = db.prepare(
      'SELECT * FROM character_henchmen WHERE id = ? AND character_id = ?'
    ).get(instanceId, char.id);
    
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Henchman not found in your roster.' });
    }
    
    // Long rest - recharge ability and heal
    const result = awakened.longRest(instanceId);
    
    // Also heal the henchman to full
    db.prepare('UPDATE character_henchmen SET hp_current = hp_max WHERE id = ?').run(instanceId);
    
    const template = getTemplate(instance.henchman_id);
    
    res.json({
      success: true,
      henchman: template?.name || 'Henchman',
      message: `${template?.name} takes a long rest. HP restored, awakened ability recharged!`,
      hp: 'Full',
      awakenedAbility: instance.stars >= 5 ? 'Recharged!' : 'Locked (need 5★)'
    });
  });
  
  /**
   * GET /api/henchmen/:instanceId/summons - Get active summons
   */
  router.get('/:instanceId/summons', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found.' });
    }
    
    const { instanceId } = req.params;
    
    // Verify ownership
    const instance = db.prepare(
      'SELECT * FROM character_henchmen WHERE id = ? AND character_id = ?'
    ).get(instanceId, char.id);
    
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Henchman not found.' });
    }
    
    const summons = awakened.getActiveSummons(instanceId);
    const template = getTemplate(instance.henchman_id);
    
    res.json({
      success: true,
      henchman: template?.name,
      activeSummons: summons.map(s => ({
        id: s.id,
        name: s.summon_name,
        hp: `${s.hp_current}/${s.hp_max}`,
        roundsRemaining: s.rounds_remaining,
        summonedAt: s.summoned_at
      })),
      count: summons.length
    });
  });
  
  /**
   * POST /api/henchmen/:instanceId/summons/:summonId/damage - Damage a summon
   */
  router.post('/:instanceId/summons/:summonId/damage', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found.' });
    }
    
    const { instanceId, summonId } = req.params;
    const { damage } = req.body;
    
    if (!damage || damage < 0) {
      return res.status(400).json({ success: false, error: 'Invalid damage amount.' });
    }
    
    // Get summon
    const summon = db.prepare(
      'SELECT * FROM active_summons WHERE id = ? AND henchman_instance_id = ?'
    ).get(summonId, instanceId);
    
    if (!summon) {
      return res.status(404).json({ success: false, error: 'Summon not found.' });
    }
    
    const newHp = Math.max(0, summon.hp_current - damage);
    
    if (newHp <= 0) {
      // Summon dies
      db.prepare('DELETE FROM active_summons WHERE id = ?').run(summonId);
      
      return res.json({
        success: true,
        summon: summon.summon_name,
        damage,
        hp: 0,
        status: 'destroyed',
        message: `${summon.summon_name} is destroyed!`
      });
    }
    
    // Update HP
    db.prepare('UPDATE active_summons SET hp_current = ? WHERE id = ?').run(newHp, summonId);
    
    res.json({
      success: true,
      summon: summon.summon_name,
      damage,
      hp: `${newHp}/${summon.hp_max}`,
      status: 'alive'
    });
  });
  
  /**
   * POST /api/henchmen/:instanceId/summons/tick - Tick summon durations (end of round)
   */
  router.post('/:instanceId/summons/tick', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found.' });
    }
    
    const { instanceId } = req.params;
    
    const expired = awakened.tickSummons(instanceId);
    const remaining = awakened.getActiveSummons(instanceId);
    
    res.json({
      success: true,
      expired: expired.map(s => ({
        name: s.summon_name,
        message: `${s.summon_name} fades away...`
      })),
      remaining: remaining.map(s => ({
        name: s.summon_name,
        roundsRemaining: s.rounds_remaining,
        hp: `${s.hp_current}/${s.hp_max}`
      }))
    });
  });
  
  return router;
}

module.exports = { createHenchmanRoutes };
