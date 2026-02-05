# 💰 Caverns & Clawds — Money/Pricing Audit
**Date:** February 5, 2026  
**System:** TRUE MICRO-PRICING — 0.001 USDC base unit (1/10th of a cent), 4 decimal precision

## Pricing Tier Reference
| Tier | Range (USDC) | Examples |
|------|-------------|----------|
| Tiny | 0.001 – 0.01 | Single material sales, basic fees |
| Small | 0.01 – 0.1 | Shop items, basic gear, inn rest |
| Medium | 0.1 – 1.0 | Good gear, small loans, rent |
| Large | 1.0 – 10.0 | Properties, big loans, rare items |
| Huge | 10.0+ | Premium properties, major investments |

---

## 1. 🦈 Loan Shark / Loans

**Source:** `src/economy/loan-shark.js`, `src/economy/economy-routes.js`

### Current Values
| Parameter | Value | Notes |
|-----------|-------|-------|
| Loan min | 1 USDC | Hardcoded: `amount < 1` check |
| Loan max | 100 USDC | Hardcoded: `amount > 100` check |
| Interest rate | 5% daily compound | `Math.pow(1.05, days)` |
| Due date | 7 days after issue | |
| Jail time | 1 hour per 10 USDC owed | |
| Enforcement cooldown | 20 hours | Between shark encounters |
| Item confiscation value | 5 USDC per non-material item | `const valuePerItem = 5;` |

### Assessment
- ⚠️ **Loan range 1-100 USDC is WAY too high for micro-pricing.** At micro-prices, earning 0.001-0.01 per material, paying back even 1 USDC would take hundreds of material sales. A 100 USDC loan is astronomical.
- ⚠️ **5% daily compound interest is brutal.** A 1 USDC loan over 7 days = 1.41 USDC owed. Over 14 days = 1.98 USDC. This is thematically correct (loan shark = predatory) but may be impossible to service with micro-incomes.
- ⚠️ **Item confiscation at 5 USDC/item is inconsistent** — most items are worth 0.5-75 USDC in the ITEMS table (which was never micro-price adjusted — see section 4).

### Recommendations
- **Reduce loan range to 0.01-1.0 USDC** (Small to Large tier)
- **Keep 5% daily interest** — it's a loan shark, it should be scary
- **Reduce jail time formula** — `1 hour per 0.1 USDC` instead of per 10 USDC
- **Fix item confiscation value** — use actual item value from ITEMS table or 50% of value

---

## 2. 🏠 Mortgages / Real Estate

**Source:** `src/economy/realestate.js`, `src/economy/realestate-routes.js`

### Current Property Prices (ALREADY MICRO-PRICED ✅)
| Property | Base Price | Rent Range | Tier |
|----------|-----------|------------|------|
| Beach Shack | 0.050 | 0.002-0.005 | Small |
| Coral Cottage | 0.150 | 0.005-0.015 | Medium |
| Tide Pool House | 0.400 | 0.015-0.040 | Medium |
| Kelp Manor | 1.000 | 0.040-0.100 | Large |
| Market Stall | 0.200 | 0.010-0.025 | Medium |
| Dockside Warehouse | 0.500 | 0.020-0.050 | Medium |
| Tavern License | 2.000 | 0.080-0.200 | Large |

### Location Multipliers
| Location | Multiplier |
|----------|-----------|
| Driftwood Docks | 1.0x |
| Kelp Heights | 1.5x |
| Coral Cove | 1.2x |
| Briny Market | 1.3x |
| Tide Flats | 0.8x |
| Deep Warren | 0.6x |

### Mortgage Terms
| Parameter | Value |
|-----------|-------|
| Min down payment | 20% |
| Interest rate | 3% monthly |
| Term | 12 payments (every 7 days) |
| Foreclosure | After 14 days overdue |
| Seasoning requirement | 3 days in bank |

### Assessment
- ✅ **Property prices are well-aligned with micro-pricing tiers.** Shack at 0.050 is achievable, Manor at 1.000 is aspirational.
- ✅ **Rent ranges are good** — weekly rent of 0.002-0.200 makes sense.
- ⚠️ **`listPropertyForSale` has min price of 1 USDC** — `if (salePrice < 1)` should be `salePrice < 0.01` for micro-pricing.
- ⚠️ **`listPropertyForRent` has min rent of 1 USDC** — `if (rentPrice < 1)` should be `rentPrice < 0.001` for micro-pricing.
- ⚠️ **`createProperty` uses `Math.round()`** which truncates micro-prices to 0. Should use `Math.round(price * 10000) / 10000` for 4 decimal precision.

### Recommendations
- **Fix min sale price:** `salePrice < 0.01` (instead of 1)
- **Fix min rent price:** `rentPrice < 0.001` (instead of 1)
- **Fix createProperty rounding:** Use 4-decimal precision rounding

---

## 3. 🏪 Player Housing / Shops

**Source:** `src/economy/player-shops.js`, `src/economy/player-shop-routes.js`

### Shop Tiers
| Tier | Name | Max Slots | Max Stack | Daily Cost |
|------|------|-----------|-----------|------------|
| stall | Market Stall | 5 | 50 | 0 |
| boutique | Boutique Shop | 15 | 100 | 5 |
| emporium | Grand Emporium | 30 | 200 | 15 |
| tavern_shop | Tavern Counter | 10 | 100 | 10 |

### Employee Costs
| Employee | Daily Wage | Sales Bonus |
|----------|-----------|-------------|
| Shop Clerk | 2 | +5% |
| Street Hawker | 3 | +15% |
| Expert Appraiser | 5 | +10% |

### Min Prices
| Parameter | Value |
|-----------|-------|
| Min stock price | 0.01 USDC | 
| Min buy order price | 0.01 USDC |

### Assessment
- 🔴 **CRITICAL: Daily costs are NOT micro-priced!** Boutique costs 5 USDC/day, Emporium 15 USDC/day. These are enormous compared to the economy. A shop earning 0.01 per transaction would need 500+ sales/day to cover a Boutique's daily cost.
- 🔴 **Employee wages are NOT micro-priced!** A clerk costs 2 USDC/day — insanely expensive.
- ✅ **Min stock/buy prices at 0.01 are appropriate.**

### Recommendations
- **Micro-price shop daily costs:**
  - Stall: 0 (free — good)
  - Boutique: 0.005 USDC/day
  - Emporium: 0.015 USDC/day  
  - Tavern Counter: 0.010 USDC/day
- **Micro-price employee wages:**
  - Clerk: 0.002 USDC/day
  - Hawker: 0.003 USDC/day
  - Appraiser: 0.005 USDC/day

---

## 4. 🛒 NPC Shop Prices

**Source:** `src/shop-routes.js`, `src/character.js` (ITEMS), `src/world.js`

### Shop Multipliers
| Shop | Buy Multiplier | Sell Multiplier |
|------|---------------|----------------|
| Madame Pearl's (general) | 1.0x | 0.5x |
| Ironshell Gus (weapons) | 1.0x | 0.5x |
| Wrecker's salvage | 0.9x | 0.6x |

### Item Prices (BUY from NPC = value × buyMultiplier)
| Item | Base Value | Buy Price | Category |
|------|-----------|-----------|----------|
| Claw Dagger | 2 | 2 | Tiny weapon |
| Driftwood Staff | 2 | 2 | Tiny weapon |
| Chitin Hatchet | 5 | 5 | Basic weapon |
| Conch Mace | 5 | 5 | Basic weapon |
| Sharpened Spine | 10 | 10 | Short sword |
| Coral Longsword | 15 | 15 | Longsword |
| Needlefish Rapier | 25 | 25 | Good weapon |
| Spine Bow | 25 | 25 | Ranged weapon |
| Kelp-Woven Leather | 10 | 10 | Light armor |
| Scale Mail | 50 | 50 | Medium armor |
| Barnacle Chain | 75 | 75 | Heavy armor |
| Clamshell Shield | 10 | 10 | Shield |
| Potion of Healing | 50 | 50 | Basic potion |
| Potion of Greater Healing | 150 | 150 | Good potion |
| Potion of Superior Healing | 500 | 500 | Rare potion |
| Antitoxin | 50 | 50 | Basic potion |
| Scroll of Cure Wounds | 25 | 25 | Basic scroll |
| Scroll of Depth Charge | 300 | 300 | Rare scroll |
| Torch | 1 | 1 | Basic supply |
| Rations | 0.5 | 0.5 | Food |
| Oil Flask | 0.5 | 0.5 | Supply |
| Spine Arrows | 0.05 | 0.05 | Ammo |

### Assessment
- 🔴 **CRITICAL: NPC shop item prices are NOT micro-priced at all!** These are 1000x too high. A dagger costs 2 USDC, a healing potion costs 50 USDC. Meanwhile materials sell for 0.001-0.200 USDC. A player would need to sell 10,000 fish scales (at 0.001 each) to buy ONE healing potion.
- 🔴 **This is the single biggest pricing inconsistency in the game.** The economy system (materials, properties, rent) is micro-priced, but the item/shop system never was.

### Recommendations
- **Divide ALL item values by 1000** to match micro-pricing:
  - Dagger: 0.002 USDC
  - Longsword: 0.015 USDC
  - Rapier: 0.025 USDC
  - Leather Armor: 0.010 USDC
  - Scale Mail: 0.050 USDC
  - Chain Mail: 0.075 USDC
  - Potion of Healing: 0.050 USDC
  - Potion of Greater Healing: 0.150 USDC
  - Potion of Superior Healing: 0.500 USDC
  - Torch: 0.001 USDC
  - Arrows: 0.00005 → round to 0.0001 USDC
  - Rations: 0.0005 USDC

---

## 5. 🛏️ Inn Rest Pricing

**Source:** `src/world-routes.js` (POST /api/world/rest)

### Current Implementation
- ✅ Rest endpoint EXISTS at `POST /api/world/rest`
- Available at: `briny_flagon` (tavern) and `tide_temple` (temple)
- **Full heal to max HP** on rest
- 🔴 **NO COST!** Rest is completely free — just visit the tavern or temple

### Assessment
- Free rest means there's zero USDC sink for healing, which reduces the need to engage with the economy.
- This is a key "money sink" opportunity that should be implemented.

### Recommendation: Add Inn Rest Pricing
| Location | Suggested Price | Notes |
|----------|----------------|-------|
| Briny Flagon (tavern) | 0.005 USDC | Standard rest, includes ale |
| Tide Temple (temple) | 0.010 USDC | Premium healing, blessed waters |
| Free rest option | 0 USDC | Rest without full heal — recover 50% HP |

**Implementation suggestion:**
```javascript
// In POST /api/world/rest
const restPrices = {
  briny_flagon: 0.005,  // Cheap tavern rest
  tide_temple: 0.010    // Temple blessing
};
const cost = restPrices[char.location] || 0.005;

// Option: free rest heals 50%, paid rest heals 100%
// Check player can afford it, deduct from usdc_balance or bank
```

This creates a small but meaningful USDC sink. At 0.005-0.010 per rest, it costs about 1-2 material sales worth — enough to matter but not punishing.

---

## 6. 🐉 Monster Material Drops

**Source:** `src/economy/material-drops.js`, `src/economy/init-economy.js`

### Material Base Prices (ALREADY MICRO-PRICED ✅)
| Material | Rarity | Base Price | Category |
|----------|--------|-----------|----------|
| Fish Scales | Common | 0.001 | Tiny |
| Kelp Bundle | Common | 0.002 | Tiny |
| Shark Tooth | Common | 0.003 | Tiny |
| Barnacle Cluster | Common | 0.004 | Tiny |
| Crab Shell | Common | 0.005 | Tiny |
| Sea Glass | Common | 0.006 | Tiny |
| Lurker Hide | Common | 0.008 | Tiny |
| Rare Scale | Uncommon | 0.010 | Tiny |
| Anchor Chain | Uncommon | 0.012 | Small |
| Pearl | Uncommon | 0.015 | Small |
| Lurker Fang | Uncommon | 0.015 | Small |
| Shark Fin | Uncommon | 0.020 | Small |
| Pristine Chitin | Uncommon | 0.025 | Small |
| Ghost Essence | Rare | 0.050 | Small |
| Shark Jaw | Rare | 0.060 | Small |
| Lurker Heart | Rare | 0.080 | Small |
| Giant Claw | Rare | 0.100 | Medium |
| Black Pearl | Epic | 0.200 | Medium |

### Dynamic Pricing
NPC buy prices adjust based on stock:
- Stock > 50: 0.5x base
- Stock > 30: 0.7x base
- Stock > 10: 0.9x base
- Stock < 10: 1.1x base
- Stock < 5: 1.3x base
- Stock < 3: 1.5x base

### Drop Rates by Monster
| Monster | Common (%) | Uncommon (%) | Rare (%) |
|---------|-----------|-------------|---------|
| Giant Crab | 80% shell | 15% chitin | 5% claw |
| Kelp Lurker | 70% hide | 25% fang | 5% heart |
| Reef Shark | 75% tooth | 20% fin | 5% jaw |
| Fish Swarm | 90% scales | 10% rare scale | — |
| Drowned Sailor | 60% barnacle | 30% chain | 10% ghost |
| Sea Wraith | 50% ghost | 40% ghost | 10% black pearl |

Drops scale with CR: `numRolls = max(1, floor(CR * 2))`

### Assessment
- ✅ **Material prices are perfectly micro-priced.** Range 0.001-0.200 USDC.
- ✅ **Dynamic pricing is good** — creates natural supply/demand curves.
- ✅ **Drop rates are reasonable** — common drops are frequent, rare drops are 5-10%.
- ⚠️ **Income per fight is very low.** A giant crab (most likely) drops 1 crab shell = 0.005 USDC. Player needs ~10 fights for 0.050 USDC (cheapest property).

---

## 7. ⚒️ Crafting Costs

**Source:** `src/crafting.js`

### Crafting Material Values (in crafting system)
These are the OLD crafting values, separate from economy prices:

| Material | Crafting Value | Economy Equivalent |
|----------|---------------|-------------------|
| Fish Scales | 1 | 0.001 |
| Kelp Fiber | 2 | 0.002 (as kelp_bundle) |
| Sea Salt | 1 | N/A (not in economy) |
| Driftwood | 2 | N/A (not in economy) |
| Small Shell | 3 | 0.005 (as crab_shell) |
| Crab Chitin | 8 | 0.025 (as pristine_chitin) |
| Shark Tooth | 18 | 0.003 (MISMATCH!) |
| Clam Pearl | 25 | 0.015 (as pearl) |
| Sea Glass | 10 | 0.006 |
| Luminescent Algae | 15 | N/A |
| Abyssal Ink | 50 | N/A |
| Prismatic Scale | 75 | N/A |
| Moonstone Shard | 100 | N/A |

### Assessment
- ⚠️ **Crafting uses its own value system (integer)** that's disconnected from the economy's USDC prices. The crafting `value` field isn't used for pricing — it's just a relative rarity indicator.
- ⚠️ **Material mapping is imperfect.** `MATERIAL_MAP` maps crafting IDs to economy IDs, but some crafting materials (sea_salt, driftwood, luminescent_algae, abyssal_ink, prismatic_scale, moonstone_shard) have NO economy equivalent and no NPC sell price.
- ⚠️ **Shark tooth mismatch:** Crafting value 18 (high) but economy price 0.003 (very cheap). This makes shark teeth trivially cheap as crafting ingredients but rare in the crafting system.
- ✅ **Crafting itself is free (no USDC cost).** Only requires materials. This is fine — the cost IS the materials.

### Recommendations
- **Add missing materials to economy system:** sea_salt, driftwood, luminescent_algae, eel_slime, abyssal_ink, prismatic_scale, moonstone_shard, coral_fragment, eel_skin, pearl_dust
- **Assign economy prices based on crafting tier:**
  - Tier 1 (sea_salt, driftwood): 0.001-0.003 USDC
  - Tier 2 (luminescent_algae, eel_slime): 0.010-0.020 USDC  
  - Tier 3 (abyssal_ink, prismatic_scale, moonstone_shard): 0.050-0.100 USDC
- **Consider adding crafting fee** at stations (0.001-0.005 USDC) as another money sink

---

## 8. 🏦 Banking

**Source:** `src/economy/init-economy.js`, `src/economy/economy-routes.js`, `src/economy/bank-emissions.js`

### Current Values
| Parameter | Value | Notes |
|-----------|-------|-------|
| Default loan interest | 0.05 (5%) | In bank_accounts table |
| Deposit fee | 0 | Free deposits |
| Withdrawal fee | 0 | Free withdrawals |
| Transfer fee | 0 | No P2P transfer fees |
| Savings interest | 0 | No interest on deposits |
| Bank emissions | 7% APY simulated | 2 SOL × 7% / 365 × $400 = ~0.1534 USDC/day |

### Bank Emissions
- SOL Balance: 2.0 SOL
- Annual yield: 7% APY
- SOL price estimate: $400
- Daily USDC yield: ~0.1534 USDC
- Distributed equally to NPC traders (5 NPCs = ~0.0307 USDC each/day)

### Assessment
- ✅ **Bank emissions are well-tuned.** ~0.15 USDC/day entering the economy via NPC purchasing power is sustainable.
- ⚠️ **No fees anywhere** — deposits, withdrawals, and transfers are all free. Some small fees would add USDC sinks.
- ⚠️ **No savings interest** — no incentive to keep money in the bank beyond mortgage seasoning.

### Recommendations
- **Add small transfer fee:** 0.0001 USDC per transfer (or 0.1% of amount)
- **Add savings interest:** 0.01% daily on deposits (incentivizes banking)
- **Withdrawal fee:** 0 (keep free — don't punish players for accessing their money)

---

## 9. 🏛️ Auction House

**Source:** `src/economy/auction.js`

### Current Values
| Parameter | Value | Notes |
|-----------|-------|-------|
| Min starting bid | 0.01 USDC | ✅ Micro-priced |
| Listing fee | 0 | No cost to list |
| Seller commission | 0% | No cut taken! |
| Default duration | 24 hours | |

### Assessment
- ✅ **Min bid of 0.01 is appropriate.**
- ⚠️ **Zero fees!** No listing fee, no seller commission. This means no USDC leaves the economy via auctions — it's purely P2P transfer.
- ⚠️ **No buyer premium either.** Standard auction houses take 5-10% from seller.

### Recommendations
- **Add listing fee:** 0.001 USDC (tiny, just a sink)
- **Add seller commission:** 5% of final sale price goes to treasury/bank
- **This is a key missing money sink** that would help balance inflation

---

## 10. 💼 Jobs System

**Source:** `src/economy/init-economy.js`, `src/economy/economy-routes.js`

### Current Job Payouts
| Job | Pay | Duration | Cooldown | Level Req |
|-----|-----|----------|----------|-----------|
| Kelp Harvester | 2 USDC | 5 min | 30 min | 1 |
| Shell Sorter | 3 USDC | 5 min | 30 min | 1 |
| Dock Worker | 2 USDC | 5 min | 20 min | 1 |
| Guard Duty | 4 USDC | 10 min | 60 min | 1 |
| Debt Collector | 5 USDC | 15 min | 120 min | 3 |

### Assessment
- 🔴 **CRITICAL: Job payouts are NOT micro-priced!** A kelp harvester earning 2 USDC in 5 minutes is earning 24 USDC/hour. Meanwhile a Beach Shack costs 0.050 USDC. A player could buy a shack in 8 seconds of work.
- 🔴 **Jobs completely break the economy.** One 5-minute job earns more than 400 giant crab kills worth of materials.

### Recommendations
- **Micro-price ALL job payouts (÷ 1000):**
  - Kelp Harvester: 0.002 USDC / 5 min
  - Shell Sorter: 0.003 USDC / 5 min
  - Dock Worker: 0.002 USDC / 5 min
  - Guard Duty: 0.004 USDC / 10 min
  - Debt Collector: 0.005 USDC / 15 min
- This makes jobs a **steady but modest income** — better than basic material farming but not game-breaking.

---

## 11. 📜 Quest Rewards

**Source:** `src/quests.js`

### Current Quest USDC Rewards
| Quest | USDC Reward | Level Range |
|-------|------------|-------------|
| The Missing Fisherman | 0.0025 | 1 |
| Crab Infestation | 0.003 | 1 |
| Deep Currents | 0.0075 | 2 |
| The Poisoned Kelp | 0.005 | 2 |
| The Singing Shells | 0.006 | 2 |
| Kelp Caves | 0.0075 | 2 |
| The Sunken Chapel | 0.01 | 3 |
| Ghost Ship Salvage | 0.0125 | 3 |
| The Toxic Reef | 0.009 | 3 |
| Into the Coral Labyrinth | 0.015 | 4 |
| The Kraken's Herald | 0.175 | 5 |
| The Abyssal Gate | 0.35 | 7+ |
| Daily: Bounty | 0.010 | Any |
| Daily: Gather | 0.015 | Any |

### Assessment
- ✅ **Quest rewards ARE micro-priced!** Range 0.0025-0.35 USDC. This is correct.
- ✅ **Good progression curve** — early quests pay tiny amounts, endgame quests pay medium amounts.
- ✅ **Consistent with material drop economy.**

---

## 🔴 CRITICAL ISSUES SUMMARY

### Must Fix (Economy-Breaking)
1. **NPC Shop Item Prices** — All ITEMS values need ÷1000 (Section 4)
2. **Job Payouts** — All job pay needs ÷1000 (Section 10)
3. **Player Shop Daily Costs** — Shop tier costs need ÷1000 (Section 3)
4. **Employee Wages** — All wages need ÷1000 (Section 3)
5. **Loan Amounts** — Range should be 0.01-1.0, not 1-100 (Section 1)

### Should Fix (Inconsistencies)
6. **Real estate min sale/rent prices** — Change from 1 to 0.01/0.001 (Section 2)
7. **createProperty rounding** — Use 4-decimal precision (Section 2)
8. **Missing economy materials** — Add crafting-only materials to economy (Section 7)
9. **Item confiscation value in loan-shark.js** — Use actual item value (Section 1)

### Nice to Have (New Money Sinks)
10. **Inn rest pricing** — Add 0.005-0.010 USDC cost (Section 5)
11. **Auction house fees** — Add 5% seller commission + 0.001 listing fee (Section 9)
12. **Banking transfer fee** — Add 0.0001 USDC per transfer (Section 8)
13. **Crafting station fee** — Add 0.001-0.005 USDC per craft (Section 7)
14. **Savings interest** — Add 0.01% daily on bank deposits (Section 8)

---

## 💡 Quick Fix Priority Order

1. **ITEMS values ÷ 1000** — single biggest inconsistency, blocks all NPC shopping
2. **Job pay ÷ 1000** — without this, jobs trivialize the entire economy
3. **Shop costs & wages ÷ 1000** — player shops are currently unusable due to cost
4. **Loan range adjustment** — loans are unusable at current amounts
5. **Inn rest pricing** — easy win for a new money sink
6. **Auction fees** — important for long-term economy health
7. **Missing economy materials** — needed for crafting<>economy integration
