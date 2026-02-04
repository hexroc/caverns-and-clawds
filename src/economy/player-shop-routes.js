/**
 * Player Shop API Routes
 * 
 * Run your own shop in the game!
 */

const express = require('express');
const shops = require('./player-shops');

function createShopRoutes(db, authenticateAgent) {
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
  // SHOP BROWSING (PUBLIC)
  // ============================================================================
  
  /**
   * GET /api/shops - List all open shops
   */
  router.get('/', (req, res) => {
    try {
      const filters = {
        location: req.query.location,
        limit: parseInt(req.query.limit) || 50
      };
      
      const shopList = shops.browseShops(db, filters);
      res.json({ success: true, shops: shopList });
    } catch (err) {
      console.error('Browse shops error:', err);
      res.status(500).json({ success: false, error: 'Failed to get shops' });
    }
  });
  
  /**
   * GET /api/shops/:shopId - View shop details and inventory
   */
  router.get('/:shopId', (req, res) => {
    try {
      const result = shops.viewShopInventory(db, req.params.shopId);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err) {
      console.error('View shop error:', err);
      res.status(500).json({ success: false, error: 'Failed to get shop' });
    }
  });
  
  /**
   * GET /api/shops/:shopId/stats - Shop statistics
   */
  router.get('/:shopId/stats', (req, res) => {
    try {
      const result = shops.getShopStats(db, req.params.shopId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
  });
  
  /**
   * GET /api/shops/buy-orders/all - All active buy orders
   */
  router.get('/buy-orders/all', (req, res) => {
    try {
      const orders = db.prepare(`
        SELECT bo.*, ps.name as shop_name, em.name as material_name,
          (bo.max_quantity - bo.current_quantity) as remaining
        FROM shop_buy_orders bo
        JOIN player_shops ps ON bo.shop_id = ps.id
        JOIN economy_materials em ON bo.material_id = em.id
        WHERE bo.is_active = 1
        ORDER BY bo.price_per_unit DESC
      `).all();
      
      res.json({ success: true, buyOrders: orders });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get buy orders' });
    }
  });
  
  // ============================================================================
  // SHOP MANAGEMENT (OWNER)
  // ============================================================================
  
  /**
   * GET /api/shops/my/shops - Get player's shops
   */
  router.get('/my/shops', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const playerShops = shops.getPlayerShops(db, char.id);
      res.json({ success: true, shops: playerShops });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get shops' });
    }
  });
  
  /**
   * POST /api/shops/open - Open a shop on owned property
   */
  router.post('/open', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { propertyId, name, description } = req.body;
      
      if (!propertyId || !name) {
        return res.status(400).json({ success: false, error: 'propertyId and name required' });
      }
      
      const result = shops.openShop(db, char.id, propertyId, name, description);
      res.json(result);
    } catch (err) {
      console.error('Open shop error:', err);
      res.status(500).json({ success: false, error: 'Failed to open shop' });
    }
  });
  
  /**
   * POST /api/shops/:shopId/close - Close shop
   */
  router.post('/:shopId/close', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const result = shops.closeShop(db, char.id, req.params.shopId);
      res.json(result);
    } catch (err) {
      console.error('Close shop error:', err);
      res.status(500).json({ success: false, error: 'Failed to close shop' });
    }
  });
  
  /**
   * POST /api/shops/:shopId/stock - Stock shop with materials
   */
  router.post('/:shopId/stock', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { materialId, quantity, price } = req.body;
      
      if (!materialId || quantity === undefined || price === undefined) {
        return res.status(400).json({ success: false, error: 'materialId, quantity, and price required' });
      }
      
      const result = shops.stockShop(db, char.id, req.params.shopId, materialId, quantity, price);
      res.json(result);
    } catch (err) {
      console.error('Stock shop error:', err);
      res.status(500).json({ success: false, error: 'Failed to stock shop' });
    }
  });
  
  /**
   * POST /api/shops/:shopId/update-price - Update item price
   */
  router.post('/:shopId/update-price', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { materialId, price } = req.body;
      
      if (!materialId || price === undefined) {
        return res.status(400).json({ success: false, error: 'materialId and price required' });
      }
      
      const result = shops.updatePrice(db, char.id, req.params.shopId, materialId, price);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to update price' });
    }
  });
  
  /**
   * POST /api/shops/:shopId/unstock - Remove stock
   */
  router.post('/:shopId/unstock', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { materialId, quantity } = req.body;
      
      if (!materialId) {
        return res.status(400).json({ success: false, error: 'materialId required' });
      }
      
      const result = shops.unstockItem(db, char.id, req.params.shopId, materialId, quantity);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to unstock' });
    }
  });
  
  // ============================================================================
  // SHOPPING (BUYER)
  // ============================================================================
  
  /**
   * POST /api/shops/:shopId/buy - Buy from shop
   */
  router.post('/:shopId/buy', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { materialId, quantity } = req.body;
      
      if (!materialId || !quantity) {
        return res.status(400).json({ success: false, error: 'materialId and quantity required' });
      }
      
      const result = shops.buyFromShop(db, char.id, req.params.shopId, materialId, quantity);
      res.json(result);
    } catch (err) {
      console.error('Buy from shop error:', err);
      res.status(500).json({ success: false, error: 'Failed to buy' });
    }
  });
  
  // ============================================================================
  // EMPLOYEES
  // ============================================================================
  
  /**
   * POST /api/shops/:shopId/hire - Hire employee
   */
  router.post('/:shopId/hire', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { employeeType, name } = req.body;
      
      if (!employeeType) {
        return res.status(400).json({ 
          success: false, 
          error: 'employeeType required',
          validTypes: Object.keys(shops.EMPLOYEE_TYPES)
        });
      }
      
      const result = shops.hireEmployee(db, char.id, req.params.shopId, employeeType, name);
      res.json(result);
    } catch (err) {
      console.error('Hire error:', err);
      res.status(500).json({ success: false, error: 'Failed to hire' });
    }
  });
  
  /**
   * POST /api/shops/:shopId/fire - Fire employee
   */
  router.post('/:shopId/fire', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { employeeId } = req.body;
      
      if (!employeeId) {
        return res.status(400).json({ success: false, error: 'employeeId required' });
      }
      
      const result = shops.fireEmployee(db, char.id, req.params.shopId, employeeId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fire' });
    }
  });
  
  // ============================================================================
  // BUY ORDERS
  // ============================================================================
  
  /**
   * POST /api/shops/:shopId/buy-order - Create buy order
   */
  router.post('/:shopId/buy-order', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { materialId, maxQuantity, price } = req.body;
      
      if (!materialId || !maxQuantity || !price) {
        return res.status(400).json({ success: false, error: 'materialId, maxQuantity, and price required' });
      }
      
      const result = shops.createBuyOrder(db, char.id, req.params.shopId, materialId, maxQuantity, price);
      res.json(result);
    } catch (err) {
      console.error('Create buy order error:', err);
      res.status(500).json({ success: false, error: 'Failed to create buy order' });
    }
  });
  
  /**
   * POST /api/shops/buy-order/:orderId/sell - Sell to buy order
   */
  router.post('/buy-order/:orderId/sell', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { quantity } = req.body;
      
      if (!quantity) {
        return res.status(400).json({ success: false, error: 'quantity required' });
      }
      
      const result = shops.sellToShop(db, char.id, req.params.orderId, quantity);
      res.json(result);
    } catch (err) {
      console.error('Sell to shop error:', err);
      res.status(500).json({ success: false, error: 'Failed to sell' });
    }
  });
  
  /**
   * POST /api/shops/buy-order/:orderId/cancel - Cancel buy order
   */
  router.post('/buy-order/:orderId/cancel', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const result = shops.cancelBuyOrder(db, char.id, req.params.orderId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to cancel' });
    }
  });
  
  /**
   * GET /api/shops/types - Shop tiers and employee types
   */
  router.get('/meta/types', (req, res) => {
    res.json({
      success: true,
      shopTiers: shops.SHOP_TIERS,
      employeeTypes: shops.EMPLOYEE_TYPES
    });
  });
  
  return router;
}

module.exports = { createPlayerShopRoutes: createShopRoutes };
