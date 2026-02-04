/**
 * Peer-to-Peer Trading System
 * 
 * Players can:
 * - Send USDC directly to other players
 * - Trade materials for USDC or other materials
 * - Create/accept/reject trade offers
 */

const crypto = require('crypto');
const wallet = require('./wallet');
const { ENCRYPTION_KEY } = require('./init-economy');

/**
 * Send USDC directly to another player
 */
async function sendUSDC(db, fromCharId, toCharId, amount) {
  // Prevent self-sends
  if (fromCharId === toCharId) {
    return { success: false, error: 'Cannot send to yourself' };
  }
  
  // Get both characters
  const fromChar = db.prepare('SELECT * FROM clawds WHERE id = ?').get(fromCharId);
  const toChar = db.prepare('SELECT * FROM clawds WHERE id = ?').get(toCharId);
  
  if (!fromChar || !toChar) {
    return { success: false, error: 'Character not found' };
  }
  
  if (!fromChar.wallet_public_key || !fromChar.wallet_encrypted_secret) {
    return { success: false, error: 'Sender has no wallet' };
  }
  
  if (!toChar.wallet_public_key) {
    return { success: false, error: 'Recipient has no wallet' };
  }
  
  if (amount <= 0) {
    return { success: false, error: 'Invalid amount' };
  }
  
  // Decrypt sender's secret key
  const senderSecret = wallet.decryptSecretKey(fromChar.wallet_encrypted_secret, ENCRYPTION_KEY);
  
  // Transfer USDC
  const transfer = await wallet.transferUSDC(senderSecret, toChar.wallet_public_key, amount);
  
  if (!transfer.success) {
    console.log(`⚠️ P2P USDC transfer failed (simulating): ${transfer.error}`);
  }
  
  // Log transaction (use 'transfer' type for p2p)
  db.prepare(`
    INSERT INTO economy_transactions (id, type, from_wallet, to_wallet, amount, signature, description)
    VALUES (?, 'transfer', ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    fromChar.wallet_public_key,
    toChar.wallet_public_key,
    amount,
    transfer.signature || 'simulated',
    `P2P: ${fromChar.name} sent ${amount} USDC to ${toChar.name}`
  );
  
  return {
    success: true,
    from: fromChar.name,
    to: toChar.name,
    amount,
    signature: transfer.signature || 'simulated'
  };
}

/**
 * Send materials to another player
 */
function sendMaterials(db, fromCharId, toCharId, materialId, quantity) {
  // Prevent self-sends
  if (fromCharId === toCharId) {
    return { success: false, error: 'Cannot send to yourself' };
  }
  
  // Get both characters
  const fromChar = db.prepare('SELECT * FROM clawds WHERE id = ?').get(fromCharId);
  const toChar = db.prepare('SELECT * FROM clawds WHERE id = ?').get(toCharId);
  
  if (!fromChar || !toChar) {
    return { success: false, error: 'Character not found' };
  }
  
  // Check sender has enough materials
  const senderMat = db.prepare(`
    SELECT * FROM player_materials WHERE character_id = ? AND material_id = ?
  `).get(fromCharId, materialId);
  
  if (!senderMat || senderMat.quantity < quantity) {
    return { 
      success: false, 
      error: 'Insufficient materials',
      have: senderMat?.quantity || 0,
      need: quantity
    };
  }
  
  // Get material info
  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(materialId);
  if (!material) {
    return { success: false, error: 'Unknown material' };
  }
  
  // Remove from sender
  if (senderMat.quantity === quantity) {
    db.prepare('DELETE FROM player_materials WHERE id = ?').run(senderMat.id);
  } else {
    db.prepare('UPDATE player_materials SET quantity = quantity - ? WHERE id = ?')
      .run(quantity, senderMat.id);
  }
  
  // Add to recipient
  db.prepare(`
    INSERT INTO player_materials (id, character_id, material_id, quantity)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(character_id, material_id) DO UPDATE SET quantity = quantity + ?
  `).run(crypto.randomUUID(), toCharId, materialId, quantity, quantity);
  
  // Log transaction (use 'transfer' type for p2p)
  db.prepare(`
    INSERT INTO economy_transactions (id, type, from_wallet, to_wallet, amount, description)
    VALUES (?, 'transfer', ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    fromCharId,
    toCharId,
    quantity,
    `P2P: ${fromChar.name} sent ${quantity}x ${material.name} to ${toChar.name}`
  );
  
  return {
    success: true,
    from: fromChar.name,
    to: toChar.name,
    material: material.name,
    quantity
  };
}

/**
 * Create a trade offer
 * IMPORTANT: Materials are LOCKED when offer is created, returned if cancelled/expired
 */
function createTradeOffer(db, fromCharId, offer) {
  const { 
    toCharId,           // null = open offer, or specific player
    offeringUsdc,       // USDC amount offering
    offeringMaterials,  // [{materialId, quantity}]
    wantingUsdc,        // USDC amount wanting
    wantingMaterials,   // [{materialId, quantity}]
    expiresIn           // minutes until expiry
  } = offer;
  
  const fromChar = db.prepare('SELECT * FROM clawds WHERE id = ?').get(fromCharId);
  if (!fromChar) {
    return { success: false, error: 'Character not found' };
  }
  
  // Validate USDC offering
  if (offeringUsdc !== undefined && offeringUsdc !== null) {
    if (offeringUsdc < 0) {
      return { success: false, error: 'Invalid USDC amount' };
    }
    if (offeringUsdc > 0) {
      // Check bank balance for USDC offers
      const bank = db.prepare(`
        SELECT deposited_balance FROM bank_accounts WHERE owner_type = 'player' AND owner_id = ?
      `).get(fromCharId);
      if (!bank || bank.deposited_balance < offeringUsdc) {
        return { 
          success: false, 
          error: 'Insufficient USDC in bank',
          have: bank?.deposited_balance || 0,
          need: offeringUsdc
        };
      }
    }
  }
  
  // Validate and LOCK offering materials
  const materialsToLock = [];
  if (offeringMaterials && offeringMaterials.length > 0) {
    for (const mat of offeringMaterials) {
      // Validate quantity
      if (!mat.quantity || mat.quantity < 1) {
        return { success: false, error: `Invalid quantity for ${mat.materialId}` };
      }
      
      const playerMat = db.prepare(`
        SELECT * FROM player_materials WHERE character_id = ? AND material_id = ?
      `).get(fromCharId, mat.materialId);
      
      if (!playerMat || playerMat.quantity < mat.quantity) {
        return { 
          success: false, 
          error: `Insufficient ${mat.materialId}`,
          have: playerMat?.quantity || 0,
          need: mat.quantity
        };
      }
      
      materialsToLock.push({ 
        id: playerMat.id, 
        materialId: mat.materialId, 
        quantity: mat.quantity,
        currentQty: playerMat.quantity 
      });
    }
    
    // Lock materials (remove from inventory)
    for (const lock of materialsToLock) {
      if (lock.currentQty === lock.quantity) {
        db.prepare('DELETE FROM player_materials WHERE id = ?').run(lock.id);
      } else {
        db.prepare('UPDATE player_materials SET quantity = quantity - ? WHERE id = ?')
          .run(lock.quantity, lock.id);
      }
    }
  }
  
  // Lock USDC in bank if offering any
  if (offeringUsdc && offeringUsdc > 0) {
    db.prepare(`
      UPDATE bank_accounts SET deposited_balance = deposited_balance - ? 
      WHERE owner_type = 'player' AND owner_id = ?
    `).run(offeringUsdc, fromCharId);
  }
  
  const offerId = crypto.randomUUID();
  const expiresAt = expiresIn 
    ? new Date(Date.now() + expiresIn * 60 * 1000).toISOString()
    : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default 24h
  
  db.prepare(`
    INSERT INTO trade_offers (
      id, from_character_id, to_character_id,
      offering_usdc, offering_materials,
      wanting_usdc, wanting_materials,
      status, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    offerId,
    fromCharId,
    toCharId || null,
    offeringUsdc || 0,
    JSON.stringify(offeringMaterials || []),
    wantingUsdc || 0,
    JSON.stringify(wantingMaterials || []),
    expiresAt
  );
  
  return {
    success: true,
    offerId,
    expiresAt,
    locked: {
      usdc: offeringUsdc || 0,
      materials: materialsToLock.map(m => ({ id: m.materialId, qty: m.quantity }))
    },
    message: toCharId 
      ? `Trade offer sent to ${db.prepare('SELECT name FROM clawds WHERE id = ?').get(toCharId)?.name}`
      : 'Open trade offer created'
  };
}

/**
 * Accept a trade offer
 */
async function acceptTradeOffer(db, offerId, acceptingCharId) {
  const offer = db.prepare('SELECT * FROM trade_offers WHERE id = ?').get(offerId);
  
  if (!offer) {
    return { success: false, error: 'Trade offer not found' };
  }
  
  if (offer.status !== 'pending') {
    return { success: false, error: `Trade already ${offer.status}` };
  }
  
  if (new Date(offer.expires_at) < new Date()) {
    db.prepare('UPDATE trade_offers SET status = ? WHERE id = ?').run('expired', offerId);
    return { success: false, error: 'Trade offer expired' };
  }
  
  if (offer.to_character_id && offer.to_character_id !== acceptingCharId) {
    return { success: false, error: 'This offer is not for you' };
  }
  
  if (offer.from_character_id === acceptingCharId) {
    return { success: false, error: 'Cannot accept your own offer' };
  }
  
  const fromChar = db.prepare('SELECT * FROM clawds WHERE id = ?').get(offer.from_character_id);
  const toChar = db.prepare('SELECT * FROM clawds WHERE id = ?').get(acceptingCharId);
  
  // Parse offer contents
  const offeringMaterials = JSON.parse(offer.offering_materials || '[]');
  const wantingMaterials = JSON.parse(offer.wanting_materials || '[]');
  
  // Validate accepter has what's wanted
  if (offer.wanting_usdc > 0) {
    // Check USDC balance (simplified - would check on-chain in production)
    const balance = await wallet.getUSDCBalance(toChar.wallet_public_key);
    if (balance < offer.wanting_usdc) {
      return { success: false, error: 'Insufficient USDC' };
    }
  }
  
  for (const mat of wantingMaterials) {
    const accepterMat = db.prepare(`
      SELECT quantity FROM player_materials WHERE character_id = ? AND material_id = ?
    `).get(acceptingCharId, mat.materialId);
    
    if (!accepterMat || accepterMat.quantity < mat.quantity) {
      return { 
        success: false, 
        error: `Insufficient ${mat.materialId}`,
        have: accepterMat?.quantity || 0,
        need: mat.quantity
      };
    }
  }
  
  // Execute the trade
  const results = [];
  
  // OFFERING: Items were LOCKED when trade was created, give them to accepter
  // Give locked USDC to accepter (credit their bank directly)
  if (offer.offering_usdc > 0) {
    db.prepare(`
      INSERT INTO bank_accounts (id, owner_type, owner_id, deposited_balance)
      VALUES (?, 'player', ?, ?)
      ON CONFLICT(owner_type, owner_id) DO UPDATE SET deposited_balance = deposited_balance + ?
    `).run(crypto.randomUUID(), acceptingCharId, offer.offering_usdc, offer.offering_usdc);
    
    results.push({ type: 'usdc', direction: 'received', amount: offer.offering_usdc, success: true });
  }
  
  // Give locked materials to accepter (they were removed from offerer when created)
  for (const mat of offeringMaterials) {
    db.prepare(`
      INSERT INTO player_materials (id, character_id, material_id, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(character_id, material_id) DO UPDATE SET quantity = quantity + ?
    `).run(crypto.randomUUID(), acceptingCharId, mat.materialId, mat.quantity, mat.quantity);
    
    results.push({ type: 'material', direction: 'received', materialId: mat.materialId, quantity: mat.quantity, success: true });
  }
  
  // WANTING: These come from the accepter, use normal transfer
  // Transfer wanting USDC (from accepter to offerer)
  if (offer.wanting_usdc > 0) {
    const usdcResult = await sendUSDC(db, acceptingCharId, offer.from_character_id, offer.wanting_usdc);
    results.push({ type: 'usdc', direction: 'sent', amount: offer.wanting_usdc, ...usdcResult });
  }
  
  // Transfer wanting materials (from accepter to offerer)
  for (const mat of wantingMaterials) {
    const matResult = sendMaterials(db, acceptingCharId, offer.from_character_id, mat.materialId, mat.quantity);
    results.push({ type: 'material', direction: 'sent', ...matResult });
  }
  
  // Mark trade complete
  db.prepare('UPDATE trade_offers SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('completed', offerId);
  
  return {
    success: true,
    message: `Trade completed between ${fromChar.name} and ${toChar.name}`,
    results
  };
}

/**
 * Reject/cancel a trade offer
 * Returns locked materials/USDC to the offerer
 */
function rejectTradeOffer(db, offerId, characterId) {
  const offer = db.prepare('SELECT * FROM trade_offers WHERE id = ?').get(offerId);
  
  if (!offer) {
    return { success: false, error: 'Trade offer not found' };
  }
  
  if (offer.status !== 'pending') {
    return { success: false, error: `Trade already ${offer.status}` };
  }
  
  // Can reject if you're the recipient or cancel if you're the sender
  if (offer.from_character_id !== characterId && offer.to_character_id !== characterId) {
    return { success: false, error: 'Not your trade to reject' };
  }
  
  const status = offer.from_character_id === characterId ? 'cancelled' : 'rejected';
  
  // Return locked materials to offerer
  const offeringMaterials = JSON.parse(offer.offering_materials || '[]');
  for (const mat of offeringMaterials) {
    db.prepare(`
      INSERT INTO player_materials (id, character_id, material_id, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(character_id, material_id) DO UPDATE SET quantity = quantity + ?
    `).run(crypto.randomUUID(), offer.from_character_id, mat.materialId, mat.quantity, mat.quantity);
  }
  
  // Return locked USDC to offerer's bank
  if (offer.offering_usdc > 0) {
    db.prepare(`
      INSERT INTO bank_accounts (id, owner_type, owner_id, deposited_balance)
      VALUES (?, 'player', ?, ?)
      ON CONFLICT(owner_type, owner_id) DO UPDATE SET deposited_balance = deposited_balance + ?
    `).run(crypto.randomUUID(), offer.from_character_id, offer.offering_usdc, offer.offering_usdc);
  }
  
  db.prepare('UPDATE trade_offers SET status = ? WHERE id = ?').run(status, offerId);
  
  return { 
    success: true, 
    status,
    returned: {
      usdc: offer.offering_usdc,
      materials: offeringMaterials
    }
  };
}

/**
 * Get trade offers for a character
 */
function getTradeOffers(db, characterId, includeOpen = true) {
  let query = `
    SELECT 
      t.*,
      fc.name as from_name,
      tc.name as to_name
    FROM trade_offers t
    LEFT JOIN clawds fc ON t.from_character_id = fc.id
    LEFT JOIN clawds tc ON t.to_character_id = tc.id
    WHERE t.status = 'pending'
      AND t.expires_at > datetime('now')
      AND (t.from_character_id = ? OR t.to_character_id = ?`;
  
  if (includeOpen) {
    query += ` OR t.to_character_id IS NULL)`;
  } else {
    query += `)`;
  }
  
  query += ` ORDER BY t.created_at DESC`;
  
  const offers = db.prepare(query).all(characterId, characterId);
  
  return offers.map(o => ({
    id: o.id,
    from: { id: o.from_character_id, name: o.from_name },
    to: o.to_character_id ? { id: o.to_character_id, name: o.to_name } : null,
    offering: {
      usdc: o.offering_usdc,
      materials: JSON.parse(o.offering_materials || '[]')
    },
    wanting: {
      usdc: o.wanting_usdc,
      materials: JSON.parse(o.wanting_materials || '[]')
    },
    expiresAt: o.expires_at,
    isOpenOffer: !o.to_character_id,
    isYourOffer: o.from_character_id === characterId
  }));
}

/**
 * Search for players to trade with
 */
function searchPlayers(db, query, excludeCharId) {
  return db.prepare(`
    SELECT id, name, level, race, class 
    FROM clawds 
    WHERE id != ? AND (name LIKE ? OR id LIKE ?)
    LIMIT 10
  `).all(excludeCharId, `%${query}%`, `%${query}%`);
}

/**
 * Process expired trades and return locked items to offerers
 * Call this from a cron job
 */
function processExpiredTrades(db) {
  const expired = db.prepare(`
    SELECT * FROM trade_offers 
    WHERE status = 'pending' AND expires_at < datetime('now')
  `).all();
  
  const results = [];
  for (const offer of expired) {
    // Return locked materials
    const offeringMaterials = JSON.parse(offer.offering_materials || '[]');
    for (const mat of offeringMaterials) {
      db.prepare(`
        INSERT INTO player_materials (id, character_id, material_id, quantity)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(character_id, material_id) DO UPDATE SET quantity = quantity + ?
      `).run(crypto.randomUUID(), offer.from_character_id, mat.materialId, mat.quantity, mat.quantity);
    }
    
    // Return locked USDC
    if (offer.offering_usdc > 0) {
      db.prepare(`
        INSERT INTO bank_accounts (id, owner_type, owner_id, deposited_balance)
        VALUES (?, 'player', ?, ?)
        ON CONFLICT(owner_type, owner_id) DO UPDATE SET deposited_balance = deposited_balance + ?
      `).run(crypto.randomUUID(), offer.from_character_id, offer.offering_usdc, offer.offering_usdc);
    }
    
    // Mark as expired
    db.prepare('UPDATE trade_offers SET status = ? WHERE id = ?').run('expired', offer.id);
    
    results.push({
      offerId: offer.id,
      returned: {
        usdc: offer.offering_usdc,
        materials: offeringMaterials
      }
    });
  }
  
  return { processed: results.length, results };
}

module.exports = {
  sendUSDC,
  sendMaterials,
  createTradeOffer,
  acceptTradeOffer,
  rejectTradeOffer,
  getTradeOffers,
  searchPlayers,
  processExpiredTrades
};
