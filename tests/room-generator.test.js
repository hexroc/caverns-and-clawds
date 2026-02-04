/**
 * Clawds & Caverns - Room Generator Tests
 * 
 * Tests for the procedural room generation system.
 * Run with: node tests/room-generator.test.js
 */

const { SeededRandom, RoomGenerator, ZoneManager } = require('../src/room-generator');
const { ZONE_TEMPLATES, SPECIAL_ROOMS, ROOM_NAMES } = require('../src/room-templates');

// Simple test framework
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// ============================================================================
// SEEDED RANDOM TESTS
// ============================================================================

console.log('\n🎲 Testing SeededRandom...\n');

test('SeededRandom produces consistent results with same seed', () => {
  const rng1 = new SeededRandom('test_seed');
  const rng2 = new SeededRandom('test_seed');
  
  const values1 = [rng1.next(), rng1.next(), rng1.next()];
  const values2 = [rng2.next(), rng2.next(), rng2.next()];
  
  assertEqual(values1[0], values2[0], 'First value mismatch');
  assertEqual(values1[1], values2[1], 'Second value mismatch');
  assertEqual(values1[2], values2[2], 'Third value mismatch');
});

test('SeededRandom produces different results with different seeds', () => {
  const rng1 = new SeededRandom('seed_a');
  const rng2 = new SeededRandom('seed_b');
  
  const val1 = rng1.next();
  const val2 = rng2.next();
  
  assert(val1 !== val2, 'Different seeds should produce different values');
});

test('SeededRandom.nextInt produces values in range', () => {
  const rng = new SeededRandom('range_test');
  
  for (let i = 0; i < 100; i++) {
    const val = rng.nextInt(1, 10);
    assert(val >= 1 && val <= 10, `Value ${val} out of range [1, 10]`);
  }
});

test('SeededRandom.pick returns array elements', () => {
  const rng = new SeededRandom('pick_test');
  const arr = ['a', 'b', 'c', 'd', 'e'];
  
  for (let i = 0; i < 20; i++) {
    const val = rng.pick(arr);
    assert(arr.includes(val), `Picked value "${val}" not in array`);
  }
});

test('SeededRandom.pickWeighted respects weights', () => {
  const rng = new SeededRandom('weight_test');
  const items = [
    { id: 'heavy', weight: 100 },
    { id: 'light', weight: 1 },
  ];
  
  let heavyCount = 0;
  for (let i = 0; i < 100; i++) {
    if (rng.pickWeighted(items).id === 'heavy') heavyCount++;
  }
  
  assert(heavyCount > 80, `Heavy item should be picked most of the time (${heavyCount}/100)`);
});

// ============================================================================
// ROOM GENERATOR TESTS
// ============================================================================

console.log('\n🏠 Testing RoomGenerator...\n');

const generator = new RoomGenerator();

test('generateRoom produces valid room structure', () => {
  const room = generator.generateRoom('kelp_forest', 3, 'test_seed', 0);
  
  assert(room.id, 'Room should have id');
  assert(room.name, 'Room should have name');
  assert(room.description, 'Room should have description');
  assert(room.zone === 'kelp_forest', 'Room should have correct zone');
  assertEqual(room.level, 3, 'Room should have correct level');
  assert(Array.isArray(room.features), 'Room should have features array');
  assert(Array.isArray(room.hazards), 'Room should have hazards array');
  assert(typeof room.exits === 'object', 'Room should have exits object');
});

test('generateRoom with same seed produces identical room', () => {
  const room1 = generator.generateRoom('kelp_forest', 3, 'consistent_seed', 5);
  const room2 = generator.generateRoom('kelp_forest', 3, 'consistent_seed', 5);
  
  assertEqual(room1.id, room2.id, 'IDs should match');
  assertEqual(room1.name, room2.name, 'Names should match');
  assertEqual(room1.description, room2.description, 'Descriptions should match');
  assertEqual(room1.roomType, room2.roomType, 'Room types should match');
  assertEqual(room1.features.length, room2.features.length, 'Feature counts should match');
});

test('generateRoom with different seeds produces different rooms', () => {
  const room1 = generator.generateRoom('kelp_forest', 3, 'seed_x', 0);
  const room2 = generator.generateRoom('kelp_forest', 3, 'seed_y', 0);
  
  assert(room1.id !== room2.id, 'IDs should differ');
  // Names might occasionally match by chance, but descriptions shouldn't
  assert(room1.description !== room2.description || room1.name !== room2.name, 
    'Rooms should have different content');
});

test('generateRoom respects zone template', () => {
  const room = generator.generateRoom('abyss', 10, 'abyss_test', 0);
  
  assertEqual(room.zone, 'abyss', 'Zone should be abyss');
  assertEqual(room.visibility, 'none', 'Abyss should have no visibility');
  assertEqual(room.theme, 'alien', 'Abyss should have alien theme');
});

// ============================================================================
// ZONE GENERATION TESTS
// ============================================================================

console.log('\n🗺️ Testing Zone Generation...\n');

test('generateZone creates correct number of rooms', () => {
  const zone = generator.generateZone('kelp_forest', 100, 'count_test');
  
  const roomCount = Object.keys(zone.rooms).length;
  // Should be 100 + special rooms (kelp_heart, fishermans_grotto, eels_den)
  assert(roomCount >= 100, `Should have at least 100 rooms, got ${roomCount}`);
  assert(roomCount <= 110, `Should have at most 110 rooms (with specials), got ${roomCount}`);
});

test('generateZone creates entry room', () => {
  const zone = generator.generateZone('kelp_forest', 50, 'entry_test');
  
  assert(zone.entryRoomId, 'Zone should have entry room ID');
  assert(zone.rooms[zone.entryRoomId], 'Entry room should exist');
  assert(zone.rooms[zone.entryRoomId].isEntry, 'Entry room should be marked as entry');
});

test('generateZone creates bidirectional exits', () => {
  const zone = generator.generateZone('kelp_forest', 50, 'bidir_test');
  
  let violations = 0;
  const opposites = {
    north: 'south', south: 'north',
    east: 'west', west: 'east',
    up: 'down', down: 'up',
  };
  
  for (const room of Object.values(zone.rooms)) {
    for (const [direction, targetId] of Object.entries(room.exits)) {
      const targetRoom = zone.rooms[targetId];
      if (!targetRoom) continue;
      
      const opposite = opposites[direction];
      if (opposite) {
        // Check if target has return exit
        const hasReturn = Object.entries(targetRoom.exits).some(
          ([dir, id]) => id === room.id
        );
        if (!hasReturn) {
          violations++;
        }
      }
    }
  }
  
  assertEqual(violations, 0, `Found ${violations} one-way exits`);
});

test('generateZone produces consistent results with same seed', () => {
  const zone1 = generator.generateZone('kelp_forest', 25, 'consistent_zone');
  const zone2 = generator.generateZone('kelp_forest', 25, 'consistent_zone');
  
  assertEqual(zone1.id, zone2.id, 'Zone IDs should match');
  assertEqual(zone1.entryRoomId, zone2.entryRoomId, 'Entry room IDs should match');
  
  const rooms1 = Object.keys(zone1.rooms).sort();
  const rooms2 = Object.keys(zone2.rooms).sort();
  
  assertEqual(rooms1.length, rooms2.length, 'Room counts should match');
  assertEqual(rooms1.join(','), rooms2.join(','), 'Room IDs should match');
});

test('generateZone includes special rooms', () => {
  const zone = generator.generateZone('kelp_forest', 100, 'special_test');
  
  const specialRooms = Object.values(zone.rooms).filter(r => r.isSpecial);
  assert(specialRooms.length > 0, 'Zone should have special rooms');
  
  const specialIds = specialRooms.map(r => r.id);
  assert(specialIds.some(id => id.includes('kelp_heart')), 'Should have Kelp Heart');
  assert(specialIds.some(id => id.includes('fishermans_grotto')), 'Should have Fisherman\'s Grotto');
  assert(specialIds.some(id => id.includes('eels_den')), 'Should have Eel\'s Den');
});

test('generateZone all rooms are reachable from entry', () => {
  const zone = generator.generateZone('kelp_forest', 50, 'reachable_test');
  
  // BFS from entry
  const visited = new Set();
  const queue = [zone.entryRoomId];
  
  while (queue.length > 0) {
    const roomId = queue.shift();
    if (visited.has(roomId)) continue;
    visited.add(roomId);
    
    const room = zone.rooms[roomId];
    if (!room) continue;
    
    for (const targetId of Object.values(room.exits)) {
      if (!visited.has(targetId)) {
        queue.push(targetId);
      }
    }
  }
  
  const totalRooms = Object.keys(zone.rooms).length;
  assertEqual(visited.size, totalRooms, 
    `Only ${visited.size}/${totalRooms} rooms reachable from entry`);
});

// ============================================================================
// ZONE TEMPLATE TESTS
// ============================================================================

console.log('\n📜 Testing Zone Templates...\n');

test('All zone templates have required properties', () => {
  const required = ['id', 'name', 'levelRange', 'prefixes', 'mainDescriptions', 
    'suffixes', 'features', 'enemies', 'roomTypes', 'ambients'];
  
  for (const [zoneId, template] of Object.entries(ZONE_TEMPLATES)) {
    for (const prop of required) {
      assert(template[prop], `Zone ${zoneId} missing ${prop}`);
    }
  }
});

test('All zone templates have valid level ranges', () => {
  for (const [zoneId, template] of Object.entries(ZONE_TEMPLATES)) {
    assert(Array.isArray(template.levelRange), `${zoneId} levelRange should be array`);
    assertEqual(template.levelRange.length, 2, `${zoneId} levelRange should have 2 elements`);
    assert(template.levelRange[0] <= template.levelRange[1], 
      `${zoneId} min level should be <= max level`);
  }
});

test('Room names exist for all zone types', () => {
  for (const zoneId of Object.keys(ZONE_TEMPLATES)) {
    assert(ROOM_NAMES[zoneId], `Missing room names for zone ${zoneId}`);
    assert(ROOM_NAMES[zoneId].adjectives?.length > 0, 
      `Zone ${zoneId} needs adjectives`);
    assert(ROOM_NAMES[zoneId].nouns?.length > 0, 
      `Zone ${zoneId} needs nouns`);
  }
});

test('Special rooms reference valid zones', () => {
  for (const [roomId, special] of Object.entries(SPECIAL_ROOMS)) {
    assert(ZONE_TEMPLATES[special.zone], 
      `Special room ${roomId} references invalid zone ${special.zone}`);
  }
});

// ============================================================================
// KELP FOREST SPECIFIC TESTS
// ============================================================================

console.log('\n🌿 Testing Kelp Forest Zone...\n');

test('Kelp Forest generates with correct properties', () => {
  const zone = generator.generateKelpForest('kelp_test');
  
  assertEqual(zone.type, 'kelp_forest', 'Zone type should be kelp_forest');
  assertEqual(zone.name, 'Kelp Forest', 'Zone name should be Kelp Forest');
  assert(Object.keys(zone.rooms).length >= 100, 'Should have at least 100 rooms');
});

test('Kelp Forest rooms have correct level range', () => {
  const zone = generator.generateKelpForest('level_test');
  
  for (const room of Object.values(zone.rooms)) {
    if (room.isSpecial) continue; // Special rooms may have different rules
    assert(room.level >= 2 && room.level <= 5, 
      `Room ${room.id} level ${room.level} out of range [2,5]`);
  }
});

test('Kelp Forest has bioluminescent theme', () => {
  const zone = generator.generateKelpForest('theme_test');
  const entry = zone.rooms[zone.entryRoomId];
  
  assertEqual(entry.theme, 'bioluminescent', 'Kelp Forest should have bioluminescent theme');
});

test('Kelp Forest special rooms have correct properties', () => {
  const zone = generator.generateKelpForest('special_props');
  
  const specialRooms = Object.values(zone.rooms).filter(r => r.isSpecial);
  
  for (const room of specialRooms) {
    assert(room.description, 'Special room should have description');
    assert(room.features?.length > 0, 'Special room should have features');
    assert(Object.keys(room.exits).length > 0, 'Special room should have exits');
  }
});

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All tests passed!\n');
}
