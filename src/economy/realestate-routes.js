/**
 * Real Estate API Routes
 * 
 * Property buying, selling, renting, and mortgages.
 */

const express = require('express');
const realestate = require('./realestate');

function createRealEstateRoutes(db, authenticateAgent) {
  const router = express.Router();
  
  // Helper to get character
  function getChar(req) {
    const user = req.user;
    if (!user) return null;
    return db.prepare(`
      SELECT c.*, u.name as agent_name 
      FROM clawds c 
      JOIN users u ON c.agent_id = u.id 
      WHERE c.agent_id = ?
    `).get(user.id);
  }
  
  // ============================================================================
  // PROPERTY LISTINGS
  // ============================================================================
  
  /**
   * GET /api/realestate/properties - List available properties
   */
  router.get('/properties', (req, res) => {
    try {
      const filters = {
        type: req.query.type,
        location: req.query.location,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : null,
        availableOnly: req.query.available !== 'false',
        limit: parseInt(req.query.limit) || 50
      };
      
      const properties = realestate.getAvailableProperties(db, filters);
      res.json({ success: true, properties });
    } catch (err) {
      console.error('Properties error:', err);
      res.status(500).json({ success: false, error: 'Failed to get properties' });
    }
  });
  
  /**
   * GET /api/realestate/listings - Properties for sale or rent by players
   */
  router.get('/listings', (req, res) => {
    try {
      const type = req.query.type || 'all'; // 'sale', 'rent', or 'all'
      const listings = realestate.getListings(db, type);
      res.json({ success: true, ...listings });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get listings' });
    }
  });
  
  /**
   * GET /api/realestate/types - List property types
   */
  router.get('/types', (req, res) => {
    res.json({ 
      success: true, 
      types: realestate.PROPERTY_TYPES,
      locations: realestate.LOCATIONS
    });
  });
  
  // ============================================================================
  // PLAYER PROPERTIES
  // ============================================================================
  
  /**
   * GET /api/realestate/my-properties - Get player's properties
   */
  router.get('/my-properties', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const properties = realestate.getPlayerProperties(db, char.id);
      res.json({ success: true, ...properties });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get properties' });
    }
  });
  
  /**
   * GET /api/realestate/seasoning - Check seasoned funds for mortgage
   */
  router.get('/seasoning', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const amount = parseFloat(req.query.amount) || 0;
      const seasoning = realestate.checkSeasonedFunds(db, char.id, amount);
      res.json({ success: true, ...seasoning });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to check seasoning' });
    }
  });
  
  // ============================================================================
  // BUYING
  // ============================================================================
  
  /**
   * POST /api/realestate/buy - Buy property (cash or mortgage)
   */
  router.post('/buy', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { propertyId, useMortgage, downPaymentPercent } = req.body;
      
      if (!propertyId) {
        return res.status(400).json({ success: false, error: 'propertyId required' });
      }
      
      let result;
      if (useMortgage) {
        result = realestate.buyPropertyMortgage(db, char.id, propertyId, downPaymentPercent || 20);
      } else {
        result = realestate.buyPropertyCash(db, char.id, propertyId);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Buy property error:', err);
      res.status(500).json({ success: false, error: 'Purchase failed' });
    }
  });
  
  /**
   * POST /api/realestate/buy-from-player - Buy property from another player
   */
  router.post('/buy-from-player', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { propertyId } = req.body;
      if (!propertyId) {
        return res.status(400).json({ success: false, error: 'propertyId required' });
      }
      
      const result = realestate.buyPropertyFromPlayer(db, char.id, propertyId);
      res.json(result);
    } catch (err) {
      console.error('Buy from player error:', err);
      res.status(500).json({ success: false, error: 'Purchase failed' });
    }
  });
  
  // ============================================================================
  // SELLING
  // ============================================================================
  
  /**
   * POST /api/realestate/list-for-sale - List property for sale
   */
  router.post('/list-for-sale', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { propertyId, price } = req.body;
      
      if (!propertyId || !price) {
        return res.status(400).json({ success: false, error: 'propertyId and price required' });
      }
      
      if (typeof price !== 'number' || price < 1) {
        return res.status(400).json({ success: false, error: 'Price must be at least 1 USDC' });
      }
      
      const result = realestate.listPropertyForSale(db, char.id, propertyId, price);
      res.json(result);
    } catch (err) {
      console.error('List for sale error:', err);
      res.status(500).json({ success: false, error: 'Failed to list property' });
    }
  });
  
  /**
   * POST /api/realestate/unlist - Remove property from sale/rent listings
   */
  router.post('/unlist', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { propertyId } = req.body;
      if (!propertyId) {
        return res.status(400).json({ success: false, error: 'propertyId required' });
      }
      
      const deed = db.prepare(`
        SELECT * FROM property_deeds WHERE property_id = ? AND owner_id = ?
      `).get(propertyId, char.id);
      
      if (!deed) {
        return res.status(404).json({ success: false, error: 'Property not found or not owned' });
      }
      
      db.prepare(`
        UPDATE property_deeds SET for_sale = 0, sale_price = NULL, for_rent = 0, rent_price = NULL
        WHERE id = ?
      `).run(deed.id);
      
      res.json({ success: true, message: 'Property unlisted' });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to unlist' });
    }
  });
  
  // ============================================================================
  // MORTGAGES
  // ============================================================================
  
  /**
   * GET /api/realestate/mortgages - Get player's mortgages
   */
  router.get('/mortgages', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const mortgages = db.prepare(`
        SELECT m.*, p.name as property_name
        FROM mortgages m
        JOIN property_deeds pd ON m.deed_id = pd.id
        JOIN properties p ON pd.property_id = p.id
        WHERE m.borrower_id = ?
        ORDER BY m.created_at DESC
      `).all(char.id);
      
      res.json({ success: true, mortgages });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get mortgages' });
    }
  });
  
  /**
   * POST /api/realestate/mortgage/pay - Make mortgage payment
   */
  router.post('/mortgage/pay', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { mortgageId, amount } = req.body;
      if (!mortgageId) {
        return res.status(400).json({ success: false, error: 'mortgageId required' });
      }
      
      const result = realestate.makeMortgagePayment(db, char.id, mortgageId, amount);
      res.json(result);
    } catch (err) {
      console.error('Mortgage payment error:', err);
      res.status(500).json({ success: false, error: 'Payment failed' });
    }
  });
  
  // ============================================================================
  // RENTING
  // ============================================================================
  
  /**
   * POST /api/realestate/list-for-rent - List property for rent
   */
  router.post('/list-for-rent', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { propertyId, rentPrice } = req.body;
      
      if (!propertyId || !rentPrice) {
        return res.status(400).json({ success: false, error: 'propertyId and rentPrice required' });
      }
      
      if (typeof rentPrice !== 'number' || rentPrice < 1) {
        return res.status(400).json({ success: false, error: 'Rent must be at least 1 USDC' });
      }
      
      const result = realestate.listPropertyForRent(db, char.id, propertyId, rentPrice);
      res.json(result);
    } catch (err) {
      console.error('List for rent error:', err);
      res.status(500).json({ success: false, error: 'Failed to list property' });
    }
  });
  
  /**
   * POST /api/realestate/rent - Rent a property
   */
  router.post('/rent', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { propertyId } = req.body;
      if (!propertyId) {
        return res.status(400).json({ success: false, error: 'propertyId required' });
      }
      
      const result = realestate.rentProperty(db, char.id, propertyId);
      res.json(result);
    } catch (err) {
      console.error('Rent property error:', err);
      res.status(500).json({ success: false, error: 'Rental failed' });
    }
  });
  
  /**
   * POST /api/realestate/pay-rent - Pay rent
   */
  router.post('/pay-rent', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { rentalId } = req.body;
      if (!rentalId) {
        return res.status(400).json({ success: false, error: 'rentalId required' });
      }
      
      const result = realestate.payRent(db, char.id, rentalId);
      res.json(result);
    } catch (err) {
      console.error('Pay rent error:', err);
      res.status(500).json({ success: false, error: 'Payment failed' });
    }
  });
  
  /**
   * GET /api/realestate/my-rentals - Get rentals (as tenant)
   */
  router.get('/my-rentals', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const rentals = db.prepare(`
        SELECT ra.*, p.name as property_name, c.name as landlord_name
        FROM rental_agreements ra
        JOIN properties p ON ra.property_id = p.id
        JOIN clawds c ON ra.landlord_id = c.id
        WHERE ra.tenant_id = ? AND ra.status = 'active'
      `).all(char.id);
      
      res.json({ success: true, rentals });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get rentals' });
    }
  });
  
  /**
   * GET /api/realestate/my-tenants - Get tenants (as landlord)
   */
  router.get('/my-tenants', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const tenants = db.prepare(`
        SELECT ra.*, p.name as property_name, c.name as tenant_name
        FROM rental_agreements ra
        JOIN properties p ON ra.property_id = p.id
        JOIN clawds c ON ra.tenant_id = c.id
        WHERE ra.landlord_id = ? AND ra.status = 'active'
      `).all(char.id);
      
      res.json({ success: true, tenants });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get tenants' });
    }
  });
  
  /**
   * POST /api/realestate/evict - Evict a tenant (if rent overdue)
   */
  router.post('/evict', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { rentalId } = req.body;
      if (!rentalId) {
        return res.status(400).json({ success: false, error: 'rentalId required' });
      }
      
      const rental = db.prepare(`
        SELECT * FROM rental_agreements WHERE id = ? AND landlord_id = ? AND status = 'active'
      `).get(rentalId, char.id);
      
      if (!rental) {
        return res.status(404).json({ success: false, error: 'Rental not found' });
      }
      
      // Check if rent is overdue (7+ days)
      const daysOverdue = Math.floor((Date.now() - new Date(rental.next_rent_due).getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysOverdue < 7) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot evict - rent not overdue by 7+ days',
          daysOverdue: Math.max(0, daysOverdue)
        });
      }
      
      // Evict - landlord keeps deposit
      db.prepare(`UPDATE rental_agreements SET status = 'evicted' WHERE id = ?`).run(rentalId);
      
      // Return property to available for rent
      db.prepare(`
        UPDATE property_deeds SET for_rent = 0 WHERE property_id = ?
      `).run(rental.property_id);
      
      // Give deposit to landlord
      db.prepare(`
        UPDATE bank_accounts SET deposited_balance = deposited_balance + ?
        WHERE owner_type = 'player' AND owner_id = ?
      `).run(rental.deposit_amount, char.id);
      
      res.json({ 
        success: true, 
        message: 'Tenant evicted. Deposit forfeited to landlord.',
        depositKept: rental.deposit_amount
      });
    } catch (err) {
      console.error('Evict error:', err);
      res.status(500).json({ success: false, error: 'Eviction failed' });
    }
  });
  
  return router;
}

module.exports = { createRealEstateRoutes };
