/**
 * Real Estate System
 * 
 * Full property ownership, mortgages, rentals, and deed trading.
 * 
 * Features:
 * - Buy properties (cash or mortgage)
 * - Mortgages require 3-day seasoned funds for down payment
 * - Rent properties to other players
 * - Trade deeds on auction house or P2P
 * - Foreclosure if mortgage payments missed
 */

const crypto = require('crypto');

// ============================================================================
// PROPERTY TYPES
// ============================================================================

// MICRO-PRICES: Divided by 1000x for yield-backed economy
const PROPERTY_TYPES = {
  shack: {
    id: 'shack',
    name: 'Beach Shack',
    description: 'A humble dwelling on the shore. Not much, but it\'s yours.',
    basePrice: 0.050,
    rentRange: [0.002, 0.005],
    storage: 10,
    tier: 1
  },
  cottage: {
    id: 'cottage',
    name: 'Coral Cottage',
    description: 'A cozy cottage built into a coral formation.',
    basePrice: 0.150,
    rentRange: [0.005, 0.015],
    storage: 25,
    tier: 2
  },
  house: {
    id: 'house',
    name: 'Tide Pool House',
    description: 'A proper house with a view of the tide pools.',
    basePrice: 0.400,
    rentRange: [0.015, 0.040],
    storage: 50,
    tier: 3
  },
  manor: {
    id: 'manor',
    name: 'Kelp Manor',
    description: 'A sprawling estate in the prestigious Kelp Heights.',
    basePrice: 1.000,
    rentRange: [0.040, 0.100],
    storage: 100,
    tier: 4
  },
  shop: {
    id: 'shop',
    name: 'Market Stall',
    description: 'A small shop space in the marketplace.',
    basePrice: 0.200,
    rentRange: [0.010, 0.025],
    storage: 30,
    canRunBusiness: true,
    tier: 2
  },
  warehouse: {
    id: 'warehouse',
    name: 'Dockside Warehouse',
    description: 'A large storage facility near the docks.',
    basePrice: 0.500,
    rentRange: [0.020, 0.050],
    storage: 200,
    tier: 3
  },
  tavern: {
    id: 'tavern',
    name: 'Tavern License',
    description: 'Rights to operate a tavern. Very lucrative.',
    basePrice: 2.000,
    rentRange: [0.080, 0.200],
    storage: 75,
    canRunBusiness: true,
    tier: 5
  }
};

// Property locations with multipliers
const LOCATIONS = {
  driftwood_docks: { name: 'Driftwood Docks', multiplier: 1.0, safeZone: true },
  kelp_heights: { name: 'Kelp Heights', multiplier: 1.5, safeZone: false },
  coral_cove: { name: 'Coral Cove', multiplier: 1.2, safeZone: false },
  briny_market: { name: 'Briny Market', multiplier: 1.3, safeZone: true },
  tide_flats: { name: 'Tide Flats', multiplier: 0.8, safeZone: false },
  deep_warren: { name: 'Deep Warren', multiplier: 0.6, safeZone: false }
};

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

function initRealEstateDB(db) {
  // Properties table - all available properties
  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      location TEXT NOT NULL,
      name TEXT,
      description TEXT,
      base_price REAL NOT NULL,
      current_price REAL NOT NULL,
      is_available INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Property deeds - ownership records
  db.exec(`
    CREATE TABLE IF NOT EXISTS property_deeds (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL,
      purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,
      purchase_price REAL NOT NULL,
      mortgage_id TEXT,
      for_sale INTEGER DEFAULT 0,
      sale_price REAL,
      for_rent INTEGER DEFAULT 0,
      rent_price REAL,
      FOREIGN KEY (property_id) REFERENCES properties(id),
      FOREIGN KEY (owner_id) REFERENCES clawds(id)
    )
  `);
  
  // Mortgages - property-backed loans
  db.exec(`
    CREATE TABLE IF NOT EXISTS mortgages (
      id TEXT PRIMARY KEY,
      deed_id TEXT NOT NULL,
      borrower_id TEXT NOT NULL,
      principal REAL NOT NULL,
      remaining_balance REAL NOT NULL,
      interest_rate REAL DEFAULT 0.03,
      monthly_payment REAL NOT NULL,
      payments_made INTEGER DEFAULT 0,
      total_payments INTEGER NOT NULL,
      next_payment_due TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deed_id) REFERENCES property_deeds(id),
      FOREIGN KEY (borrower_id) REFERENCES clawds(id)
    )
  `);
  
  // Rental agreements
  db.exec(`
    CREATE TABLE IF NOT EXISTS rental_agreements (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      landlord_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      rent_amount REAL NOT NULL,
      deposit_amount REAL DEFAULT 0,
      start_date TEXT DEFAULT CURRENT_TIMESTAMP,
      next_rent_due TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (property_id) REFERENCES properties(id),
      FOREIGN KEY (landlord_id) REFERENCES clawds(id),
      FOREIGN KEY (tenant_id) REFERENCES clawds(id)
    )
  `);
  
  // Balance history for seasoning verification
  db.exec(`
    CREATE TABLE IF NOT EXISTS balance_history (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      balance REAL NOT NULL,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (character_id) REFERENCES clawds(id)
    )
  `);
  
  // Seed some initial properties if none exist
  const count = db.prepare('SELECT COUNT(*) as c FROM properties').get();
  if (count.c === 0) {
    seedProperties(db);
  }
  
  console.log('🏠 Real estate system initialized');
}

function seedProperties(db) {
  const properties = [];
  
  // Generate properties for each location
  for (const [locId, loc] of Object.entries(LOCATIONS)) {
    // 2-3 shacks per location
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      properties.push(createProperty('shack', locId, loc));
    }
    
    // 1-2 cottages
    for (let i = 0; i < 1 + Math.floor(Math.random() * 2); i++) {
      properties.push(createProperty('cottage', locId, loc));
    }
    
    // 1 house per location
    properties.push(createProperty('house', locId, loc));
    
    // Shops only in market/docks
    if (locId === 'briny_market' || locId === 'driftwood_docks') {
      for (let i = 0; i < 2; i++) {
        properties.push(createProperty('shop', locId, loc));
      }
    }
  }
  
  // Special properties
  properties.push(createProperty('manor', 'kelp_heights', LOCATIONS.kelp_heights));
  properties.push(createProperty('warehouse', 'driftwood_docks', LOCATIONS.driftwood_docks));
  properties.push(createProperty('tavern', 'briny_market', LOCATIONS.briny_market));
  
  // Insert all
  const stmt = db.prepare(`
    INSERT INTO properties (id, type, location, name, description, base_price, current_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const p of properties) {
    stmt.run(p.id, p.type, p.location, p.name, p.description, p.basePrice, p.currentPrice);
  }
  
  console.log(`🏘️ Seeded ${properties.length} properties`);
}

function createProperty(typeId, locationId, location) {
  const type = PROPERTY_TYPES[typeId];
  const price = Math.round(type.basePrice * location.multiplier);
  
  return {
    id: `prop_${typeId}_${locationId}_${crypto.randomUUID().slice(0, 8)}`,
    type: typeId,
    location: locationId,
    name: `${type.name} in ${location.name}`,
    description: type.description,
    basePrice: price,
    currentPrice: price
  };
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Check if character has seasoned funds (in bank for 3+ days)
 */
function checkSeasonedFunds(db, characterId, amount) {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  
  // Check balance history - need consistent balance >= amount for 3 days
  const history = db.prepare(`
    SELECT MIN(balance) as min_balance
    FROM balance_history
    WHERE character_id = ? AND recorded_at <= ?
  `).get(characterId, threeDaysAgo);
  
  // Also check current bank balance
  const account = db.prepare(`
    SELECT deposited_balance FROM bank_accounts 
    WHERE owner_type = 'player' AND owner_id = ?
  `).get(characterId);
  
  const currentBalance = account?.deposited_balance || 0;
  const historicMin = history?.min_balance || 0;
  
  return {
    hasSeasonedFunds: historicMin >= amount && currentBalance >= amount,
    currentBalance,
    seasonedAmount: Math.min(historicMin, currentBalance),
    required: amount,
    daysRequired: 3
  };
}

/**
 * Record balance for seasoning history (call daily or on deposit)
 */
function recordBalance(db, characterId) {
  const account = db.prepare(`
    SELECT deposited_balance FROM bank_accounts 
    WHERE owner_type = 'player' AND owner_id = ?
  `).get(characterId);
  
  if (account) {
    db.prepare(`
      INSERT INTO balance_history (id, character_id, balance)
      VALUES (?, ?, ?)
    `).run(crypto.randomUUID(), characterId, account.deposited_balance);
  }
}

/**
 * Get available properties for purchase
 */
function getAvailableProperties(db, filters = {}) {
  let query = `
    SELECT p.*, 
      CASE WHEN pd.id IS NOT NULL THEN 0 ELSE 1 END as available
    FROM properties p
    LEFT JOIN property_deeds pd ON p.id = pd.property_id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (filters.type) {
    query += ' AND p.type = ?';
    params.push(filters.type);
  }
  
  if (filters.location) {
    query += ' AND p.location = ?';
    params.push(filters.location);
  }
  
  if (filters.maxPrice) {
    query += ' AND p.current_price <= ?';
    params.push(filters.maxPrice);
  }
  
  if (filters.availableOnly !== false) {
    query += ' AND pd.id IS NULL';
  }
  
  query += ' ORDER BY p.current_price ASC';
  
  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }
  
  const properties = db.prepare(query).all(...params);
  
  return properties.map(p => ({
    ...p,
    typeInfo: PROPERTY_TYPES[p.type],
    locationInfo: LOCATIONS[p.location]
  }));
}

/**
 * Buy property with cash
 */
function buyPropertyCash(db, characterId, propertyId) {
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);
  if (!property) {
    return { success: false, error: 'Property not found' };
  }
  
  // Check not already owned
  const existingDeed = db.prepare('SELECT * FROM property_deeds WHERE property_id = ?').get(propertyId);
  if (existingDeed) {
    return { success: false, error: 'Property already owned' };
  }
  
  // Check buyer has funds in bank
  const account = db.prepare(`
    SELECT deposited_balance FROM bank_accounts 
    WHERE owner_type = 'player' AND owner_id = ?
  `).get(characterId);
  
  if (!account || account.deposited_balance < property.current_price) {
    return { 
      success: false, 
      error: 'Insufficient funds in bank',
      have: account?.deposited_balance || 0,
      need: property.current_price
    };
  }
  
  // Deduct from bank
  db.prepare(`
    UPDATE bank_accounts SET deposited_balance = deposited_balance - ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(property.current_price, characterId);
  
  // Create deed
  const deedId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO property_deeds (id, property_id, owner_id, purchase_price)
    VALUES (?, ?, ?, ?)
  `).run(deedId, propertyId, characterId, property.current_price);
  
  // Route payment to bank (closed loop — system property sales go to bank)
  db.prepare('UPDATE system_wallets SET balance_cache = balance_cache + ? WHERE id = ?')
    .run(property.current_price, 'bank');

  // Log transaction
  db.prepare(`
    INSERT INTO economy_transactions (id, type, from_wallet, to_wallet, amount, description)
    VALUES (?, 'purchase', ?, 'bank', ?, ?)
  `).run(crypto.randomUUID(), characterId, property.current_price, `Property: ${property.name}`);
  
  return {
    success: true,
    deedId,
    property: property.name,
    price: property.current_price,
    message: `Congratulations! You now own ${property.name}!`
  };
}

/**
 * Buy property with mortgage
 */
function buyPropertyMortgage(db, characterId, propertyId, downPaymentPercent = 20) {
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);
  if (!property) {
    return { success: false, error: 'Property not found' };
  }
  
  // Check not already owned
  const existingDeed = db.prepare('SELECT * FROM property_deeds WHERE property_id = ?').get(propertyId);
  if (existingDeed) {
    return { success: false, error: 'Property already owned' };
  }
  
  // Check buyer doesn't already have a mortgage
  const existingMortgage = db.prepare(`
    SELECT * FROM mortgages WHERE borrower_id = ? AND status = 'active'
  `).get(characterId);
  if (existingMortgage) {
    return { success: false, error: 'You already have an active mortgage' };
  }
  
  // Calculate down payment (minimum 20%)
  const downPayment = Math.ceil(property.current_price * (downPaymentPercent / 100));
  const loanAmount = property.current_price - downPayment;
  
  // Check seasoned funds for down payment
  const seasoning = checkSeasonedFunds(db, characterId, downPayment);
  if (!seasoning.hasSeasonedFunds) {
    return {
      success: false,
      error: 'Down payment funds must be in bank for 3+ days',
      required: downPayment,
      seasoned: seasoning.seasonedAmount,
      message: `You need ${downPayment} USDC seasoned for 3 days. Currently have ${seasoning.seasonedAmount} USDC seasoned.`
    };
  }
  
  // Deduct down payment from bank
  db.prepare(`
    UPDATE bank_accounts SET deposited_balance = deposited_balance - ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(downPayment, characterId);
  
  // Create deed
  const deedId = crypto.randomUUID();
  const mortgageId = crypto.randomUUID();
  
  db.prepare(`
    INSERT INTO property_deeds (id, property_id, owner_id, purchase_price, mortgage_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(deedId, propertyId, characterId, property.current_price, mortgageId);
  
  // Calculate mortgage terms (12 monthly payments, 3% monthly interest)
  const interestRate = 0.03;
  const totalPayments = 12;
  const monthlyPayment = Math.ceil((loanAmount * (1 + interestRate * totalPayments)) / totalPayments);
  
  // Next payment due in 7 days (accelerated for game time)
  const nextDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  db.prepare(`
    INSERT INTO mortgages (id, deed_id, borrower_id, principal, remaining_balance, 
      interest_rate, monthly_payment, total_payments, next_payment_due)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(mortgageId, deedId, characterId, loanAmount, loanAmount, 
    interestRate, monthlyPayment, totalPayments, nextDue);
  
  // Log transaction (use 'loan' type for mortgage)
  db.prepare(`
    INSERT INTO economy_transactions (id, type, from_wallet, to_wallet, amount, description)
    VALUES (?, 'loan', ?, 'system', ?, ?)
  `).run(crypto.randomUUID(), characterId, downPayment, 
    `Mortgage: ${property.name} (${downPayment} down, ${loanAmount} financed)`);
  
  return {
    success: true,
    deedId,
    mortgageId,
    property: property.name,
    totalPrice: property.current_price,
    downPayment,
    loanAmount,
    monthlyPayment,
    totalPayments,
    nextPaymentDue: nextDue,
    message: `Mortgage approved! You now own ${property.name}. First payment of ${monthlyPayment} USDC due in 7 days.`
  };
}

/**
 * Make mortgage payment
 */
function makeMortgagePayment(db, characterId, mortgageId, amount) {
  const mortgage = db.prepare(`
    SELECT m.*, pd.property_id, p.name as property_name
    FROM mortgages m
    JOIN property_deeds pd ON m.deed_id = pd.id
    JOIN properties p ON pd.property_id = p.id
    WHERE m.id = ? AND m.borrower_id = ?
  `).get(mortgageId, characterId);
  
  if (!mortgage) {
    return { success: false, error: 'Mortgage not found' };
  }
  
  if (mortgage.status !== 'active') {
    return { success: false, error: `Mortgage is ${mortgage.status}` };
  }
  
  const payAmount = amount || mortgage.monthly_payment;
  
  // Check bank balance
  const account = db.prepare(`
    SELECT deposited_balance FROM bank_accounts 
    WHERE owner_type = 'player' AND owner_id = ?
  `).get(characterId);
  
  if (!account || account.deposited_balance < payAmount) {
    return { 
      success: false, 
      error: 'Insufficient funds',
      have: account?.deposited_balance || 0,
      need: payAmount
    };
  }
  
  // Deduct payment
  db.prepare(`
    UPDATE bank_accounts SET deposited_balance = deposited_balance - ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(payAmount, characterId);
  
  // Update mortgage
  const newBalance = Math.max(0, mortgage.remaining_balance - payAmount);
  const newPaymentsMade = mortgage.payments_made + 1;
  const nextDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  if (newBalance <= 0) {
    // Paid off!
    db.prepare(`
      UPDATE mortgages SET remaining_balance = 0, payments_made = ?, status = 'paid_off'
      WHERE id = ?
    `).run(newPaymentsMade, mortgageId);
    
    // Clear mortgage from deed
    db.prepare(`UPDATE property_deeds SET mortgage_id = NULL WHERE id = ?`).run(mortgage.deed_id);
    
    return {
      success: true,
      paid: payAmount,
      remainingBalance: 0,
      paidOff: true,
      message: `🎉 Mortgage PAID OFF! You fully own ${mortgage.property_name}!`
    };
  }
  
  db.prepare(`
    UPDATE mortgages SET remaining_balance = ?, payments_made = ?, next_payment_due = ?
    WHERE id = ?
  `).run(newBalance, newPaymentsMade, nextDue, mortgageId);
  
  return {
    success: true,
    paid: payAmount,
    remainingBalance: newBalance,
    paymentsRemaining: mortgage.total_payments - newPaymentsMade,
    nextPaymentDue: nextDue,
    message: `Payment received. ${newBalance} USDC remaining on mortgage.`
  };
}

/**
 * List property for sale
 */
function listPropertyForSale(db, characterId, propertyId, salePrice) {
  const deed = db.prepare(`
    SELECT pd.*, p.name, p.current_price
    FROM property_deeds pd
    JOIN properties p ON pd.property_id = p.id
    WHERE pd.property_id = ? AND pd.owner_id = ?
  `).get(propertyId, characterId);
  
  if (!deed) {
    return { success: false, error: 'You do not own this property' };
  }
  
  if (deed.mortgage_id) {
    const mortgage = db.prepare('SELECT remaining_balance FROM mortgages WHERE id = ?').get(deed.mortgage_id);
    if (mortgage && mortgage.remaining_balance > 0) {
      if (salePrice < mortgage.remaining_balance) {
        return { 
          success: false, 
          error: 'Sale price must cover remaining mortgage',
          mortgageBalance: mortgage.remaining_balance
        };
      }
    }
  }
  
  if (salePrice < 0.01) {
    return { success: false, error: 'Sale price must be at least 1 USDC' };
  }
  
  db.prepare(`
    UPDATE property_deeds SET for_sale = 1, sale_price = ? WHERE id = ?
  `).run(salePrice, deed.id);
  
  return {
    success: true,
    property: deed.name,
    salePrice,
    message: `${deed.name} listed for sale at ${salePrice} USDC`
  };
}

/**
 * Buy property from another player
 */
function buyPropertyFromPlayer(db, buyerId, propertyId) {
  const deed = db.prepare(`
    SELECT pd.*, p.name, c.name as seller_name
    FROM property_deeds pd
    JOIN properties p ON pd.property_id = p.id
    JOIN clawds c ON pd.owner_id = c.id
    WHERE pd.property_id = ? AND pd.for_sale = 1
  `).get(propertyId);
  
  if (!deed) {
    return { success: false, error: 'Property not for sale' };
  }
  
  if (deed.owner_id === buyerId) {
    return { success: false, error: 'Cannot buy your own property' };
  }
  
  // Check buyer funds
  const buyerAccount = db.prepare(`
    SELECT deposited_balance FROM bank_accounts 
    WHERE owner_type = 'player' AND owner_id = ?
  `).get(buyerId);
  
  if (!buyerAccount || buyerAccount.deposited_balance < deed.sale_price) {
    return { 
      success: false, 
      error: 'Insufficient funds',
      have: buyerAccount?.deposited_balance || 0,
      need: deed.sale_price
    };
  }
  
  const sellerId = deed.owner_id;
  
  // Handle mortgage payoff if exists
  let mortgagePayoff = 0;
  if (deed.mortgage_id) {
    const mortgage = db.prepare('SELECT remaining_balance FROM mortgages WHERE id = ?').get(deed.mortgage_id);
    if (mortgage) {
      mortgagePayoff = mortgage.remaining_balance;
      db.prepare(`UPDATE mortgages SET status = 'paid_off', remaining_balance = 0 WHERE id = ?`).run(deed.mortgage_id);
    }
  }
  
  const sellerProceeds = deed.sale_price - mortgagePayoff;
  
  // Transfer funds
  db.prepare(`
    UPDATE bank_accounts SET deposited_balance = deposited_balance - ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(deed.sale_price, buyerId);
  
  db.prepare(`
    UPDATE bank_accounts SET deposited_balance = deposited_balance + ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(sellerProceeds, sellerId);
  
  // Transfer deed
  db.prepare(`
    UPDATE property_deeds 
    SET owner_id = ?, for_sale = 0, sale_price = NULL, mortgage_id = NULL, purchased_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(buyerId, deed.id);
  
  // Log transaction
  db.prepare(`
    INSERT INTO economy_transactions (id, type, from_wallet, to_wallet, amount, description)
    VALUES (?, 'sale', ?, ?, ?, ?)
  `).run(crypto.randomUUID(), buyerId, sellerId, deed.sale_price, `Property: ${deed.name}`);
  
  return {
    success: true,
    property: deed.name,
    price: deed.sale_price,
    seller: deed.seller_name,
    mortgagePaidOff: mortgagePayoff,
    message: `You purchased ${deed.name} for ${deed.sale_price} USDC!`
  };
}

/**
 * List property for rent
 */
function listPropertyForRent(db, characterId, propertyId, rentPrice) {
  const deed = db.prepare(`
    SELECT pd.*, p.name
    FROM property_deeds pd
    JOIN properties p ON pd.property_id = p.id
    WHERE pd.property_id = ? AND pd.owner_id = ?
  `).get(propertyId, characterId);
  
  if (!deed) {
    return { success: false, error: 'You do not own this property' };
  }
  
  // Check not already rented
  const existingRental = db.prepare(`
    SELECT * FROM rental_agreements WHERE property_id = ? AND status = 'active'
  `).get(propertyId);
  
  if (existingRental) {
    return { success: false, error: 'Property already has an active tenant' };
  }
  
  if (rentPrice < 0.001) {
    return { success: false, error: 'Rent must be at least 1 USDC' };
  }
  
  db.prepare(`
    UPDATE property_deeds SET for_rent = 1, rent_price = ? WHERE id = ?
  `).run(rentPrice, deed.id);
  
  return {
    success: true,
    property: deed.name,
    rentPrice,
    message: `${deed.name} listed for rent at ${rentPrice} USDC/week`
  };
}

/**
 * Rent a property
 */
function rentProperty(db, tenantId, propertyId) {
  const deed = db.prepare(`
    SELECT pd.*, p.name, c.name as landlord_name
    FROM property_deeds pd
    JOIN properties p ON pd.property_id = p.id
    JOIN clawds c ON pd.owner_id = c.id
    WHERE pd.property_id = ? AND pd.for_rent = 1
  `).get(propertyId);
  
  if (!deed) {
    return { success: false, error: 'Property not available for rent' };
  }
  
  if (deed.owner_id === tenantId) {
    return { success: false, error: 'Cannot rent your own property' };
  }
  
  const deposit = deed.rent_price * 2; // 2 weeks deposit
  const totalDue = deed.rent_price + deposit;
  
  // Check tenant funds
  const tenantAccount = db.prepare(`
    SELECT deposited_balance FROM bank_accounts 
    WHERE owner_type = 'player' AND owner_id = ?
  `).get(tenantId);
  
  if (!tenantAccount || tenantAccount.deposited_balance < totalDue) {
    return { 
      success: false, 
      error: 'Insufficient funds (need first week rent + deposit)',
      have: tenantAccount?.deposited_balance || 0,
      need: totalDue
    };
  }
  
  // Deduct from tenant
  db.prepare(`
    UPDATE bank_accounts SET deposited_balance = deposited_balance - ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(totalDue, tenantId);
  
  // Pay landlord first week's rent
  db.prepare(`
    UPDATE bank_accounts SET deposited_balance = deposited_balance + ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(deed.rent_price, deed.owner_id);
  
  // Create rental agreement (deposit held in escrow - not given to landlord yet)
  const nextRentDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  db.prepare(`
    INSERT INTO rental_agreements (id, property_id, landlord_id, tenant_id, rent_amount, deposit_amount, next_rent_due)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), propertyId, deed.owner_id, tenantId, deed.rent_price, deposit, nextRentDue);
  
  // Remove from listing
  db.prepare(`UPDATE property_deeds SET for_rent = 0 WHERE id = ?`).run(deed.id);
  
  return {
    success: true,
    property: deed.name,
    landlord: deed.landlord_name,
    rent: deed.rent_price,
    deposit,
    nextRentDue,
    message: `You are now renting ${deed.name}! Rent of ${deed.rent_price} USDC due weekly.`
  };
}

/**
 * Pay rent
 */
function payRent(db, tenantId, rentalId) {
  const rental = db.prepare(`
    SELECT ra.*, p.name as property_name
    FROM rental_agreements ra
    JOIN properties p ON ra.property_id = p.id
    WHERE ra.id = ? AND ra.tenant_id = ? AND ra.status = 'active'
  `).get(rentalId, tenantId);
  
  if (!rental) {
    return { success: false, error: 'Rental agreement not found' };
  }
  
  // Check tenant funds
  const tenantAccount = db.prepare(`
    SELECT deposited_balance FROM bank_accounts 
    WHERE owner_type = 'player' AND owner_id = ?
  `).get(tenantId);
  
  if (!tenantAccount || tenantAccount.deposited_balance < rental.rent_amount) {
    return { 
      success: false, 
      error: 'Insufficient funds for rent',
      have: tenantAccount?.deposited_balance || 0,
      need: rental.rent_amount
    };
  }
  
  // Transfer rent
  db.prepare(`
    UPDATE bank_accounts SET deposited_balance = deposited_balance - ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(rental.rent_amount, tenantId);
  
  db.prepare(`
    UPDATE bank_accounts SET deposited_balance = deposited_balance + ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(rental.rent_amount, rental.landlord_id);
  
  // Update next due date
  const nextDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`UPDATE rental_agreements SET next_rent_due = ? WHERE id = ?`).run(nextDue, rentalId);
  
  return {
    success: true,
    property: rental.property_name,
    paid: rental.rent_amount,
    nextDue,
    message: `Rent paid! Next payment due in 7 days.`
  };
}

/**
 * Get player's properties
 */
function getPlayerProperties(db, characterId) {
  const owned = db.prepare(`
    SELECT pd.*, p.name, p.type, p.location, p.current_price,
      m.remaining_balance as mortgage_balance, m.monthly_payment, m.next_payment_due
    FROM property_deeds pd
    JOIN properties p ON pd.property_id = p.id
    LEFT JOIN mortgages m ON pd.mortgage_id = m.id AND m.status = 'active'
    WHERE pd.owner_id = ?
  `).all(characterId);
  
  const renting = db.prepare(`
    SELECT ra.*, p.name, p.type, p.location
    FROM rental_agreements ra
    JOIN properties p ON ra.property_id = p.id
    WHERE ra.tenant_id = ? AND ra.status = 'active'
  `).all(characterId);
  
  return { owned, renting };
}

/**
 * Get properties for sale/rent
 */
function getListings(db, type = 'all') {
  let forSale = [];
  let forRent = [];
  
  if (type === 'all' || type === 'sale') {
    forSale = db.prepare(`
      SELECT pd.*, p.name, p.type, p.location, c.name as owner_name
      FROM property_deeds pd
      JOIN properties p ON pd.property_id = p.id
      JOIN clawds c ON pd.owner_id = c.id
      WHERE pd.for_sale = 1
    `).all();
  }
  
  if (type === 'all' || type === 'rent') {
    forRent = db.prepare(`
      SELECT pd.*, p.name, p.type, p.location, c.name as owner_name
      FROM property_deeds pd
      JOIN properties p ON pd.property_id = p.id
      JOIN clawds c ON pd.owner_id = c.id
      WHERE pd.for_rent = 1
    `).all();
  }
  
  return { forSale, forRent };
}

/**
 * Check for overdue mortgages (call from cron)
 */
function checkOverdueMortgages(db) {
  const overdue = db.prepare(`
    SELECT m.*, pd.property_id, p.name as property_name, c.name as borrower_name
    FROM mortgages m
    JOIN property_deeds pd ON m.deed_id = pd.id
    JOIN properties p ON pd.property_id = p.id
    JOIN clawds c ON m.borrower_id = c.id
    WHERE m.status = 'active' AND m.next_payment_due < datetime('now')
  `).all();
  
  const results = [];
  
  for (const mortgage of overdue) {
    // Foreclosure after 2 missed payments (14 days overdue)
    const daysOverdue = Math.floor((Date.now() - new Date(mortgage.next_payment_due).getTime()) / (24 * 60 * 60 * 1000));
    
    if (daysOverdue >= 14) {
      // FORECLOSURE
      db.prepare(`UPDATE mortgages SET status = 'foreclosed' WHERE id = ?`).run(mortgage.id);
      db.prepare(`DELETE FROM property_deeds WHERE id = ?`).run(mortgage.deed_id);
      
      results.push({
        type: 'foreclosure',
        property: mortgage.property_name,
        borrower: mortgage.borrower_name,
        balance: mortgage.remaining_balance
      });
    } else {
      results.push({
        type: 'warning',
        property: mortgage.property_name,
        borrower: mortgage.borrower_name,
        daysOverdue,
        daysUntilForeclosure: 14 - daysOverdue
      });
    }
  }
  
  return results;
}

module.exports = {
  PROPERTY_TYPES,
  LOCATIONS,
  initRealEstateDB,
  checkSeasonedFunds,
  recordBalance,
  getAvailableProperties,
  buyPropertyCash,
  buyPropertyMortgage,
  makeMortgagePayment,
  listPropertyForSale,
  buyPropertyFromPlayer,
  listPropertyForRent,
  rentProperty,
  payRent,
  getPlayerProperties,
  getListings,
  checkOverdueMortgages
};
