/**
 * Death Saving Throws System
 * 5e-compliant death save mechanics
 */

/**
 * Initialize death saves when character reaches 0 HP
 */
function initDeathSaves(character) {
  character.deathSaves = {
    successes: 0,
    failures: 0,
    stabilized: false
  };
  character.unconscious = true;
  return character.deathSaves;
}

/**
 * Roll a death saving throw
 * Returns: { success: boolean, natural: number, result: string, dead: boolean, revived: boolean }
 */
function rollDeathSave(character) {
  if (!character.deathSaves) {
    initDeathSaves(character);
  }

  const roll = Math.floor(Math.random() * 20) + 1;
  let result = {
    natural: roll,
    success: false,
    dead: false,
    revived: false,
    stabilized: false,
    result: ''
  };

  // Natural 20 - restore 1 HP and regain consciousness
  if (roll === 20) {
    character.hp = 1;
    character.unconscious = false;
    character.deathSaves = null;
    result.success = true;
    result.revived = true;
    result.result = 'Natural 20! You regain 1 HP and consciousness!';
    return result;
  }

  // Natural 1 - two failures
  if (roll === 1) {
    character.deathSaves.failures += 2;
    result.success = false;
    result.result = 'Natural 1! Two death save failures!';
    
    if (character.deathSaves.failures >= 3) {
      result.dead = true;
      result.result += ' You have died!';
    }
    return result;
  }

  // Success on 10+
  if (roll >= 10) {
    character.deathSaves.successes++;
    result.success = true;
    result.result = `Death save success (${character.deathSaves.successes}/3)`;

    // Three successes = stabilized
    if (character.deathSaves.successes >= 3) {
      character.deathSaves.stabilized = true;
      character.unconscious = true; // Still unconscious, just not dying
      result.stabilized = true;
      result.result += ' - You are stabilized!';
    }
    return result;
  }

  // Failure on <10
  character.deathSaves.failures++;
  result.success = false;
  result.result = `Death save failure (${character.deathSaves.failures}/3)`;

  if (character.deathSaves.failures >= 3) {
    result.dead = true;
    result.result += ' - You have died!';
  }

  return result;
}

/**
 * Apply damage to character at 0 HP (adds death save failures)
 */
function damageAtZeroHP(character, damage, isCritical = false) {
  if (!character.deathSaves) {
    initDeathSaves(character);
  }

  const failures = isCritical ? 2 : 1;
  character.deathSaves.failures += failures;

  const result = {
    failures,
    totalFailures: character.deathSaves.failures,
    dead: character.deathSaves.failures >= 3,
    message: isCritical 
      ? `Critical hit while unconscious! ${failures} death save failures!`
      : `Hit while unconscious! ${failures} death save failure!`
  };

  if (result.dead) {
    result.message += ' You have died!';
  }

  return result;
}

/**
 * Heal character at 0 HP (restores consciousness)
 */
function healFromZeroHP(character, healAmount) {
  character.hp = healAmount;
  character.unconscious = false;
  character.deathSaves = null;

  return {
    healed: true,
    hp: character.hp,
    message: `You regain ${healAmount} HP and consciousness!`
  };
}

/**
 * Stabilize a dying character (Medicine check, spare the dying spell, etc.)
 */
function stabilize(character) {
  if (!character.deathSaves) {
    return { success: false, message: 'Character is not dying' };
  }

  character.deathSaves.stabilized = true;
  character.unconscious = true; // Still unconscious, just not dying

  return {
    success: true,
    stabilized: true,
    message: 'Character is stabilized but unconscious'
  };
}

/**
 * Reset death saves at start of turn (if stabilized)
 */
function resetDeathSaves(character) {
  if (character.deathSaves?.stabilized) {
    // Stabilized characters don't make death saves
    return { stabilized: true };
  }
  return { needsRoll: character.hp <= 0 && !character.deathSaves?.stabilized };
}

/**
 * Check if character needs to make death saves
 */
function needsDeathSave(character) {
  return character.hp <= 0 && 
         character.deathSaves && 
         !character.deathSaves.stabilized &&
         character.deathSaves.failures < 3;
}

module.exports = {
  initDeathSaves,
  rollDeathSave,
  damageAtZeroHP,
  healFromZeroHP,
  stabilize,
  resetDeathSaves,
  needsDeathSave
};
