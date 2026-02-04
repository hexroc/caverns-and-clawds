/**
 * Bank Emissions System
 * Simulates SOL yield farming → USDC distribution → NPC purchasing power
 */

const db = require('../db');

class BankEmissions {
  constructor() {
    this.solBalance = 2.0; // Starting SOL balance
    this.annualYieldRate = 0.07; // 7% APY
    this.solPriceUSD = 400; // Estimated SOL price
    this.emissionInterval = 24 * 60 * 60 * 1000; // 24 hours in ms
    
    // NPC trader IDs that receive emissions
    this.npcTraders = [
      'madame_pearl',
      'ironshell_gus', 
      'coral_trader',
      'weapon_smith',
      'old_shellworth'
    ];
  }

  /**
   * Calculate daily USDC yield from SOL balance
   */
  calculateDailyYield() {
    const dailyRate = this.annualYieldRate / 365;
    const solYield = this.solBalance * dailyRate;
    const usdcYield = solYield * this.solPriceUSD;
    
    return {
      solYield,
      usdcYield,
      dailyRate
    };
  }

  /**
   * Distribute daily emissions to NPC traders
   */
  async distributeEmissions() {
    try {
      console.log('🏦 Bank Emissions: Starting daily distribution...');
      
      const { usdcYield } = this.calculateDailyYield();
      const perNpcAmount = usdcYield / this.npcTraders.length;
      
      console.log(`💰 Total daily yield: ${usdcYield.toFixed(4)} USDC`);
      console.log(`👥 Per NPC allocation: ${perNpcAmount.toFixed(4)} USDC`);
      
      // Check bank balance
      const bankWallet = db.prepare('SELECT * FROM economy_wallets WHERE type = "bank"').get();
      
      if (!bankWallet) {
        throw new Error('Bank wallet not found');
      }
      
      if (bankWallet.usdc_balance < usdcYield) {
        console.log('⚠️  Insufficient bank funds for full emission');
        return { success: false, error: 'Insufficient bank funds' };
      }
      
      // Transaction: Deduct from bank, add to NPCs
      const transaction = db.transaction(() => {
        // Deduct from bank
        const updateBank = db.prepare('UPDATE economy_wallets SET usdc_balance = usdc_balance - ? WHERE type = "bank"');
        updateBank.run(usdcYield);
        
        // Add to each NPC
        const updateNPC = db.prepare('UPDATE economy_wallets SET usdc_balance = usdc_balance + ? WHERE wallet_id = ?');
        
        for (const npcId of this.npcTraders) {
          updateNPC.run(perNpcAmount, npcId);
          console.log(`  • ${npcId}: +${perNpcAmount.toFixed(4)} USDC`);
        }
        
        // Record emission transaction
        const recordEmission = db.prepare(`
          INSERT INTO economy_transactions (type, amount, description) 
          VALUES (?, ?, ?)
        `);
        recordEmission.run('emission', usdcYield, `Daily SOL yield emission: ${usdcYield.toFixed(4)} USDC distributed to ${this.npcTraders.length} NPCs`);
      });
      
      transaction();
      
      console.log('✅ Daily emissions distributed successfully');
      
      return {
        success: true,
        totalEmitted: usdcYield,
        perNpc: perNpcAmount,
        recipients: this.npcTraders.length
      };
      
    } catch (err) {
      console.error('❌ Bank emission failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get current bank and NPC balances
   */
  getBalanceReport() {
    try {
      const bankWallet = db.prepare('SELECT * FROM economy_wallets WHERE type = "bank"').get();
      const npcWallets = db.prepare('SELECT * FROM economy_wallets WHERE type = "npc"').all();
      
      const { usdcYield } = this.calculateDailyYield();
      const totalNpcBalance = npcWallets.reduce((sum, npc) => sum + npc.usdc_balance, 0);
      const daysRemaining = bankWallet ? bankWallet.usdc_balance / usdcYield : 0;
      
      return {
        bank: bankWallet ? bankWallet.usdc_balance : 0,
        npcs: {
          total: totalNpcBalance,
          count: npcWallets.length,
          individual: npcWallets
        },
        yield: {
          daily: usdcYield,
          daysRemaining: Math.floor(daysRemaining)
        }
      };
    } catch (err) {
      console.error('❌ Balance report failed:', err.message);
      return null;
    }
  }

  /**
   * Simulate NPC material purchasing behavior
   * NPCs spend their USDC on materials from players
   */
  async simulateNPCPurchasing() {
    try {
      console.log('🛒 Simulating NPC material purchasing...');
      
      // Get materials available for purchase (from player inventories)
      const availableMaterials = db.prepare(`
        SELECT pm.character_id, pm.material, pm.quantity, np.base_price, c.name as player_name
        FROM player_materials pm
        JOIN npc_prices np ON pm.material = np.material  
        JOIN clawds c ON pm.character_id = c.id
        WHERE pm.quantity > 0
        ORDER BY np.base_price ASC
      `).all();
      
      if (availableMaterials.length === 0) {
        console.log('📦 No materials available for purchase');
        return { success: true, purchases: [] };
      }
      
      console.log(`📦 Found ${availableMaterials.length} material lots for sale`);
      
      const purchases = [];
      
      // Each NPC tries to buy materials based on their budget
      for (const npcId of this.npcTraders) {
        const npcWallet = db.prepare('SELECT * FROM economy_wallets WHERE wallet_id = ?').get(npcId);
        
        if (!npcWallet || npcWallet.usdc_balance < 0.01) continue;
        
        let npcBudget = npcWallet.usdc_balance;
        const maxPurchases = Math.floor(Math.random() * 5) + 1; // 1-5 purchases per NPC
        let purchaseCount = 0;
        
        console.log(`💰 ${npcId} shopping with ${npcBudget.toFixed(4)} USDC budget`);
        
        for (const material of availableMaterials) {
          if (purchaseCount >= maxPurchases || npcBudget < 0.01) break;
          
          const purchaseQty = Math.min(
            material.quantity,
            Math.floor(npcBudget / material.base_price),
            Math.floor(Math.random() * 3) + 1 // 1-3 units
          );
          
          if (purchaseQty > 0) {
            const totalCost = purchaseQty * material.base_price;
            
            // Execute purchase transaction
            const transaction = db.transaction(() => {
              // Deduct materials from player
              const removeMaterial = db.prepare(`
                UPDATE player_materials 
                SET quantity = quantity - ? 
                WHERE character_id = ? AND material = ?
              `);
              removeMaterial.run(purchaseQty, material.character_id, material.material);
              
              // Add USDC to player
              const payPlayer = db.prepare('UPDATE clawds SET usdc_balance = usdc_balance + ? WHERE id = ?');
              payPlayer.run(totalCost, material.character_id);
              
              // Deduct USDC from NPC
              const payNPC = db.prepare('UPDATE economy_wallets SET usdc_balance = usdc_balance - ? WHERE wallet_id = ?');
              payNPC.run(totalCost, npcId);
              
              // Record transaction
              const recordSale = db.prepare(`
                INSERT INTO economy_transactions (character_id, type, amount, material, quantity, description)
                VALUES (?, ?, ?, ?, ?, ?)
              `);
              recordSale.run(
                material.character_id,
                'material_sale', 
                totalCost,
                material.material,
                purchaseQty,
                `Sold ${purchaseQty}x ${material.material} to ${npcId} for ${totalCost.toFixed(4)} USDC`
              );
            });
            
            transaction();
            
            purchases.push({
              npc: npcId,
              player: material.player_name,
              material: material.material,
              quantity: purchaseQty,
              unitPrice: material.base_price,
              totalCost
            });
            
            npcBudget -= totalCost;
            purchaseCount++;
            
            console.log(`  ✅ Bought ${purchaseQty}x ${material.material} from ${material.player_name} for ${totalCost.toFixed(4)} USDC`);
          }
        }
      }
      
      console.log(`✅ NPC purchasing complete: ${purchases.length} transactions`);
      
      return { success: true, purchases };
      
    } catch (err) {
      console.error('❌ NPC purchasing failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Run full daily emission cycle
   */
  async runDailyCycle() {
    console.log('🔄 Starting daily bank emission cycle...\n');
    
    // 1. Distribute emissions to NPCs
    const emissionResult = await this.distributeEmissions();
    
    if (!emissionResult.success) {
      return emissionResult;
    }
    
    // 2. NPCs purchase materials from players
    const purchaseResult = await this.simulateNPCPurchasing();
    
    // 3. Generate report
    const balanceReport = this.getBalanceReport();
    
    console.log('\n📊 Daily Cycle Summary:');
    console.log(`💰 Emissions: ${emissionResult.totalEmitted.toFixed(4)} USDC distributed`);
    console.log(`🛒 Purchases: ${purchaseResult.purchases?.length || 0} material transactions`);
    console.log(`🏦 Bank remaining: ${balanceReport?.bank.toFixed(2) || 0} USDC`);
    console.log(`👥 NPC total: ${balanceReport?.npcs.total.toFixed(2) || 0} USDC`);
    console.log(`⏰ Days sustainable: ${balanceReport?.yield.daysRemaining || 0} days`);
    
    return {
      success: true,
      emissions: emissionResult,
      purchases: purchaseResult,
      balances: balanceReport
    };
  }
}

module.exports = { BankEmissions };