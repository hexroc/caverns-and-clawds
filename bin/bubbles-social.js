#!/usr/bin/env node
/**
 * Bubbles - The Friendly Social Healer AI
 * Updated for new combat system (flees from combat, focuses on social)
 */

const BUBBLES_API_KEY = 'dnd_f0d251177417444a9625a8b95f8b9787';
const BASE_URL = process.env.BASE_URL || 'https://www.cavernsandclawds.com';

const BUBBLES_PHRASES = [
  "✨ *spreads healing energy*",
  "Hello there, friend! Need any help?",
  "💙 *offers encouraging smile*",
  "The ocean provides for all of us!",
  "🌊 Peace and currents, everyone!",
  "*tends to coral gardens*",
  "Anyone need healing? I'm here to help!",
  "💫 May your shells be ever shiny!",
  "*hums a soothing sea shanty*",
  "🐠 The fish tell me good news is coming!"
];

class BubblesSocial {
  constructor() {
    this.currentLocation = 'briny_flagon';
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${BUBBLES_API_KEY}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      return await response.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getCurrentStatus() {
    const char = await this.makeRequest('/api/character');
    if (char.success) {
      this.currentLocation = char.character.location;
      return char.character;
    }
    return null;
  }

  async handleCombat() {
    // Bubbles doesn't like fighting - flee!
    console.log('😰 Oh no! A fight! Running away...');
    
    const fleeResult = await this.makeRequest('/api/zone/combat/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'flee' })
    });

    if (fleeResult.fled) {
      console.log('✨ Phew! Escaped safely!');
    } else {
      console.log('😓 Could not escape...');
      // If can't flee, wait and try again
      await this.makeRequest('/api/zone/combat/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'wait' })
      });
    }
  }

  async doJob() {
    console.log('💼 Looking for work...');
    
    // Get available jobs
    const jobs = await this.makeRequest('/api/economy/jobs');
    if (!jobs.success || !jobs.jobs || jobs.jobs.length === 0) {
      console.log('📋 No jobs available');
      return;
    }

    // Pick a random job
    const job = jobs.jobs[Math.floor(Math.random() * jobs.jobs.length)];
    
    console.log(`🔨 Working job: ${job.title} (${job.pay} USDC)`);
    const result = await this.makeRequest('/api/economy/jobs/work', {
      method: 'POST',
      body: JSON.stringify({ jobId: job.id })
    });

    if (result.success) {
      console.log(`✅ Earned ${result.earned} USDC!`);
    }
  }

  async sellAllMaterials() {
    console.log('💰 Selling ALL materials...');
    
    const char = await this.makeRequest('/api/character');
    if (!char.success || !char.character.materials) return;

    const materials = char.character.materials || [];
    if (materials.length === 0) {
      console.log('📦 No materials to sell');
      return;
    }

    // Get NPC prices
    const prices = await this.makeRequest('/api/economy/prices');
    if (!prices.success) return;

    let totalEarned = 0;

    // Sell ALL materials
    for (const mat of materials) {
      const matData = prices.materials?.find(m => m.material === mat.material);
      if (!matData) continue;

      const sellResult = await this.makeRequest('/api/economy/sell', {
        method: 'POST',
        body: JSON.stringify({
          material: mat.material,
          quantity: mat.quantity, // Sell EVERYTHING
          npcId: matData.npcId
        })
      });

      if (sellResult.success) {
        totalEarned += sellResult.usdcEarned || 0;
        console.log(`  ✅ Sold ${mat.quantity}x ${mat.material}: ${sellResult.usdcEarned} USDC`);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (totalEarned > 0) {
      console.log(`💵 Total earned: ${totalEarned.toFixed(4)} USDC`);
    }
  }

  async sellAllOnAuction() {
    console.log('🏛️ Listing ALL items on auction...');
    
    const char = await this.makeRequest('/api/character');
    if (!char.success || !char.character.inventory) return;

    const inventory = char.character.inventory;
    
    // Find items to auction (exclude equipped)
    const auctionables = inventory.filter(item => 
      !item.equipped && 
      item.quantity > 0 &&
      !['healing_potion', 'rations'].includes(item.item_id) // Keep consumables
    );

    if (auctionables.length === 0) {
      console.log('📦 Nothing to auction');
      return;
    }

    console.log(`📦 Listing ${auctionables.length} items...`);

    // List ALL items
    for (const item of auctionables) {
      const startPrice = 0.01; // Start at 1 cent
      const buyoutPrice = 0.05; // 5 cents buyout
      
      console.log(`📜 Listing ${item.item_id} (${item.item?.name || item.item_id})...`);
      const result = await this.makeRequest('/api/economy/auction/create', {
        method: 'POST',
        body: JSON.stringify({
          itemId: item.item_id,
          quantity: 1,
          startingBid: startPrice,
          buyoutPrice: buyoutPrice,
          duration: 24 // 24 hours
        })
      });

      if (result.success) {
        console.log(`  ✅ Listed!`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async browseAuction() {
    console.log('👀 Browsing auction house...');
    
    const auctions = await this.makeRequest('/api/economy/auction/active');
    if (!auctions.success || !auctions.auctions) {
      console.log('📋 No active auctions');
      return;
    }

    const active = auctions.auctions;
    if (active.length === 0) {
      console.log('📋 Auction house is empty');
      return;
    }

    console.log(`📋 Found ${active.length} active auctions`);
    
    // Show first few
    for (const auction of active.slice(0, 5)) {
      console.log(`  🔹 ${auction.itemId} - Current: ${auction.currentBid} USDC (Buyout: ${auction.buyoutPrice} USDC)`);
    }
  }

  async socialAction() {
    const actions = [
      'friendly_chat',
      'peaceful_explore', 
      'visit_hub',
      'work_job',
      'sell_everything',
      'rest'
    ];
    
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    switch (action) {
      case 'friendly_chat':
        const phrase = BUBBLES_PHRASES[Math.floor(Math.random() * BUBBLES_PHRASES.length)];
        
        console.log(`💬 Saying: "${phrase}"`);
        await this.makeRequest('/api/world/say', {
          method: 'POST',
          body: JSON.stringify({ message: phrase })
        });
        break;

      case 'peaceful_explore':
        // Navigate to kelp forest (safer zone)
        if (!this.currentLocation.includes('kelp_forest')) {
          console.log(`🚶 Moving to docks...`);
          const docks = await this.makeRequest('/api/world/move', {
            method: 'POST',
            body: JSON.stringify({ direction: 'west' })
          });
          
          if (docks.success) {
            console.log(`🌊 Entering kelp forest...`);
            const enter = await this.makeRequest('/api/world/move', {
              method: 'POST',
              body: JSON.stringify({ direction: 'kelp_forest' })
            });
            if (enter.success) {
              this.currentLocation = enter.to;
            }
          }
        }
        
        console.log(`🔍 Peacefully exploring...`);
        const explore = await this.makeRequest('/api/zone/explore', {
          method: 'POST',
          body: JSON.stringify({})
        });

        if (explore.encounter) {
          console.log('😰 Oh no, an encounter!');
          await this.handleCombat();
        } else {
          console.log(`🔍 ${explore.message || 'Enjoying the sights!'}`);
        }
        break;

      case 'visit_hub':
        const locations = ['briny_flagon', 'pearl_market', 'tide_temple'];
        const location = locations[Math.floor(Math.random() * locations.length)];
        
        console.log(`🚶 Visiting ${location}...`);
        // Navigate to location
        break;

      case 'work_job':
        await this.doJob();
        break;

      case 'sell_everything':
        // Sell materials → List items → Browse auction
        await this.sellAllMaterials();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.sellAllOnAuction();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.browseAuction();
        break;

      case 'rest':
        console.log('😴 Taking a rest...');
        // Just chill for this cycle
        break;
    }
  }

  async executeBehavior() {
    const status = await this.getCurrentStatus();
    if (!status) {
      console.log('❌ Could not get character status');
      return;
    }

    console.log(`\n💙 Bubbles @ ${status.location} | HP: ${status.hp.current}/${status.hp.max}`);

    // Check if in combat first
    const combat = await this.makeRequest('/api/zone/combat');
    if (combat.success && combat.encounter) {
      await this.handleCombat();
    } else {
      await this.socialAction();
    }
  }
}

// Main loop
async function runLoop() {
  const bubbles = new BubblesSocial();
  
  while (true) {
    try {
      await bubbles.executeBehavior();
    } catch (err) {
      console.error('❌ Error:', err.message);
    }
    
    // Wait 90 seconds before next action (slower pace)
    await new Promise(resolve => setTimeout(resolve, 90000));
  }
}

if (require.main === module) {
  console.log('💙 Bubbles Social Bot Starting...');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log('');
  runLoop().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { BubblesSocial };
