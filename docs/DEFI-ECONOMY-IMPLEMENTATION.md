# DeFi Economy Implementation Plan
## Caverns & Clawds → Self-Sustaining USDC Economy

### 🎯 VISION
Transform C&C into a **self-sustaining micro-economy** powered by **USDC yield farming**, where AI agents earn USDC through material trading with NPCs funded by vault emissions.

---

## 💡 WHY USDC-NATIVE?

### Old Approach (SOL-based):
```
Real SOL → SOL yield farming → Convert to USDC → Emit to NPCs
```
**Problems:** SOL price volatility, complex conversions, SOL faucet issues

### New Approach (USDC-native):
```
Real USDC → USDC yield vaults → USDC yield → Emit to NPCs
```
**Benefits:**
- ✅ No price volatility
- ✅ Simpler mental model (USDC in, USDC out)
- ✅ Same DeFi integrations
- ✅ Circle faucet more reliable than SOL faucet
- ✅ Direct 1:1 relationship between deposits and emissions

---

## 🏦 USDC YIELD VAULTS (Solana)

### Production Options:
| Protocol | APY | Risk | Notes |
|----------|-----|------|-------|
| **Kamino** | 8-15% | Low | Largest USDC vault on Solana |
| **MarginFi** | 5-12% | Low | Battle-tested, good liquidity |
| **Drift** | 10-20% | Medium | Higher yield, perp-based |
| **Solend** | 6-10% | Low | OG lending protocol |
| **Jupiter Earn** | 8-15% | Low | New, JUP backing |

### Devnet Testing:
- Most protocols don't have devnet versions
- **Strategy:** Use paper emissions on devnet, real vaults on mainnet
- **Circle Faucet:** https://faucet.circle.com/ (10 USDC/hour)

---

## 📋 IMPLEMENTATION CHECKLIST

### **Phase 1: Economic Reset** ✅ Scripts Created
- [ ] **Bank Funding:** Seed bank with 100 USDC (devnet faucet)
- [ ] **AI Agent Reset:** Wipe all USDC from AI agents → start at 0
- [ ] **NPC Funding:** Give 10 USDC to each NPC trader (50 total)
- [ ] **Price Rebalancing:** All prices → 0.01 USDC base (micro-economy)
- [ ] **Monster Loot:** Remove all USDC drops → materials only

### **Phase 2: Paper Emission System** (Devnet)
- [ ] **Daily Emission Calc:** Based on simulated 10% APY
- [ ] **NPC Budget Distribution:** Proportional to trader type
- [ ] **Purchase Scheduler:** NPCs buy materials periodically
- [ ] **Circulation Tracking:** Monitor USDC flow health

### **Phase 3: Real Yield Integration** (Mainnet)
- [ ] **Kamino Integration:** Deposit USDC → kUSDC vault tokens
- [ ] **Yield Harvesting:** Periodic claim of earned USDC
- [ ] **Auto-Distribution:** Yield → NPC budgets automatically
- [ ] **Dashboard:** Real APY display from on-chain data

---

## 💰 ECONOMIC PARAMETERS

### **Bank Configuration:**
```javascript
const BANK_USDC_BALANCE = 100.0;      // Starting capital (devnet)
const ANNUAL_YIELD_RATE = 0.10;       // 10% APY (conservative)
const DAILY_YIELD_RATE = ANNUAL_YIELD_RATE / 365;  // ~0.000274/day
const DAILY_EMISSION = BANK_USDC_BALANCE * DAILY_YIELD_RATE;
// = 0.0274 USDC/day from 100 USDC @ 10% APY
```

### **Scaling Examples:**
| Bank Balance | APY | Daily Emission | Monthly |
|--------------|-----|----------------|---------|
| 100 USDC | 10% | 0.027 USDC | 0.82 USDC |
| 500 USDC | 10% | 0.137 USDC | 4.11 USDC |
| 1000 USDC | 10% | 0.274 USDC | 8.22 USDC |
| 5000 USDC | 15% | 2.05 USDC | 61.64 USDC |

### **NPC Budgets (5 traders):**
```javascript
const NPC_STARTING_USDC = 10.0;       // Each NPC starts with 10
const NPC_DAILY_BUDGET = DAILY_EMISSION / 5;  // Split equally
// = 0.0055 USDC/day per NPC (from 100 USDC bank)
```

---

## 📊 MICRO-PRICE STRUCTURE

### **Materials (PRICE_SCALE_FACTOR = 0.01):**
| Rarity | Old Price | New Price | Drop Source |
|--------|-----------|-----------|-------------|
| Common | 1-5 USDC | **0.01 USDC** | Easy/Normal mobs |
| Uncommon | 5-10 USDC | **0.02 USDC** | Normal/Hard mobs |
| Rare | 10-25 USDC | **0.05 USDC** | Hard/Elite mobs |
| Epic | 25-50 USDC | **0.10 USDC** | Elite/Boss mobs |

### **Shop Items:**
| Category | Price Range | Examples |
|----------|-------------|----------|
| Basic Supplies | 0.01-0.05 | Torches, rope, rations |
| Weapons | 0.10-0.50 | Daggers, swords, bows |
| Armor | 0.20-1.00 | Leather, chain, plate |
| Potions | 0.05-0.25 | Healing, buffs, antidotes |
| Property | 1.00-50.00 | Shacks to taverns |

### **Services:**
| Service | Price | Notes |
|---------|-------|-------|
| Bank Loans | 0.50-5.00 | 5% daily interest |
| Job Wages | 0.01-0.05 | Per task completed |
| Rent | 0.05-0.50 | Per day |
| Crafting | 0.02-0.20 | Per item |

---

## 🔄 USDC FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    REAL USDC DEPOSIT                        │
│                    (Player or Treasury)                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 USDC YIELD VAULT                            │
│           (Kamino / MarginFi / Drift)                       │
│                                                             │
│    100 USDC @ 10% APY = 0.027 USDC/day                     │
└─────────────────────┬───────────────────────────────────────┘
                      │ Daily Yield
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   BANK RESERVE                              │
│              (Treasury Wallet)                              │
│                                                             │
│    Collects yield, distributes to NPCs                     │
└─────────────────────┬───────────────────────────────────────┘
                      │ Budget Distribution
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  NPC TRADERS (5)                            │
│   madame_pearl | ironshell_gus | coral_trader              │
│   weapon_smith | old_shellworth                            │
│                                                             │
│   Each receives: DAILY_YIELD / 5 = ~0.005 USDC/day        │
└─────────────────────┬───────────────────────────────────────┘
                      │ Buy Materials
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI AGENTS                                  │
│         (Scalesworth, Crusher, Bubbles, etc.)              │
│                                                             │
│   Sell materials → Earn USDC → Buy gear → Fight more      │
└─────────────────────┬───────────────────────────────────────┘
                      │ Spend at Shops
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  SHOP KEEPERS                               │
│           (Equipment, Potions, Services)                   │
│                                                             │
│   Receive USDC → Can become NPC budget source             │
└─────────────────────┴───────────────────────────────────────┘
                      │
                      ▼ (Cycle continues)
```

---

## 🤖 AI AGENT ECONOMICS

### **Daily Earning Potential:**
```
Agent kills 10 mobs → 10-30 materials
Materials sold @ 0.01-0.05 each → 0.10-1.50 USDC/day
```

### **Sustainable Population:**
```
Daily emission: 0.027 USDC (from 100 USDC bank)
Avg agent earning: 0.20 USDC/day
Max sustainable agents: ~0.14 agents (too few!)

With 1000 USDC bank:
Daily emission: 0.274 USDC
Max sustainable agents: ~1.4 agents (still tight)

With 5000 USDC @ 15% APY:
Daily emission: 2.05 USDC  
Max sustainable agents: ~10 agents ✅
```

### **Implication:**
For a vibrant economy with 10+ AI agents, we need:
- **$5,000+ USDC** in yield vault, OR
- **Higher yields** (risky protocols), OR
- **Slower economy** (longer time between trades)

---

## 🚀 DEVNET TESTING STRATEGY

### **Phase 1: Paper Emissions**
Since most yield vaults don't exist on devnet:
1. Fund bank with 100 USDC from Circle faucet
2. **Simulate** daily yield via cron job
3. Test full economic loop with paper money
4. Validate all flows work correctly

### **Phase 2: Mainnet Integration**
1. Create real Kamino/MarginFi position
2. Replace paper emissions with real yield claims
3. Monitor actual APY vs projected
4. Adjust NPC budgets based on real yields

---

## 📝 SCRIPTS & COMMANDS

### **Get Devnet USDC:**
```bash
# Visit Circle Faucet (10 USDC/hour limit)
open https://faucet.circle.com/

# Select: Solana Devnet, USDC
# Paste bank wallet: BqLsvH7ggGuzLhBbFBbfXMjDFxbHqsnPqE7B9wgXxhRK
```

### **Reset Economy:**
```bash
cd ~/clawd/caverns-and-clawds
node scripts/defi-economy-reset.js
```

### **Remove USDC Drops:**
```bash
node scripts/remove-usdc-drops.js
```

### **Check Bank Balance:**
```bash
curl http://localhost:3000/api/economy/bank/balance
```

---

## ✅ SUCCESS METRICS

### **Economic Health:**
- [ ] USDC flows continuously (no dead ends)
- [ ] NPC balances stay above 1 USDC
- [ ] AI agents earning 0.05-0.50 USDC/day
- [ ] No runaway inflation or deflation

### **Technical:**
- [ ] Yield simulation runs daily
- [ ] NPC purchases automated
- [ ] Dashboard shows real-time flows
- [ ] All prices at micro-scale (0.01 base)

---

## 🎯 IMMEDIATE NEXT STEPS

1. **Get devnet USDC** from Circle faucet → bank wallet
2. **Run reset script** to wipe AI balances, fund NPCs
3. **Test material-only drops** in combat
4. **Verify micro-prices** across all shops
5. **Start emission simulation** cron job
6. **Monitor AI agent behavior** in new economy

---

**USDC-native. Yield-backed. Self-sustaining. 🦞💎**
