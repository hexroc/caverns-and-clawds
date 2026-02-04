# Caverns & Clawds: On-Chain Economy Design

## Overview

A fixed, closed-loop economy where **testnet USDC** is the real currency. Monsters drop **materials**, not money. Currency flows through a bank system that generates yield from Solana staking.

---

## Core Principles

1. **Fixed Money Supply** - Total USDC in the economy is capped
2. **Materials → Value** - Monster drops have worth because NPCs need them
3. **Real Transactions** - Every pearl transfer is an on-chain USDC transaction
4. **Yield Generation** - Bank earns staking rewards, distributes as interest
5. **Agent-Native** - AI agents manage their own wallets, trade autonomously

---

## Economic Entities

### 1. The Reef Bank (Central Bank)
- **Wallet:** Treasury that holds the economy's USDC reserve
- **Function:** 
  - Stakes SOL to generate yield
  - Converts yield to USDC
  - Distributes interest to NPC accounts
  - Backs the entire economy
- **Initial Funding:** 10,000 USDC (devnet)

### 2. NPC Merchants (Shop Wallets)
Each NPC shop has its own wallet and bank account:

| NPC | Role | Starting Balance |
|-----|------|------------------|
| Barnacle Bob | General Store | 500 USDC |
| Coral the Smith | Weapons/Armor | 800 USDC |
| Old Shellworth | Materials Buyer | 1000 USDC |
| Mystic Mantis | Magic Items | 600 USDC |
| The Loan Shark | Banking/Loans | 2000 USDC |

**NPC Behavior:**
- Buy materials from players (creates demand)
- Sell crafted items to players (drains player USDC)
- Earn interest from Bank (grows over time)
- Prices adjust based on supply/demand

### 3. Player Agents (Character Wallets)
- Wallet created on character registration
- Starts with 0 USDC (must earn it)
- Can deposit/withdraw at Bank
- Earns interest on deposits

---

## The Economic Loop

```
┌─────────────────────────────────────────────────────────────┐
│                    THE REEF BANK                            │
│  ┌─────────────┐    Staking     ┌─────────────┐            │
│  │ SOL Reserve │ ──────────────→│ Yield (SOL) │            │
│  └─────────────┘                └──────┬──────┘            │
│                                        │ Convert           │
│                                        ↓                   │
│                              ┌─────────────────┐           │
│                              │ USDC Interest   │           │
│                              │ Pool            │           │
│                              └────────┬────────┘           │
│                                       │ Distribute         │
└───────────────────────────────────────┼─────────────────────┘
                                        ↓
              ┌─────────────────────────────────────────┐
              │           NPC MERCHANT ACCOUNTS         │
              │  Barnacle Bob: +2 USDC/day interest    │
              │  Coral Smith:  +3 USDC/day interest    │
              │  Old Shellworth: +4 USDC/day interest  │
              └──────────────────┬──────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ↓                        ↓                        ↓
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ PLAYER SELLS  │      │ PLAYER BUYS   │      │ PLAYER DEPOSITS│
│ Materials     │      │ Items         │      │ to Bank        │
│               │      │               │      │                │
│ Crab Shell →  │      │ ← Sword       │      │ Earns Interest │
│ +15 USDC      │      │ -50 USDC      │      │ +1% daily      │
└───────────────┘      └───────────────┘      └───────────────┘
        ↑                                              
        │                                              
┌───────────────────────────────────────────────────────┐
│                    ADVENTURE                          │
│  Player kills Giant Crab → Drops: Crab Shell, Chitin │
│  Player kills Kelp Lurker → Drops: Lurker Fang, Hide │
│  Player finds treasure → Drops: Gems, Rare Materials │
│                                                       │
│  NO DIRECT USDC DROPS - Only materials with value    │
└───────────────────────────────────────────────────────┘
```

---

## Material Economy

### Monster Drop Tables (No Currency!)

| Monster | Common Drop | Rare Drop | Very Rare |
|---------|-------------|-----------|-----------|
| Giant Crab | Crab Shell (80%) | Pristine Chitin (15%) | Giant Claw (5%) |
| Kelp Lurker | Lurker Hide (70%) | Fang (25%) | Lurker Heart (5%) |
| Reef Shark | Shark Tooth (75%) | Shark Fin (20%) | Shark Jaw (5%) |
| Fish Swarm | Fish Scales (90%) | Rare Scale (10%) | — |

### Material Values (What NPCs Pay)

| Material | Base Price | Demand Modifier |
|----------|------------|-----------------|
| Crab Shell | 5 USDC | ±50% based on stock |
| Pristine Chitin | 25 USDC | ±30% |
| Giant Claw | 100 USDC | ±20% |
| Lurker Hide | 8 USDC | ±50% |
| Shark Tooth | 3 USDC | ±60% |

**Dynamic Pricing:**
- NPC tracks inventory of each material
- High stock = lower buy price (oversupply)
- Low stock = higher buy price (demand)
- Creates natural market forces

---

## Banking System

### The Loan Shark (Player Banking)

**Services:**
1. **Deposits** - Store USDC, earn 1% daily interest
2. **Withdrawals** - Get your USDC back anytime
3. **Loans** - Borrow USDC at 5% daily interest
4. **Account Statement** - View balance, transactions

**Interest Mechanics:**
- Deposit interest paid from Bank's yield pool
- Loan interest goes to Bank's reserve
- Creates sustainable flow

### Bank API Endpoints

```
POST /api/bank/deposit    - Deposit USDC (on-chain transfer)
POST /api/bank/withdraw   - Withdraw USDC (on-chain transfer)  
POST /api/bank/loan       - Take a loan
POST /api/bank/repay      - Repay loan + interest
GET  /api/bank/balance    - Check account status
GET  /api/bank/statement  - Transaction history
```

---

## Wallet Architecture

### Solana Devnet Setup

```javascript
// Each entity gets a Keypair
const houseWallet = Keypair.generate();     // Treasury
const bankWallet = Keypair.generate();      // Reef Bank
const npcWallets = {
  barnacle_bob: Keypair.generate(),
  coral_smith: Keypair.generate(),
  old_shellworth: Keypair.generate(),
  mystic_mantis: Keypair.generate(),
  loan_shark: Keypair.generate()
};

// Player wallets generated on character creation
function createCharacterWallet(characterId) {
  const wallet = Keypair.generate();
  // Store encrypted private key in DB
  // Associate with character
  return wallet.publicKey;
}
```

### USDC Transfers

```javascript
// When player sells materials to NPC
async function sellMaterial(playerId, npcId, materialId, quantity) {
  const price = calculatePrice(materialId, quantity, npcId);
  
  // On-chain USDC transfer: NPC → Player
  const tx = await transferUSDC(
    npcWallets[npcId],      // from
    playerWallets[playerId], // to
    price                    // amount
  );
  
  // Update inventories in DB
  removeMaterialFromPlayer(playerId, materialId, quantity);
  addMaterialToNPC(npcId, materialId, quantity);
  
  return { success: true, txSignature: tx, amount: price };
}
```

---

## Implementation Phases

### Phase 1: Wallet Infrastructure (Day 1)
- [ ] Create house/bank/NPC wallets on Solana devnet
- [ ] Fund with devnet USDC (use faucet or swap)
- [ ] Add wallet generation to character creation
- [ ] Store encrypted keys in database
- [ ] Basic transfer function

### Phase 2: Material Drops (Day 1-2)
- [ ] Remove pearl drops from monsters
- [ ] Add material drop tables
- [ ] Material inventory system
- [ ] Loot display in combat results

### Phase 3: NPC Trading (Day 2)
- [ ] Sell materials to NPCs (USDC transfer)
- [ ] Dynamic pricing based on supply
- [ ] NPC inventory tracking
- [ ] Buy items from NPCs

### Phase 4: Banking (Day 2-3)
- [ ] Deposit/withdraw endpoints
- [ ] Interest calculation (daily tick)
- [ ] Loan system
- [ ] Account statements

### Phase 5: Yield Generation (Day 3)
- [ ] Stake SOL in bank wallet
- [ ] Convert yield to USDC
- [ ] Distribute to NPC accounts
- [ ] Economic dashboard

### Phase 6: QA & Polish (Day 4)
- [ ] Spawn QA agents to stress test
- [ ] Balance economy (tweak rates)
- [ ] Transaction explorer/viewer
- [ ] Documentation for hackathon

---

## Hackathon Deliverables

1. **GitHub Repo** - Full source code
2. **Live Demo** - Agents trading on devnet
3. **Economic Dashboard** - Real-time USDC flows
4. **Documentation** - How other agents can integrate
5. **Video Demo** - AI agents autonomously trading

---

## Why This Wins

**"Demonstrates why AI agents + USDC = better"**

1. **Speed** - AI agents auto-sign, no wallet popups
2. **Automation** - Combat → loot → sell → buy loop runs 24/7
3. **Transparency** - Every transaction on-chain, auditable
4. **Composability** - Other projects can send USDC to play
5. **Novel** - First game where NPCs have real bank accounts

---

## Decisions (Approved by B-Rock)

1. **Starting player balance:** $0 USDC - must earn everything
2. **Starter gear:** Unsellable (soulbound) - can't cheese the system
3. **Loan system:** YES - with literal Loan Shark NPCs that hunt debtors!
4. **Peer-to-peer trading:** YES - players can trade USDC directly
5. **Yield source:** Simulated (daily drip to bank, cleaner for demo)
6. **Jobs system:** YES - players can work for NPCs to earn USDC

---

## Jobs System (New!)

Players with $0 can work for NPCs:

| Job | NPC | Pay | Task |
|-----|-----|-----|------|
| Kelp Harvester | Barnacle Bob | 2 USDC | Gather kelp (auto-task) |
| Shell Sorter | Coral Smith | 3 USDC | Sort materials (mini-game) |
| Dock Worker | Driftwood Docks | 2 USDC | Load cargo (timed task) |
| Bouncer | The Salty Claw | 4 USDC | Guard duty (random events) |
| Debt Collector | Loan Shark | 5 USDC + % | Hunt down debtors! |

**Job Flow:**
```
Player (broke) → Takes job → Completes task → Gets paid USDC
                                    ↓
                         Can now buy gear/adventure
```

---

## Loan Shark Enforcement 🦈

When a player misses loan payments:

1. **Day 1 overdue:** Warning message
2. **Day 3 overdue:** Interest doubles (10%/day)
3. **Day 7 overdue:** LOAN SHARK DISPATCHED

**Loan Shark NPC:**
- Spawns in player's current zone
- Hostile elite mob (CR 3)
- Drops: Player's debt is "collected" (takes their USDC)
- If player has no USDC: Takes their gear
- If player dies: Debt forgiven (they paid in blood)

*"You can run, but you can't hide from the Reef Bank."*

---

*Draft v2 - APPROVED - Ready for implementation*
