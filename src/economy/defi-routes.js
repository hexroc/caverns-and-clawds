/**
 * DeFi Economy Routes
 * Treasury status, yield info, emission triggers
 */

const express = require('express');
const router = express.Router();
const { getTreasuryBalance, getVaultInfo, calculateDailyYield, simulateEmission, getEconomyStatus } = require('./kamino-vault');

let db;

function init(database) {
  db = database;
  console.log('💎 DeFi routes initialized');
  return router;
}

/**
 * GET /api/defi/status
 * Full DeFi economy status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getEconomyStatus(db);
    res.json({ success: true, defi: status });
  } catch (err) {
    console.error('DeFi status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/defi/treasury
 * Treasury wallet balances
 */
router.get('/treasury', async (req, res) => {
  try {
    const treasury = await getTreasuryBalance();
    const dailyYield = calculateDailyYield(treasury.usdc);
    
    res.json({
      success: true,
      treasury: {
        ...treasury,
        dailyYield: dailyYield.toFixed(6),
        monthlyYield: (dailyYield * 30).toFixed(4),
        yearlyYield: (dailyYield * 365).toFixed(2)
      }
    });
  } catch (err) {
    console.error('Treasury error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/defi/vault
 * Kamino vault info
 */
router.get('/vault', async (req, res) => {
  try {
    const vault = await getVaultInfo();
    res.json({ success: true, vault });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/defi/emit
 * Trigger daily yield emission to NPCs
 * (Should be called by cron job)
 */
router.post('/emit', async (req, res) => {
  try {
    const treasury = await getTreasuryBalance();
    const dailyYield = calculateDailyYield(treasury.usdc);
    
    if (dailyYield < 0.0001) {
      return res.json({ 
        success: false, 
        error: 'Yield too small to distribute',
        dailyYield
      });
    }
    
    const result = await simulateEmission(db, dailyYield);
    
    res.json({
      success: true,
      emission: result,
      message: `Distributed ${dailyYield.toFixed(6)} USDC to ${result.recipients.length} NPCs`
    });
  } catch (err) {
    console.error('Emission error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { init };
