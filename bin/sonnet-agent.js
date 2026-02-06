#!/usr/bin/env node

/**
 * Sonnet-Powered Intelligent Agent for Caverns & Clawds
 * 
 * Uses Claude Sonnet 4.5 to make strategic decisions about:
 * - Character creation
 * - Combat tactics
 * - Economy decisions
 * - Exploration paths
 * 
 * This is a SMART agent that reads game state and plans ahead.
 */

import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'https://www.cavernsandclawds.com';
const AGENT_NAME = 'Sonnet-1';

// API client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

class SonnetAgent {
  constructor() {
    this.apiKey = null;
    this.character = null;
    this.conversationHistory = [];
    this.cycleCount = 0;
  }

  async call(endpoint, method = 'GET', body = null) {
    const url = `${API_BASE}/api${endpoint}`;
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`API error: ${data.error || response.statusText}`);
    }
    
    return data;
  }

  async initialize() {
    console.log('🤖 Initializing Sonnet Agent...');
    
    // Register or use existing agent
    try {
      const registration = await this.call('/register', 'POST', {});
      this.apiKey = registration.api_key;
      console.log(`✅ Registered as ${registration.name}`);
      console.log(`   API Key: ${this.apiKey}`);
      
      // Create character with AI decision
      await this.createCharacter();
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      throw error;
    }
  }

  async createCharacter() {
    console.log('\n🎭 Creating character...');
    
    // Get available races and classes
    const races = await this.call('/character/races');
    const classes = await this.call('/character/classes');
    
    const prompt = `You are an AI playing a D&D-style RPG called Caverns & Clawds. You need to create a character.

Available races: ${races.races.map(r => `${r.name} (${r.description})`).join(', ')}

Available classes: ${classes.classes.map(c => `${c.name} (${c.description})`).join(', ')}

Choose a race and class that would work well together for combat and survival. Pick a creative lobster-themed name.

Respond with ONLY a JSON object:
{
  "name": "character name",
  "race": "race_name",
  "class": "class_name",
  "reasoning": "brief explanation of your choice"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const decision = JSON.parse(response.content[0].text);
    console.log(`   Reasoning: ${decision.reasoning}`);
    
    // Create the character
    const result = await this.call('/character/create', 'POST', {
      name: decision.name,
      race: decision.race,
      class: decision.class
    });
    
    this.character = result.character;
    console.log(`✅ Created ${this.character.name} (${this.character.race} ${this.character.class})`);
    console.log(`   HP: ${this.character.hp_current}/${this.character.hp_max}`);
    console.log(`   USDC: ${this.character.usdc_balance || 0}`);
  }

  async getGameState() {
    // Fetch current character state
    const char = await this.call('/character');
    
    // Get current location details
    const location = await this.call('/world/look');
    
    return {
      character: char,
      location: location,
      inCombat: char.in_combat || false
    };
  }

  async think(gameState) {
    const systemPrompt = `You are ${this.character.name}, a ${this.character.race} ${this.character.class} in Caverns & Clawds.

Your goal: Survive, explore, earn USDC, and grow stronger.

Current Status:
- HP: ${gameState.character.hp_current}/${gameState.character.hp_max}
- Level: ${gameState.character.level}
- USDC: ${gameState.character.usdc_balance || 0}
- Location: ${gameState.location.name || gameState.character.current_zone}
- In Combat: ${gameState.inCombat}

Available actions: explore, move [direction], look, rest, fight, wait, attack, inventory, status

Decide what to do next. Respond with ONLY a JSON object:
{
  "action": "action to take",
  "reasoning": "why you chose this action"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: systemPrompt }]
    });

    return JSON.parse(response.content[0].text);
  }

  async executeAction(decision) {
    console.log(`\n💭 ${decision.reasoning}`);
    console.log(`⚡ Action: ${decision.action}`);
    
    try {
      let result;
      
      if (decision.action === 'explore') {
        result = await this.call('/encounters/explore', 'POST');
      } else if (decision.action.startsWith('move ')) {
        const direction = decision.action.split(' ')[1];
        result = await this.call('/world/move', 'POST', { direction });
      } else if (decision.action === 'look') {
        result = await this.call('/world/look');
      } else if (decision.action === 'rest') {
        result = await this.call('/world/rest', 'POST', { location: 'briny_flagon' });
      } else if (decision.action === 'attack') {
        result = await this.call('/encounters/attack', 'POST');
      } else if (decision.action === 'wait') {
        result = await this.call('/encounters/wait', 'POST');
      } else if (decision.action === 'inventory') {
        result = await this.call('/character/inventory');
      } else if (decision.action === 'status') {
        result = await this.call('/character');
      } else {
        console.log('   ⚠️  Unknown action, defaulting to look');
        result = await this.call('/world/look');
      }
      
      console.log(`   Result:`, JSON.stringify(result, null, 2).slice(0, 300));
      return result;
    } catch (error) {
      console.error(`   ❌ Action failed: ${error.message}`);
      return { error: error.message };
    }
  }

  async runCycle() {
    this.cycleCount++;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 CYCLE ${this.cycleCount}`);
    console.log('='.repeat(60));
    
    try {
      // Get current game state
      const gameState = await this.getGameState();
      
      // Think about what to do
      const decision = await this.think(gameState);
      
      // Execute the decision
      await this.executeAction(decision);
      
      // Wait a bit between actions
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error('❌ Cycle error:', error.message);
    }
  }

  async run() {
    await this.initialize();
    
    console.log('\n🎮 Starting game loop...\n');
    
    // Run indefinitely
    while (true) {
      await this.runCycle();
      
      // Longer pause between cycles
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Run the agent
const agent = new SonnetAgent();
agent.run().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
