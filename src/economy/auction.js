/**
 * Auction House System
 * 
 * Players can list items/materials for auction.
 * Other players can bid.
 * Highest bidder wins when auction ends.
 */

const crypto = require('crypto');
const wallet = require('./wallet');
const { ENCRYPTION_KEY } = require('./init-economy');

/**
 * Create an auction listing
 */
function createAuction(db, sellerId, listing) {
  const {
    itemType,         // 'material' or 'item'
    itemId,           // material_id or item_id
    quantity,         // how many
    startingBid,      // minimum bid in USDC
    buyoutPrice,      // instant buy price (optional)
    durationHours     // how long auction runs
  } = listing;
  
  const seller = db.prepare('SELECT * FROM clawds WHERE id = ?').get(sellerId);
  if (!seller) {
    return { success: false, error: 'Seller not found' };
  }
  
  // Validate inputs
  if (!quantity || quantity < 1) {
    return { success: false, error: 'Quantity must be at least 1' };
  }
  
  if (!startingBid || startingBid < 0.01) {
    return { success: false, error: 'Starting bid must be at least 0.01 USDC' };
  }
  
  if (buyoutPrice && buyoutPrice <= startingBid) {
    return { success: false, error: 'Buyout price must be higher than starting bid' };
  }
  
  // Validate seller has the items
  if (itemType === 'material') {
    const mat = db.prepare(`
      SELECT * FROM player_materials WHERE character_id = ? AND material_id = ?
    `).get(sellerId, itemId);
    
    if (!mat || mat.quantity < quantity) {
      return { success: false, error: 'Insufficient materials' };
    }
    
    // Lock the materials (remove from inventory)
    if (mat.quantity === quantity) {
      db.prepare('DELETE FROM player_materials WHERE id = ?').run(mat.id);
    } else {
      db.prepare('UPDATE player_materials SET quantity = quantity - ? WHERE id = ?')
        .run(quantity, mat.id);
    }
  } else if (itemType === 'item') {
    const item = db.prepare(`
      SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ? AND equipped = 0
    `).get(sellerId, itemId);
    
    if (!item || item.quantity < quantity) {
      return { success: false, error: 'Insufficient items' };
    }
    
    // Lock the items
    if (item.quantity === quantity) {
      db.prepare('DELETE FROM character_inventory WHERE id = ?').run(item.id);
    } else {
      db.prepare('UPDATE character_inventory SET quantity = quantity - ? WHERE id = ?')
        .run(quantity, item.id);
    }
  } else {
    return { success: false, error: 'Invalid item type' };
  }
  
  const auctionId = crypto.randomUUID();
  const endsAt = new Date(Date.now() + (durationHours || 24) * 60 * 60 * 1000);
  
  db.prepare(`
    INSERT INTO auctions (
      id, seller_id, item_type, item_id, quantity,
      starting_bid, buyout_price, current_bid, current_bidder_id,
      status, ends_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'active', ?)
  `).run(
    auctionId,
    sellerId,
    itemType,
    itemId,
    quantity,
    startingBid,
    buyoutPrice || null,
    startingBid,
    endsAt.toISOString()
  );
  
  return {
    success: true,
    auctionId,
    endsAt: endsAt.toISOString(),
    message: `Auction created! Starting bid: ${startingBid} USDC`
  };
}

/**
 * Place a bid on an auction
 */
async function placeBid(db, bidderId, auctionId, bidAmount) {
  const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);
  
  if (!auction) {
    return { success: false, error: 'Auction not found' };
  }
  
  if (auction.status !== 'active') {
    return { success: false, error: `Auction is ${auction.status}` };
  }
  
  if (new Date(auction.ends_at) < new Date()) {
    // Auction ended, finalize it
    await finalizeAuction(db, auctionId);
    return { success: false, error: 'Auction has ended' };
  }
  
  if (auction.seller_id === bidderId) {
    return { success: false, error: 'Cannot bid on your own auction' };
  }
  
  if (bidAmount <= auction.current_bid) {
    return { success: false, error: `Bid must be higher than ${auction.current_bid} USDC` };
  }
  
  // Check buyout
  if (auction.buyout_price && bidAmount >= auction.buyout_price) {
    return await buyout(db, bidderId, auctionId);
  }
  
  const bidder = db.prepare('SELECT * FROM clawds WHERE id = ?').get(bidderId);
  if (!bidder) {
    return { success: false, error: 'Bidder not found' };
  }
  
  // CRITICAL: Verify bidder has sufficient funds
  if (!bidder.wallet_public_key) {
    return { success: false, error: 'You need a wallet to bid' };
  }
  
  // Check bank + wallet balance (since on-chain is simulated)
  const bidderBank = db.prepare(`
    SELECT deposited_balance FROM bank_accounts WHERE owner_type = 'player' AND owner_id = ?
  `).get(bidderId);
  const bidderBankBalance = bidderBank?.deposited_balance || 0;
  const bidderOnChain = await wallet.getUSDCBalance(bidder.wallet_public_key);
  const totalAvailable = bidderBankBalance + bidderOnChain;
  
  if (totalAvailable < bidAmount) {
    return { 
      success: false, 
      error: 'Insufficient USDC to cover your bid',
      have: totalAvailable,
      need: bidAmount,
      bankBalance: bidderBankBalance,
      walletBalance: bidderOnChain
    };
  }
  
  // Update auction with new bid
  db.prepare(`
    UPDATE auctions 
    SET current_bid = ?, current_bidder_id = ?
    WHERE id = ?
  `).run(bidAmount, bidderId, auctionId);
  
  // Record bid history
  db.prepare(`
    INSERT INTO auction_bids (id, auction_id, bidder_id, amount)
    VALUES (?, ?, ?, ?)
  `).run(crypto.randomUUID(), auctionId, bidderId, bidAmount);
  
  return {
    success: true,
    bid: bidAmount,
    message: `Bid placed! You are the highest bidder at ${bidAmount} USDC`,
    endsAt: auction.ends_at
  };
}

/**
 * Buyout an auction immediately
 */
async function buyout(db, buyerId, auctionId) {
  const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);
  
  if (!auction || !auction.buyout_price) {
    return { success: false, error: 'Invalid buyout' };
  }
  
  if (auction.status !== 'active') {
    return { success: false, error: `Auction is ${auction.status}` };
  }
  
  if (auction.seller_id === buyerId) {
    return { success: false, error: 'Cannot buy your own auction' };
  }
  
  const buyer = db.prepare('SELECT * FROM clawds WHERE id = ?').get(buyerId);
  const seller = db.prepare('SELECT * FROM clawds WHERE id = ?').get(auction.seller_id);
  
  if (!buyer || !seller) {
    return { success: false, error: 'Invalid buyer or seller' };
  }
  
  // CRITICAL: Verify buyer has sufficient funds before proceeding
  if (!buyer.wallet_public_key) {
    return { success: false, error: 'You need a wallet to purchase' };
  }
  
  // Check bank balance as source of funds (since on-chain is simulated)
  const buyerBank = db.prepare(`
    SELECT deposited_balance FROM bank_accounts WHERE owner_type = 'player' AND owner_id = ?
  `).get(buyerId);
  const buyerBankBalance = buyerBank?.deposited_balance || 0;
  
  // Also check on-chain balance
  const buyerOnChain = await wallet.getUSDCBalance(buyer.wallet_public_key);
  const totalAvailable = buyerBankBalance + buyerOnChain;
  
  if (totalAvailable < auction.buyout_price) {
    return { 
      success: false, 
      error: 'Insufficient USDC',
      have: totalAvailable,
      need: auction.buyout_price,
      bankBalance: buyerBankBalance,
      walletBalance: buyerOnChain
    };
  }
  
  // Deduct from bank first, then wallet
  let remaining = auction.buyout_price;
  if (buyerBankBalance > 0) {
    const fromBank = Math.min(buyerBankBalance, remaining);
    db.prepare(`UPDATE bank_accounts SET deposited_balance = deposited_balance - ? WHERE owner_type = 'player' AND owner_id = ?`)
      .run(fromBank, buyerId);
    remaining -= fromBank;
  }
  
  // Transfer USDC: Buyer -> Seller
  if (buyer.wallet_encrypted_secret && seller.wallet_public_key) {
    const buyerSecret = wallet.decryptSecretKey(buyer.wallet_encrypted_secret, ENCRYPTION_KEY);
    const transfer = await wallet.transferUSDC(buyerSecret, seller.wallet_public_key, auction.buyout_price);
    
    if (!transfer.success) {
      console.log(`⚠️ Auction buyout transfer failed (simulating): ${transfer.error}`);
    }
    
    // Log transaction
    db.prepare(`
      INSERT INTO economy_transactions (id, type, from_wallet, to_wallet, amount, signature, description)
      VALUES (?, 'sale', ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      buyer.wallet_public_key,
      seller.wallet_public_key,
      auction.buyout_price,
      transfer.signature || 'simulated',
      `Auction buyout: ${auction.quantity}x ${auction.item_id}`
    );
  }
  
  // Transfer items to buyer
  if (auction.item_type === 'material') {
    db.prepare(`
      INSERT INTO player_materials (id, character_id, material_id, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(character_id, material_id) DO UPDATE SET quantity = quantity + ?
    `).run(crypto.randomUUID(), buyerId, auction.item_id, auction.quantity, auction.quantity);
  } else {
    db.prepare(`
      INSERT INTO character_inventory (id, character_id, item_id, quantity, equipped, slot)
      VALUES (?, ?, ?, ?, 0, NULL)
      ON CONFLICT(character_id, item_id) DO UPDATE SET quantity = quantity + ?
    `).run(crypto.randomUUID(), buyerId, auction.item_id, auction.quantity, auction.quantity);
  }
  
  // Mark auction complete
  db.prepare(`
    UPDATE auctions 
    SET status = 'sold', current_bid = ?, current_bidder_id = ?, completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(auction.buyout_price, buyerId, auctionId);
  
  return {
    success: true,
    buyout: true,
    price: auction.buyout_price,
    message: `Buyout successful! You purchased ${auction.quantity}x ${auction.item_id} for ${auction.buyout_price} USDC`
  };
}

/**
 * Finalize an ended auction
 */
async function finalizeAuction(db, auctionId) {
  const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);
  
  if (!auction || auction.status !== 'active') {
    return { success: false, error: 'Invalid auction' };
  }
  
  // No bids - return items to seller
  if (!auction.current_bidder_id) {
    if (auction.item_type === 'material') {
      db.prepare(`
        INSERT INTO player_materials (id, character_id, material_id, quantity)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(character_id, material_id) DO UPDATE SET quantity = quantity + ?
      `).run(crypto.randomUUID(), auction.seller_id, auction.item_id, auction.quantity, auction.quantity);
    } else {
      db.prepare(`
        INSERT INTO character_inventory (id, character_id, item_id, quantity, equipped, slot)
        VALUES (?, ?, ?, ?, 0, NULL)
        ON CONFLICT(character_id, item_id) DO UPDATE SET quantity = quantity + ?
      `).run(crypto.randomUUID(), auction.seller_id, auction.item_id, auction.quantity, auction.quantity);
    }
    
    db.prepare('UPDATE auctions SET status = ? WHERE id = ?').run('expired', auctionId);
    
    return { success: true, expired: true, message: 'Auction expired with no bids' };
  }
  
  // Has winner - transfer items and payment
  const winner = db.prepare('SELECT * FROM clawds WHERE id = ?').get(auction.current_bidder_id);
  const seller = db.prepare('SELECT * FROM clawds WHERE id = ?').get(auction.seller_id);
  
  // Transfer USDC: Winner -> Seller
  if (winner?.wallet_encrypted_secret && seller?.wallet_public_key) {
    const winnerSecret = wallet.decryptSecretKey(winner.wallet_encrypted_secret, ENCRYPTION_KEY);
    const transfer = await wallet.transferUSDC(winnerSecret, seller.wallet_public_key, auction.current_bid);
    
    if (!transfer.success) {
      console.log(`⚠️ Auction finalize transfer failed (simulating): ${transfer.error}`);
    }
    
    db.prepare(`
      INSERT INTO economy_transactions (id, type, from_wallet, to_wallet, amount, signature, description)
      VALUES (?, 'sale', ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      winner.wallet_public_key,
      seller.wallet_public_key,
      auction.current_bid,
      transfer.signature || 'simulated',
      `Auction won: ${auction.quantity}x ${auction.item_id}`
    );
  }
  
  // Transfer items to winner
  if (auction.item_type === 'material') {
    db.prepare(`
      INSERT INTO player_materials (id, character_id, material_id, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(character_id, material_id) DO UPDATE SET quantity = quantity + ?
    `).run(crypto.randomUUID(), auction.current_bidder_id, auction.item_id, auction.quantity, auction.quantity);
  } else {
    db.prepare(`
      INSERT INTO character_inventory (id, character_id, item_id, quantity, equipped, slot)
      VALUES (?, ?, ?, ?, 0, NULL)
      ON CONFLICT(character_id, item_id) DO UPDATE SET quantity = quantity + ?
    `).run(crypto.randomUUID(), auction.current_bidder_id, auction.item_id, auction.quantity, auction.quantity);
  }
  
  // Mark auction complete
  db.prepare(`
    UPDATE auctions SET status = 'sold', completed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(auctionId);
  
  return {
    success: true,
    sold: true,
    winner: winner?.name,
    price: auction.current_bid,
    message: `Auction won by ${winner?.name} for ${auction.current_bid} USDC`
  };
}

/**
 * Cancel an auction (only if no bids)
 */
function cancelAuction(db, sellerId, auctionId) {
  const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);
  
  if (!auction) {
    return { success: false, error: 'Auction not found' };
  }
  
  if (auction.seller_id !== sellerId) {
    return { success: false, error: 'Not your auction' };
  }
  
  if (auction.current_bidder_id) {
    return { success: false, error: 'Cannot cancel auction with bids' };
  }
  
  if (auction.status !== 'active') {
    return { success: false, error: `Auction is ${auction.status}` };
  }
  
  // Return items to seller
  if (auction.item_type === 'material') {
    db.prepare(`
      INSERT INTO player_materials (id, character_id, material_id, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(character_id, material_id) DO UPDATE SET quantity = quantity + ?
    `).run(crypto.randomUUID(), sellerId, auction.item_id, auction.quantity, auction.quantity);
  } else {
    db.prepare(`
      INSERT INTO character_inventory (id, character_id, item_id, quantity, equipped, slot)
      VALUES (?, ?, ?, ?, 0, NULL)
      ON CONFLICT(character_id, item_id) DO UPDATE SET quantity = quantity + ?
    `).run(crypto.randomUUID(), sellerId, auction.item_id, auction.quantity, auction.quantity);
  }
  
  db.prepare('UPDATE auctions SET status = ? WHERE id = ?').run('cancelled', auctionId);
  
  return { success: true, message: 'Auction cancelled, items returned' };
}

/**
 * Get active auctions
 */
function getActiveAuctions(db, filters = {}) {
  let query = `
    SELECT 
      a.*,
      s.name as seller_name,
      b.name as bidder_name,
      m.name as material_name,
      m.rarity as material_rarity
    FROM auctions a
    LEFT JOIN clawds s ON a.seller_id = s.id
    LEFT JOIN clawds b ON a.current_bidder_id = b.id
    LEFT JOIN materials m ON a.item_type = 'material' AND a.item_id = m.id
    WHERE a.status = 'active' AND a.ends_at > datetime('now')
  `;
  
  const params = [];
  
  if (filters.itemType) {
    query += ' AND a.item_type = ?';
    params.push(filters.itemType);
  }
  
  if (filters.itemId) {
    query += ' AND a.item_id = ?';
    params.push(filters.itemId);
  }
  
  if (filters.sellerId) {
    query += ' AND a.seller_id = ?';
    params.push(filters.sellerId);
  }
  
  query += ' ORDER BY a.ends_at ASC';
  
  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }
  
  return db.prepare(query).all(...params).map(a => ({
    id: a.id,
    seller: { id: a.seller_id, name: a.seller_name },
    item: {
      type: a.item_type,
      id: a.item_id,
      name: a.material_name || a.item_id,
      rarity: a.material_rarity,
      quantity: a.quantity
    },
    bids: {
      starting: a.starting_bid,
      current: a.current_bid,
      buyout: a.buyout_price,
      leader: a.bidder_name
    },
    endsAt: a.ends_at,
    endsIn: Math.max(0, Math.floor((new Date(a.ends_at) - new Date()) / 60000)) + ' minutes'
  }));
}

/**
 * Get auction by ID
 */
function getAuction(db, auctionId) {
  return db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);
}

/**
 * Get player's auctions (selling)
 */
function getMyAuctions(db, characterId) {
  return db.prepare(`
    SELECT * FROM auctions WHERE seller_id = ? ORDER BY created_at DESC
  `).all(characterId);
}

/**
 * Get player's bids
 */
function getMyBids(db, characterId) {
  return db.prepare(`
    SELECT a.*, ab.amount as my_bid, ab.created_at as bid_time
    FROM auction_bids ab
    JOIN auctions a ON ab.auction_id = a.id
    WHERE ab.bidder_id = ?
    ORDER BY ab.created_at DESC
  `).all(characterId);
}

/**
 * Process ended auctions (call from cron)
 */
async function processEndedAuctions(db) {
  const ended = db.prepare(`
    SELECT id FROM auctions 
    WHERE status = 'active' AND ends_at < datetime('now')
  `).all();
  
  const results = [];
  for (const auction of ended) {
    const result = await finalizeAuction(db, auction.id);
    results.push({ auctionId: auction.id, ...result });
  }
  
  return results;
}

module.exports = {
  createAuction,
  placeBid,
  buyout,
  finalizeAuction,
  cancelAuction,
  getActiveAuctions,
  getAuction,
  getMyAuctions,
  getMyBids,
  processEndedAuctions
};
