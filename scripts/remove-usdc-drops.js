#!/usr/bin/env node
/**
 * Remove USDC Drops from Monsters
 * Ensures monsters only drop materials, not direct USDC
 */

const fs = require('fs');
const path = require('path');

console.log('🐉 Removing USDC drops from monsters...\n');

// Files that might contain USDC drop logic
const FILES_TO_CHECK = [
  'src/encounters.js',
  'src/monsters.js', 
  'src/combat.js',
  'src/encounter-routes.js'
];

const USDC_PATTERNS = [
  /usdc.*drop/gi,
  /drop.*usdc/gi, 
  /currency.*usdc/gi,
  /usdc.*reward/gi,
  /reward.*usdc/gi,
  /pearl.*drop/gi, // Legacy currency
  /drop.*pearl/gi,
  /coins.*drop/gi
];

function scanFileForUSDC(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${filePath} not found, skipping`);
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const matches = [];
    
    lines.forEach((line, index) => {
      for (const pattern of USDC_PATTERNS) {
        if (pattern.test(line)) {
          matches.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source
          });
        }
      }
    });
    
    return matches;
  } catch (err) {
    console.error(`❌ Error reading ${filePath}:`, err.message);
    return [];
  }
}

function createMaterialOnlyDrops() {
  const materialDropsCode = `
// MATERIALS-ONLY ECONOMY
// Monsters drop materials, NPCs buy materials with bank-funded USDC

const MATERIAL_DROP_RATES = {
  easy: { 
    dropChance: 0.7, 
    materials: ['kelp_fronds', 'sea_salt', 'small_pearls'],
    quantities: [1, 2]
  },
  normal: { 
    dropChance: 0.8, 
    materials: ['kelp_fronds', 'sea_salt', 'small_pearls', 'coral_shards', 'fish_scales'],
    quantities: [1, 3] 
  },
  hard: { 
    dropChance: 0.85, 
    materials: ['coral_shards', 'fish_scales', 'sea_glass', 'barnacle_shells'],
    quantities: [2, 4]
  },
  elite: { 
    dropChance: 0.9, 
    materials: ['sea_glass', 'barnacle_shells', 'kraken_ink', 'deep_crystals'], 
    quantities: [2, 5]
  },
  boss: { 
    dropChance: 0.95, 
    materials: ['deep_crystals', 'leviathan_scales', 'abyssal_stones'],
    quantities: [3, 8]
  }
};

function generateMaterialDrops(monsterTier, playerLevel = 1) {
  const tier = MATERIAL_DROP_RATES[monsterTier] || MATERIAL_DROP_RATES.normal;
  const drops = [];
  
  if (Math.random() < tier.dropChance) {
    const numDrops = Math.floor(Math.random() * 3) + 1; // 1-3 different materials
    
    for (let i = 0; i < numDrops; i++) {
      const material = tier.materials[Math.floor(Math.random() * tier.materials.length)];
      const quantity = Math.floor(Math.random() * (tier.quantities[1] - tier.quantities[0] + 1)) + tier.quantities[0];
      
      drops.push({ material, quantity });
    }
  }
  
  return drops;
}

// NO USDC DROPS - ALL INCOME FLOWS THROUGH MATERIAL SALES TO NPCS
// Example usage:
// const drops = generateMaterialDrops('normal', characterLevel);
// // drops = [{ material: 'coral_shards', quantity: 2 }, { material: 'kelp_fronds', quantity: 1 }]
`;

  fs.writeFileSync(path.join(__dirname, '..', 'src', 'material-drops-only.js'), materialDropsCode);
  console.log('✅ Created material-only drops system');
}

// Scan all relevant files
console.log('🔍 Scanning files for USDC drop patterns...\n');

let totalMatches = 0;

for (const file of FILES_TO_CHECK) {
  const filePath = path.join(__dirname, '..', file);
  const matches = scanFileForUSDC(filePath);
  
  if (matches.length > 0) {
    console.log(`📁 ${file}:`);
    matches.forEach(match => {
      console.log(`  Line ${match.line}: ${match.content}`);
      totalMatches++;
    });
    console.log('');
  } else {
    console.log(`✅ ${file}: No USDC drops found`);
  }
}

if (totalMatches > 0) {
  console.log(`\n⚠️  Found ${totalMatches} potential USDC drop references`);
  console.log('📝 Manual review required for these lines');
  console.log('🎯 Replace with material-only drop logic\n');
} else {
  console.log('\n✅ No USDC drops found in monster files!\n');
}

// Create the new material-only system
console.log('🛠️  Creating materials-only drop system...');
createMaterialOnlyDrops();

console.log('\n📋 MONSTER DROP CHANGES NEEDED:');
console.log('  • Remove all USDC/currency drops');
console.log('  • Replace with material drops only'); 
console.log('  • Materials sold to NPCs for USDC');
console.log('  • NPCs funded by bank emissions');
console.log('  • Sustainable micro-economy');

console.log('\n🎉 Monster economy audit complete!');

// Quick database check for any existing USDC drops in encounters
console.log('\n🗄️  Checking database for encounter USDC drops...');

try {
  const db = require('../src/db');
  
  // Check encounter rewards
  const encounterRewards = db.prepare(`
    SELECT * FROM encounters 
    WHERE rewards LIKE '%usdc%' OR rewards LIKE '%pearl%'
  `).all();
  
  if (encounterRewards.length > 0) {
    console.log(`⚠️  Found ${encounterRewards.length} encounters with USDC rewards`);
    encounterRewards.forEach(enc => {
      console.log(`  • ${enc.name}: ${enc.rewards}`);
    });
  } else {
    console.log('✅ No USDC rewards found in encounters table');
  }
  
  db.close();
} catch (err) {
  console.log('ℹ️  Could not check database (may not exist yet)');
}