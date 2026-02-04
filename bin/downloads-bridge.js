#!/usr/bin/env node
/**
 * Bridge between #downloads channel activity and C&C MiniHex actions
 * When torrents are requested, MiniHex searches for "digital treasures" in C&C
 */

const { MiniHexBehavior } = require('./minihex-behavior');

const BRIDGE_RESPONSES = {
  movie_request: [
    "🎬 *detects entertainment data request*",
    "*scanning digital archives*", 
    "Found something in the media vaults...",
    "📡 *cross-referencing with underwater databases*"
  ],
  download_start: [
    "*data stream detected*",
    "🌊 *following the digital currents*",
    "*archiving process initiated*",
    "The data flows like ocean currents..."
  ],
  search_complete: [
    "*scan complete*",
    "🔍 *updating treasure maps*", 
    "*cataloging discoveries*",
    "Another successful data dive!"
  ]
};

class DownloadsBridge {
  constructor() {
    this.miniHex = new MiniHexBehavior();
    this.lastTrigger = Date.now();
    this.cooldown = 30000; // 30 second cooldown
  }

  async triggerTorrentResponse(type = 'movie_request') {
    // Cooldown check
    if (Date.now() - this.lastTrigger < this.cooldown) {
      return false;
    }

    console.log(`🌉 Downloads bridge triggered: ${type}`);
    
    // Make MiniHex respond in C&C
    const responses = BRIDGE_RESPONSES[type] || BRIDGE_RESPONSES.movie_request;
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // Have MiniHex say something thematic
    await this.miniHex.makeRequest('/api/world/say', {
      method: 'POST',
      body: JSON.stringify({ message: response })
    });

    // Trigger appropriate C&C behavior
    switch (type) {
      case 'movie_request':
        // Search for materials (digital treasure hunting)
        await this.miniHex.searchForTreasure();
        break;
      case 'download_start':
        // Explore to find new areas (following data streams)
        await this.miniHex.exploreRandomly();
        break;
      case 'search_complete':
        // Check inventory and possibly sell (cataloging)
        await this.miniHex.checkMaterials();
        break;
    }

    this.lastTrigger = Date.now();
    return true;
  }

  // Method to be called when torrent activity is detected
  async onTorrentActivity(activity) {
    if (activity.includes('search') || activity.includes('find')) {
      return await this.triggerTorrentResponse('movie_request');
    } else if (activity.includes('download') || activity.includes('adding')) {
      return await this.triggerTorrentResponse('download_start');
    } else if (activity.includes('complete') || activity.includes('found')) {
      return await this.triggerTorrentResponse('search_complete');
    }
    
    return await this.triggerTorrentResponse('movie_request');
  }
}

// Export for use by other scripts
module.exports = { DownloadsBridge };

// Test if called directly
if (require.main === module) {
  const bridge = new DownloadsBridge();
  const testActivity = process.argv[2] || 'torrent search request';
  
  bridge.onTorrentActivity(testActivity)
    .then(result => console.log(`✅ Bridge response: ${result}`))
    .catch(err => console.error('❌ Bridge error:', err));
}