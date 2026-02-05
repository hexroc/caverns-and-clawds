/**
 * Player Shop System
 * 
 * Own a shop property → stock it → set prices → earn USDC from sales.
 * Like The Sims retail stores meets Ultima Online vendors.
 * 
 * Features:
 * - Stock shop with materials/items from your inventory
 * - Set your own prices (undercut NPCs for traffic, or markup rare items)
 * - Hire NPC employees (optional, costs USDC/day)
 * - Shop reputation affects customer traffic
 * - Special items only available at player shops
 */

const crypto = require('crypto');

// ============================================================================
// SHOP CONFIG
// ============================================================================

const SHOP_TIERS = {
  stall: {
    id: 'stall',
    name: 'Market Stall',
    maxSlots: 5,
    maxStack: 50,
    dailyCost: 0,
    propertyType: 'shop'
  },
  boutique: {
    id: 'boutique', 
    name: 'Boutique Shop',
    maxSlots: 15,
    maxStack: 100,
    dailyCost: 0.005,
    propertyType: 'shop'
  },
  emporium: {
    id: 'emporium',
    name: 'Grand Emporium',
    maxSlots: 30,
    maxStack: 200,
    dailyCost: 0.015,
    propertyType: 'warehouse'
  },
  tavern_shop: {
    id: 'tavern_shop',
    name: 'Tavern Counter',
    maxSlots: 10,
    maxStack: 100,
    dailyCost: 0.010,
    propertyType: 'tavern'
  }
};

const EMPLOYEE_TYPES = {
  clerk: {
    id: 'clerk',
    name: 'Shop Clerk',
    dailyWage: 0.002,
    salesBonus: 0.05, // 5% more sales
    description: 'Handles basic transactions'
  },
  hawker: {
    id: 'hawker',
    name: 'Street Hawker',
    dailyWage: 0.003,
    salesBonus: 0.15, // 15% more sales
    description: 'Brings in customers from the street'
  },
  appraiser: {
    id: 'appraiser',
    name: 'Expert Appraiser',
    dailyWage: 0.005,
    salesBonus: 0.10,
    buyBonus: 0.10, // Can buy from players at 10% discount
    description: 'Appraises items and haggles with sellers'
  }
};

// ============================================================================
// DATABASE
// ============================================================================

function initPlayerShopsDB(db) {
  // Player shops - tied to property ownership
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_shops (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      tier TEXT DEFAULT 'stall',
      reputation INTEGER DEFAULT 50,
      total_sales REAL DEFAULT 0,
      total_transactions INTEGER DEFAULT 0,
      is_open INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (property_id) REFERENCES properties(id),
      FOREIGN KEY (owner_id) REFERENCES clawds(id)
    )
  `);
  
  // Shop inventory - what's for sale
  db.exec(`
    CREATE TABLE IF NOT EXISTS shop_inventory (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price_per_unit REAL NOT NULL,
      listed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES player_shops(id)
    )
  `);
  
  // Shop employees
  db.exec(`
    CREATE TABLE IF NOT EXISTS shop_employees (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      employee_type TEXT NOT NULL,
      name TEXT NOT NULL,
      hired_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_paid TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES player_shops(id)
    )
  `);
  
  // Shop sales log
  db.exec(`
    CREATE TABLE IF NOT EXISTS shop_sales (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price_per_unit REAL NOT NULL,
      total_price REAL NOT NULL,
      sold_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES player_shops(id),
      FOREIGN KEY (buyer_id) REFERENCES clawds(id)
    )
  `);
  
  // Buy orders - what the shop wants to buy
  db.exec(`
    CREATE TABLE IF NOT EXISTS shop_buy_orders (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      max_quantity INTEGER NOT NULL,
      price_per_unit REAL NOT NULL,
      current_quantity INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES player_shops(id)
    )
  `);
  
  console.log('🏪 Player shop system initialized');
}

// ============================================================================
// SHOP MANAGEMENT
// ============================================================================

/**
 * Create/open a shop on owned property
 */
function openShop(db, characterId, propertyId, shopName, description = '') {
  // Validate property ownership and type
  const deed = db.prepare(`
    SELECT pd.*, p.type, p.name as property_name
    FROM property_deeds pd
    JOIN properties p ON pd.property_id = p.id
    WHERE pd.property_id = ? AND pd.owner_id = ?
  `).get(propertyId, characterId);
  
  if (!deed) {
    return { success: false, error: 'You do not own this property' };
  }
  
  // Check property type can have a shop
  const validTypes = ['shop', 'warehouse', 'tavern'];
  if (!validTypes.includes(deed.type)) {
    return { success: false, error: `Cannot open shop in a ${deed.type}. Need: shop, warehouse, or tavern` };
  }
  
  // Check no existing shop
  const existing = db.prepare('SELECT * FROM player_shops WHERE property_id = ?').get(propertyId);
  if (existing) {
    return { success: false, error: 'Shop already exists on this property', shopId: existing.id };
  }
  
  // Validate name
  if (!shopName || shopName.trim().length < 2) {
    return { success: false, error: 'Shop name must be at least 2 characters' };
  }
  if (shopName.length > 50) {
    return { success: false, error: 'Shop name too long (max 50 chars)' };
  }
  
  // Determine tier based on property type
  let tier = 'stall';
  if (deed.type === 'warehouse') tier = 'emporium';
  if (deed.type === 'tavern') tier = 'tavern_shop';
  
  const shopId = crypto.randomUUID();
  
  db.prepare(`
    INSERT INTO player_shops (id, property_id, owner_id, name, description, tier)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(shopId, propertyId, characterId, shopName.trim(), description || '', tier);
  
  return {
    success: true,
    shopId,
    name: shopName,
    tier,
    tierInfo: SHOP_TIERS[tier],
    message: `${shopName} is now open for business! 🏪`
  };
}

/**
 * Close shop (remove from property)
 */
function closeShop(db, characterId, shopId) {
  const shop = db.prepare(`
    SELECT * FROM player_shops WHERE id = ? AND owner_id = ?
  `).get(shopId, characterId);
  
  if (!shop) {
    return { success: false, error: 'Shop not found or not owned' };
  }
  
  // Return all inventory to player
  const inventory = db.prepare('SELECT * FROM shop_inventory WHERE shop_id = ?').all(shopId);
  
  for (const item of inventory) {
    // Add back to player materials
    const existing = db.prepare(`
      SELECT * FROM player_materials WHERE character_id = ? AND material_id = ?
    `).get(characterId, item.material_id);
    
    if (existing) {
      db.prepare(`
        UPDATE player_materials SET quantity = quantity + ? WHERE id = ?
      `).run(item.quantity, existing.id);
    } else {
      db.prepare(`
        INSERT INTO player_materials (id, character_id, material_id, quantity)
        VALUES (?, ?, ?, ?)
      `).run(crypto.randomUUID(), characterId, item.material_id, item.quantity);
    }
  }
  
  // Fire employees (no refund)
  db.prepare('DELETE FROM shop_employees WHERE shop_id = ?').run(shopId);
  
  // Delete inventory, buy orders, shop
  db.prepare('DELETE FROM shop_inventory WHERE shop_id = ?').run(shopId);
  db.prepare('DELETE FROM shop_buy_orders WHERE shop_id = ?').run(shopId);
  db.prepare('DELETE FROM player_shops WHERE id = ?').run(shopId);
  
  return {
    success: true,
    itemsReturned: inventory.length,
    message: `${shop.name} has been closed. Inventory returned.`
  };
}

/**
 * Stock shop with materials from inventory
 */
function stockShop(db, characterId, shopId, materialId, quantity, pricePerUnit) {
  // Validate inputs
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { success: false, error: 'Quantity must be a positive integer' };
  }
  if (typeof pricePerUnit !== 'number' || pricePerUnit < 0.01) {
    return { success: false, error: 'Price must be at least 0.01 USDC' };
  }
  
  const shop = db.prepare(`
    SELECT ps.*, pt.maxSlots, pt.maxStack
    FROM player_shops ps
    JOIN (SELECT 'stall' as id, 5 as maxSlots, 50 as maxStack
          UNION SELECT 'boutique', 15, 100
          UNION SELECT 'emporium', 30, 200
          UNION SELECT 'tavern_shop', 10, 100) pt ON ps.tier = pt.id
    WHERE ps.id = ? AND ps.owner_id = ?
  `).get(shopId, characterId);
  
  if (!shop) {
    return { success: false, error: 'Shop not found or not owned' };
  }
  
  if (!shop.is_open) {
    return { success: false, error: 'Shop is closed' };
  }
  
  // Get tier info (fallback if join didn't work)
  const tierInfo = SHOP_TIERS[shop.tier] || SHOP_TIERS.stall;
  
  // Check player has materials
  const playerMat = db.prepare(`
    SELECT * FROM player_materials WHERE character_id = ? AND material_id = ?
  `).get(characterId, materialId);
  
  if (!playerMat || playerMat.quantity < quantity) {
    return { 
      success: false, 
      error: 'Insufficient materials',
      have: playerMat?.quantity || 0,
      need: quantity
    };
  }
  
  // Check shop slot count
  const currentSlots = db.prepare(`
    SELECT COUNT(*) as count FROM shop_inventory WHERE shop_id = ?
  `).get(shopId).count;
  
  const existingSlot = db.prepare(`
    SELECT * FROM shop_inventory WHERE shop_id = ? AND material_id = ?
  `).get(shopId, materialId);
  
  if (!existingSlot && currentSlots >= tierInfo.maxSlots) {
    return { 
      success: false, 
      error: `Shop full! Max ${tierInfo.maxSlots} item types for ${tierInfo.name}` 
    };
  }
  
  // Check stack limit
  const newQuantity = (existingSlot?.quantity || 0) + quantity;
  if (newQuantity > tierInfo.maxStack) {
    return {
      success: false,
      error: `Exceeds max stack of ${tierInfo.maxStack} for ${tierInfo.name}`,
      currentStock: existingSlot?.quantity || 0,
      max: tierInfo.maxStack
    };
  }
  
  // Remove from player inventory
  if (playerMat.quantity === quantity) {
    db.prepare('DELETE FROM player_materials WHERE id = ?').run(playerMat.id);
  } else {
    db.prepare('UPDATE player_materials SET quantity = quantity - ? WHERE id = ?').run(quantity, playerMat.id);
  }
  
  // Add to shop
  if (existingSlot) {
    // Update existing - use new price
    db.prepare(`
      UPDATE shop_inventory 
      SET quantity = quantity + ?, price_per_unit = ?, listed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(quantity, pricePerUnit, existingSlot.id);
  } else {
    db.prepare(`
      INSERT INTO shop_inventory (id, shop_id, material_id, quantity, price_per_unit)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), shopId, materialId, quantity, pricePerUnit);
  }
  
  // Get material name for message
  const material = db.prepare('SELECT name FROM economy_materials WHERE id = ?').get(materialId);
  
  return {
    success: true,
    material: material?.name || materialId,
    quantity,
    pricePerUnit,
    totalStock: newQuantity,
    message: `Stocked ${quantity}x ${material?.name || materialId} at ${pricePerUnit} USDC each`
  };
}

/**
 * Update price of existing stock
 */
function updatePrice(db, characterId, shopId, materialId, newPrice) {
  if (typeof newPrice !== 'number' || newPrice < 0.01) {
    return { success: false, error: 'Price must be at least 0.01 USDC' };
  }
  
  const shop = db.prepare(`
    SELECT * FROM player_shops WHERE id = ? AND owner_id = ?
  `).get(shopId, characterId);
  
  if (!shop) {
    return { success: false, error: 'Shop not found or not owned' };
  }
  
  const item = db.prepare(`
    SELECT * FROM shop_inventory WHERE shop_id = ? AND material_id = ?
  `).get(shopId, materialId);
  
  if (!item) {
    return { success: false, error: 'Item not in shop inventory' };
  }
  
  db.prepare(`
    UPDATE shop_inventory SET price_per_unit = ? WHERE id = ?
  `).run(newPrice, item.id);
  
  return {
    success: true,
    oldPrice: item.price_per_unit,
    newPrice,
    message: `Price updated to ${newPrice} USDC`
  };
}

/**
 * Remove stock from shop (return to player)
 */
function unstockItem(db, characterId, shopId, materialId, quantity = null) {
  const shop = db.prepare(`
    SELECT * FROM player_shops WHERE id = ? AND owner_id = ?
  `).get(shopId, characterId);
  
  if (!shop) {
    return { success: false, error: 'Shop not found or not owned' };
  }
  
  const item = db.prepare(`
    SELECT * FROM shop_inventory WHERE shop_id = ? AND material_id = ?
  `).get(shopId, materialId);
  
  if (!item) {
    return { success: false, error: 'Item not in shop inventory' };
  }
  
  const removeQty = quantity ?? item.quantity; // Remove all if not specified
  
  if (removeQty > item.quantity) {
    return { success: false, error: 'Not enough stock', have: item.quantity };
  }
  
  // Remove from shop
  if (removeQty >= item.quantity) {
    db.prepare('DELETE FROM shop_inventory WHERE id = ?').run(item.id);
  } else {
    db.prepare('UPDATE shop_inventory SET quantity = quantity - ? WHERE id = ?').run(removeQty, item.id);
  }
  
  // Add to player inventory
  const playerMat = db.prepare(`
    SELECT * FROM player_materials WHERE character_id = ? AND material_id = ?
  `).get(characterId, materialId);
  
  if (playerMat) {
    db.prepare('UPDATE player_materials SET quantity = quantity + ? WHERE id = ?').run(removeQty, playerMat.id);
  } else {
    db.prepare(`
      INSERT INTO player_materials (id, character_id, material_id, quantity)
      VALUES (?, ?, ?, ?)
    `).run(crypto.randomUUID(), characterId, materialId, removeQty);
  }
  
  return {
    success: true,
    removed: removeQty,
    remaining: item.quantity - removeQty,
    message: `Removed ${removeQty} items from shop`
  };
}

// ============================================================================
// SHOPPING (BUYER ACTIONS)
// ============================================================================

/**
 * Browse all player shops
 */
function browseShops(db, filters = {}) {
  let query = `
    SELECT ps.*, p.location, p.name as property_name,
      c.name as owner_name,
      (SELECT COUNT(*) FROM shop_inventory si WHERE si.shop_id = ps.id) as item_count
    FROM player_shops ps
    JOIN properties p ON ps.property_id = p.id
    JOIN clawds c ON ps.owner_id = c.id
    WHERE ps.is_open = 1
  `;
  
  const params = [];
  
  if (filters.location) {
    query += ' AND p.location = ?';
    params.push(filters.location);
  }
  
  query += ' ORDER BY ps.reputation DESC, ps.total_sales DESC';
  
  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }
  
  return db.prepare(query).all(...params);
}

/**
 * View shop inventory
 */
function viewShopInventory(db, shopId) {
  const shop = db.prepare(`
    SELECT ps.*, c.name as owner_name
    FROM player_shops ps
    JOIN clawds c ON ps.owner_id = c.id
    WHERE ps.id = ?
  `).get(shopId);
  
  if (!shop) {
    return { success: false, error: 'Shop not found' };
  }
  
  const inventory = db.prepare(`
    SELECT si.*, em.name as material_name, em.rarity
    FROM shop_inventory si
    JOIN economy_materials em ON si.material_id = em.id
    WHERE si.shop_id = ?
    ORDER BY em.rarity DESC, si.price_per_unit ASC
  `).all(shopId);
  
  return {
    success: true,
    shop: {
      id: shop.id,
      name: shop.name,
      description: shop.description,
      owner: shop.owner_name,
      reputation: shop.reputation,
      totalSales: shop.total_sales
    },
    inventory
  };
}

/**
 * Buy from a player shop
 */
function buyFromShop(db, buyerId, shopId, materialId, quantity) {
  // Validate inputs
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { success: false, error: 'Quantity must be a positive integer' };
  }
  
  const shop = db.prepare(`
    SELECT ps.*, c.name as owner_name
    FROM player_shops ps
    JOIN clawds c ON ps.owner_id = c.id
    WHERE ps.id = ? AND ps.is_open = 1
  `).get(shopId);
  
  if (!shop) {
    return { success: false, error: 'Shop not found or closed' };
  }
  
  if (shop.owner_id === buyerId) {
    return { success: false, error: 'Cannot buy from your own shop' };
  }
  
  const item = db.prepare(`
    SELECT si.*, em.name as material_name
    FROM shop_inventory si
    JOIN economy_materials em ON si.material_id = em.id
    WHERE si.shop_id = ? AND si.material_id = ?
  `).get(shopId, materialId);
  
  if (!item) {
    return { success: false, error: 'Item not available' };
  }
  
  if (item.quantity < quantity) {
    return { 
      success: false, 
      error: 'Insufficient stock',
      available: item.quantity,
      requested: quantity
    };
  }
  
  const totalPrice = item.price_per_unit * quantity;
  
  // Check buyer funds (bank + wallet)
  const buyerAccount = db.prepare(`
    SELECT deposited_balance FROM bank_accounts 
    WHERE owner_type = 'player' AND owner_id = ?
  `).get(buyerId);
  
  const buyerBalance = buyerAccount?.deposited_balance || 0;
  
  if (buyerBalance < totalPrice) {
    return {
      success: false,
      error: 'Insufficient funds',
      have: buyerBalance,
      need: totalPrice
    };
  }
  
  // Execute transaction
  // 1. Deduct from buyer
  db.prepare(`
    UPDATE bank_accounts SET deposited_balance = deposited_balance - ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(totalPrice, buyerId);
  
  // 2. Pay seller
  db.prepare(`
    UPDATE bank_accounts SET deposited_balance = deposited_balance + ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(totalPrice, shop.owner_id);
  
  // 3. Transfer item
  if (item.quantity === quantity) {
    db.prepare('DELETE FROM shop_inventory WHERE id = ?').run(item.id);
  } else {
    db.prepare('UPDATE shop_inventory SET quantity = quantity - ? WHERE id = ?').run(quantity, item.id);
  }
  
  // Add to buyer inventory
  const buyerMat = db.prepare(`
    SELECT * FROM player_materials WHERE character_id = ? AND material_id = ?
  `).get(buyerId, materialId);
  
  if (buyerMat) {
    db.prepare('UPDATE player_materials SET quantity = quantity + ? WHERE id = ?').run(quantity, buyerMat.id);
  } else {
    db.prepare(`
      INSERT INTO player_materials (id, character_id, material_id, quantity)
      VALUES (?, ?, ?, ?)
    `).run(crypto.randomUUID(), buyerId, materialId, quantity);
  }
  
  // 4. Log sale
  db.prepare(`
    INSERT INTO shop_sales (id, shop_id, buyer_id, material_id, quantity, price_per_unit, total_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), shopId, buyerId, materialId, quantity, item.price_per_unit, totalPrice);
  
  // 5. Update shop stats
  db.prepare(`
    UPDATE player_shops 
    SET total_sales = total_sales + ?, total_transactions = total_transactions + 1
    WHERE id = ?
  `).run(totalPrice, shopId);
  
  // 6. Log economy transaction
  db.prepare(`
    INSERT INTO economy_transactions (id, type, from_wallet, to_wallet, amount, description)
    VALUES (?, 'sale', ?, ?, ?, ?)
  `).run(crypto.randomUUID(), buyerId, shop.owner_id, totalPrice, 
    `Shop: ${shop.name} - ${quantity}x ${item.material_name}`);
  
  // 7. Small reputation boost
  const repBoost = Math.min(1, Math.floor(totalPrice / 10)); // 1 rep per 10 USDC spent
  if (repBoost > 0) {
    db.prepare('UPDATE player_shops SET reputation = MIN(100, reputation + ?) WHERE id = ?').run(repBoost, shopId);
  }
  
  return {
    success: true,
    shop: shop.name,
    item: item.material_name,
    quantity,
    pricePerUnit: item.price_per_unit,
    totalPrice,
    message: `Bought ${quantity}x ${item.material_name} from ${shop.name} for ${totalPrice} USDC`
  };
}

// ============================================================================
// EMPLOYEES
// ============================================================================

/**
 * Hire an employee
 */
function hireEmployee(db, characterId, shopId, employeeType, name) {
  const shop = db.prepare(`
    SELECT * FROM player_shops WHERE id = ? AND owner_id = ?
  `).get(shopId, characterId);
  
  if (!shop) {
    return { success: false, error: 'Shop not found or not owned' };
  }
  
  const empType = EMPLOYEE_TYPES[employeeType];
  if (!empType) {
    return { success: false, error: 'Invalid employee type', validTypes: Object.keys(EMPLOYEE_TYPES) };
  }
  
  // Check max employees (1 per shop tier upgrade)
  const tierInfo = SHOP_TIERS[shop.tier];
  const maxEmployees = shop.tier === 'stall' ? 1 : shop.tier === 'boutique' ? 2 : 3;
  
  const currentCount = db.prepare(`
    SELECT COUNT(*) as c FROM shop_employees WHERE shop_id = ?
  `).get(shopId).c;
  
  if (currentCount >= maxEmployees) {
    return { success: false, error: `Max ${maxEmployees} employees for ${tierInfo.name}` };
  }
  
  // Charge first day's wage
  const account = db.prepare(`
    SELECT deposited_balance FROM bank_accounts 
    WHERE owner_type = 'player' AND owner_id = ?
  `).get(characterId);
  
  if (!account || account.deposited_balance < empType.dailyWage) {
    return { 
      success: false, 
      error: `Need ${empType.dailyWage} USDC for first day wage`,
      have: account?.deposited_balance || 0
    };
  }
  
  db.prepare(`
    UPDATE bank_accounts SET deposited_balance = deposited_balance - ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(empType.dailyWage, characterId);
  
  const empId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO shop_employees (id, shop_id, employee_type, name)
    VALUES (?, ?, ?, ?)
  `).run(empId, shopId, employeeType, name || `${empType.name} #${currentCount + 1}`);
  
  return {
    success: true,
    employeeId: empId,
    type: empType.name,
    dailyWage: empType.dailyWage,
    bonus: empType.salesBonus,
    message: `Hired ${name || empType.name}! (${empType.dailyWage} USDC/day)`
  };
}

/**
 * Fire an employee
 */
function fireEmployee(db, characterId, shopId, employeeId) {
  const shop = db.prepare(`
    SELECT * FROM player_shops WHERE id = ? AND owner_id = ?
  `).get(shopId, characterId);
  
  if (!shop) {
    return { success: false, error: 'Shop not found or not owned' };
  }
  
  const emp = db.prepare(`
    SELECT * FROM shop_employees WHERE id = ? AND shop_id = ?
  `).get(employeeId, shopId);
  
  if (!emp) {
    return { success: false, error: 'Employee not found' };
  }
  
  db.prepare('DELETE FROM shop_employees WHERE id = ?').run(employeeId);
  
  return {
    success: true,
    message: `${emp.name} has been fired`
  };
}

/**
 * Pay employees (call from daily cron)
 */
function payEmployees(db) {
  const employees = db.prepare(`
    SELECT se.*, ps.owner_id, ps.name as shop_name
    FROM shop_employees se
    JOIN player_shops ps ON se.shop_id = ps.id
    WHERE datetime(se.last_paid, '+1 day') <= datetime('now')
  `).all();
  
  const results = [];
  
  for (const emp of employees) {
    const empType = EMPLOYEE_TYPES[emp.employee_type];
    if (!empType) continue;
    
    const account = db.prepare(`
      SELECT deposited_balance FROM bank_accounts 
      WHERE owner_type = 'player' AND owner_id = ?
    `).get(emp.owner_id);
    
    if (!account || account.deposited_balance < empType.dailyWage) {
      // Can't afford - employee quits
      db.prepare('DELETE FROM shop_employees WHERE id = ?').run(emp.id);
      results.push({
        shop: emp.shop_name,
        employee: emp.name,
        status: 'quit',
        reason: 'unpaid'
      });
    } else {
      // Pay employee
      db.prepare(`
        UPDATE bank_accounts SET deposited_balance = deposited_balance - ?
        WHERE owner_type = 'player' AND owner_id = ?
      `).run(empType.dailyWage, emp.owner_id);
      
      db.prepare(`
        UPDATE shop_employees SET last_paid = CURRENT_TIMESTAMP WHERE id = ?
      `).run(emp.id);
      
      results.push({
        shop: emp.shop_name,
        employee: emp.name,
        status: 'paid',
        amount: empType.dailyWage
      });
    }
  }
  
  return results;
}

// ============================================================================
// BUY ORDERS
// ============================================================================

/**
 * Create a buy order (shop wants to buy materials from players)
 */
function createBuyOrder(db, characterId, shopId, materialId, maxQuantity, pricePerUnit) {
  if (!Number.isInteger(maxQuantity) || maxQuantity < 1) {
    return { success: false, error: 'Max quantity must be a positive integer' };
  }
  if (typeof pricePerUnit !== 'number' || pricePerUnit < 0.01) {
    return { success: false, error: 'Price must be at least 0.01 USDC' };
  }
  
  const shop = db.prepare(`
    SELECT * FROM player_shops WHERE id = ? AND owner_id = ?
  `).get(shopId, characterId);
  
  if (!shop) {
    return { success: false, error: 'Shop not found or not owned' };
  }
  
  // Check if order for this material exists
  const existing = db.prepare(`
    SELECT * FROM shop_buy_orders WHERE shop_id = ? AND material_id = ? AND is_active = 1
  `).get(shopId, materialId);
  
  if (existing) {
    return { success: false, error: 'Buy order already exists for this material. Cancel it first.' };
  }
  
  // Calculate total escrow needed
  const escrowNeeded = maxQuantity * pricePerUnit;
  
  // Check funds
  const account = db.prepare(`
    SELECT deposited_balance FROM bank_accounts 
    WHERE owner_type = 'player' AND owner_id = ?
  `).get(characterId);
  
  if (!account || account.deposited_balance < escrowNeeded) {
    return {
      success: false,
      error: 'Insufficient funds for buy order escrow',
      have: account?.deposited_balance || 0,
      need: escrowNeeded
    };
  }
  
  // Lock escrow
  db.prepare(`
    UPDATE bank_accounts SET deposited_balance = deposited_balance - ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(escrowNeeded, characterId);
  
  const orderId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO shop_buy_orders (id, shop_id, material_id, max_quantity, price_per_unit)
    VALUES (?, ?, ?, ?, ?)
  `).run(orderId, shopId, materialId, maxQuantity, pricePerUnit);
  
  const material = db.prepare('SELECT name FROM economy_materials WHERE id = ?').get(materialId);
  
  return {
    success: true,
    orderId,
    material: material?.name || materialId,
    maxQuantity,
    pricePerUnit,
    escrowLocked: escrowNeeded,
    message: `Buy order created: up to ${maxQuantity}x ${material?.name || materialId} at ${pricePerUnit} USDC each`
  };
}

/**
 * Sell to a shop's buy order
 */
function sellToShop(db, sellerId, orderId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { success: false, error: 'Quantity must be a positive integer' };
  }
  
  const order = db.prepare(`
    SELECT bo.*, ps.name as shop_name, ps.owner_id as shop_owner,
      em.name as material_name
    FROM shop_buy_orders bo
    JOIN player_shops ps ON bo.shop_id = ps.id
    JOIN economy_materials em ON bo.material_id = em.id
    WHERE bo.id = ? AND bo.is_active = 1
  `).get(orderId);
  
  if (!order) {
    return { success: false, error: 'Buy order not found or inactive' };
  }
  
  if (order.shop_owner === sellerId) {
    return { success: false, error: 'Cannot sell to your own shop' };
  }
  
  const remaining = order.max_quantity - order.current_quantity;
  if (quantity > remaining) {
    return {
      success: false,
      error: 'Order cannot accept this many',
      canAccept: remaining,
      requested: quantity
    };
  }
  
  // Check seller has materials
  const sellerMat = db.prepare(`
    SELECT * FROM player_materials WHERE character_id = ? AND material_id = ?
  `).get(sellerId, order.material_id);
  
  if (!sellerMat || sellerMat.quantity < quantity) {
    return {
      success: false,
      error: 'Insufficient materials',
      have: sellerMat?.quantity || 0,
      need: quantity
    };
  }
  
  const totalPrice = quantity * order.price_per_unit;
  
  // Execute transaction
  // 1. Remove from seller
  if (sellerMat.quantity === quantity) {
    db.prepare('DELETE FROM player_materials WHERE id = ?').run(sellerMat.id);
  } else {
    db.prepare('UPDATE player_materials SET quantity = quantity - ? WHERE id = ?').run(quantity, sellerMat.id);
  }
  
  // 2. Pay seller (from escrow - already deducted from shop owner)
  db.prepare(`
    UPDATE bank_accounts SET deposited_balance = deposited_balance + ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(totalPrice, sellerId);
  
  // 3. Add to shop inventory (or create listing at default price)
  const existingStock = db.prepare(`
    SELECT * FROM shop_inventory WHERE shop_id = ? AND material_id = ?
  `).get(order.shop_id, order.material_id);
  
  const markup = 1.2; // Default 20% markup
  const listPrice = Math.round(order.price_per_unit * markup * 100) / 100;
  
  if (existingStock) {
    db.prepare('UPDATE shop_inventory SET quantity = quantity + ? WHERE id = ?').run(quantity, existingStock.id);
  } else {
    db.prepare(`
      INSERT INTO shop_inventory (id, shop_id, material_id, quantity, price_per_unit)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), order.shop_id, order.material_id, quantity, listPrice);
  }
  
  // 4. Update buy order
  const newQty = order.current_quantity + quantity;
  if (newQty >= order.max_quantity) {
    db.prepare('UPDATE shop_buy_orders SET current_quantity = ?, is_active = 0 WHERE id = ?').run(newQty, orderId);
  } else {
    db.prepare('UPDATE shop_buy_orders SET current_quantity = ? WHERE id = ?').run(newQty, orderId);
  }
  
  // 5. Log transaction
  db.prepare(`
    INSERT INTO economy_transactions (id, type, from_wallet, to_wallet, amount, description)
    VALUES (?, 'sale', ?, ?, ?, ?)
  `).run(crypto.randomUUID(), order.shop_owner, sellerId, totalPrice,
    `Buy order: ${order.shop_name} bought ${quantity}x ${order.material_name}`);
  
  return {
    success: true,
    shop: order.shop_name,
    material: order.material_name,
    quantity,
    pricePerUnit: order.price_per_unit,
    totalEarned: totalPrice,
    orderRemaining: order.max_quantity - newQty,
    message: `Sold ${quantity}x ${order.material_name} to ${order.shop_name} for ${totalPrice} USDC`
  };
}

/**
 * Cancel buy order (refund remaining escrow)
 */
function cancelBuyOrder(db, characterId, orderId) {
  const order = db.prepare(`
    SELECT bo.*, ps.owner_id
    FROM shop_buy_orders bo
    JOIN player_shops ps ON bo.shop_id = ps.id
    WHERE bo.id = ? AND ps.owner_id = ?
  `).get(orderId, characterId);
  
  if (!order) {
    return { success: false, error: 'Buy order not found or not owned' };
  }
  
  // Calculate refund
  const unfilled = order.max_quantity - order.current_quantity;
  const refund = unfilled * order.price_per_unit;
  
  // Refund escrow
  if (refund > 0) {
    db.prepare(`
      UPDATE bank_accounts SET deposited_balance = deposited_balance + ?
      WHERE owner_type = 'player' AND owner_id = ?
    `).run(refund, characterId);
  }
  
  // Deactivate order
  db.prepare('UPDATE shop_buy_orders SET is_active = 0 WHERE id = ?').run(orderId);
  
  return {
    success: true,
    refunded: refund,
    message: `Buy order cancelled. ${refund} USDC refunded.`
  };
}

// ============================================================================
// SHOP STATS
// ============================================================================

/**
 * Get shop statistics
 */
function getShopStats(db, shopId) {
  const shop = db.prepare(`
    SELECT ps.*, c.name as owner_name
    FROM player_shops ps
    JOIN clawds c ON ps.owner_id = c.id
    WHERE ps.id = ?
  `).get(shopId);
  
  if (!shop) {
    return { success: false, error: 'Shop not found' };
  }
  
  const recentSales = db.prepare(`
    SELECT ss.*, em.name as material_name, c.name as buyer_name
    FROM shop_sales ss
    JOIN economy_materials em ON ss.material_id = em.id
    JOIN clawds c ON ss.buyer_id = c.id
    WHERE ss.shop_id = ?
    ORDER BY ss.sold_at DESC
    LIMIT 10
  `).all(shopId);
  
  const topItems = db.prepare(`
    SELECT material_id, SUM(quantity) as total_sold, SUM(total_price) as revenue,
      em.name as material_name
    FROM shop_sales
    JOIN economy_materials em ON shop_sales.material_id = em.id
    WHERE shop_id = ?
    GROUP BY material_id
    ORDER BY revenue DESC
    LIMIT 5
  `).all(shopId);
  
  const employees = db.prepare(`
    SELECT * FROM shop_employees WHERE shop_id = ?
  `).all(shopId);
  
  const buyOrders = db.prepare(`
    SELECT bo.*, em.name as material_name
    FROM shop_buy_orders bo
    JOIN economy_materials em ON bo.material_id = em.id
    WHERE bo.shop_id = ? AND bo.is_active = 1
  `).all(shopId);
  
  return {
    success: true,
    shop,
    recentSales,
    topItems,
    employees: employees.map(e => ({ ...e, typeInfo: EMPLOYEE_TYPES[e.employee_type] })),
    buyOrders
  };
}

/**
 * Get player's shops
 */
function getPlayerShops(db, characterId) {
  const shops = db.prepare(`
    SELECT ps.*, p.location, p.name as property_name
    FROM player_shops ps
    JOIN properties p ON ps.property_id = p.id
    WHERE ps.owner_id = ?
  `).all(characterId);
  
  return shops.map(shop => {
    const inventory = db.prepare(`
      SELECT COUNT(*) as items, SUM(quantity) as total_stock
      FROM shop_inventory WHERE shop_id = ?
    `).get(shop.id);
    
    const employees = db.prepare(`
      SELECT COUNT(*) as c FROM shop_employees WHERE shop_id = ?
    `).get(shop.id).c;
    
    return {
      ...shop,
      tierInfo: SHOP_TIERS[shop.tier],
      inventoryItems: inventory?.items || 0,
      totalStock: inventory?.total_stock || 0,
      employeeCount: employees
    };
  });
}

module.exports = {
  SHOP_TIERS,
  EMPLOYEE_TYPES,
  initPlayerShopsDB,
  openShop,
  closeShop,
  stockShop,
  updatePrice,
  unstockItem,
  browseShops,
  viewShopInventory,
  buyFromShop,
  hireEmployee,
  fireEmployee,
  payEmployees,
  createBuyOrder,
  sellToShop,
  cancelBuyOrder,
  getShopStats,
  getPlayerShops
};
