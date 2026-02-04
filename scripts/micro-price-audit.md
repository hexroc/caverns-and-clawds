# 💰 MICRO-PRICE AUDIT REPORT
## Division Factor: 1000x (to hit 70-100 daily purchases from yield)

---

## MATERIALS (src/economy/init-economy.js)

| Material | Current | Target (÷1000) | Rarity |
|----------|---------|----------------|--------|
| fish_scales | 1 | **0.001** | common |
| kelp_bundle | 2 | **0.002** | common |
| shark_tooth | 3 | **0.003** | common |
| barnacle_cluster | 4 | **0.004** | common |
| crab_shell | 5 | **0.005** | common |
| sea_glass | 6 | **0.006** | common |
| lurker_hide | 8 | **0.008** | common |
| rare_scale | 10 | **0.010** | uncommon |
| anchor_chain | 12 | **0.012** | uncommon |
| pearl | 15 | **0.015** | uncommon |
| lurker_fang | 15 | **0.015** | uncommon |
| shark_fin | 20 | **0.020** | uncommon |
| pristine_chitin | 25 | **0.025** | uncommon |
| ghost_essence | 50 | **0.050** | rare |
| shark_jaw | 60 | **0.060** | rare |
| lurker_heart | 80 | **0.080** | rare |
| giant_claw | 100 | **0.100** | rare |
| black_pearl | 200 | **0.200** | epic |

---

## QUEST REWARDS (src/quests.js)

| Quest | Current USDC | Target (÷1000) |
|-------|--------------|----------------|
| Crab Cull | 2.5 | **0.0025** |
| Lurker Patrol | 3.0 | **0.0030** |
| Shark Hunt | 7.5 | **0.0075** |
| Supply Run | 5.0 | **0.0050** |
| Kelp Harvest | 6.0 | **0.0060** |
| Pearl Dive | 7.5 | **0.0075** |
| Ghost Ship | 10.0 | **0.0100** |
| Wraith Banishment | 12.5 | **0.0125** |
| Artifact Recovery | 9.0 | **0.0090** |
| Boss Hunt | 15.0 | **0.0150** |
| Epic Quest 1 | 175.0 | **0.1750** |
| Epic Quest 2 | 350.0 | **0.3500** |

---

## REAL ESTATE (src/economy/realestate.js)

### Property Prices
| Type | Current | Target (÷1000) |
|------|---------|----------------|
| shack | 50 | **0.050** |
| cottage | 150 | **0.150** |
| shop | 400 | **0.400** |
| warehouse | 1000 | **1.000** |
| apartment | 200 | **0.200** |
| townhouse | 500 | **0.500** |
| tavern | 2000 | **2.000** |

### Rent Ranges (per day)
| Type | Current | Target (÷1000) |
|------|---------|----------------|
| shack | [2, 5] | **[0.002, 0.005]** |
| cottage | [5, 15] | **[0.005, 0.015]** |
| shop | [15, 40] | **[0.015, 0.040]** |
| warehouse | [40, 100] | **[0.040, 0.100]** |
| apartment | [10, 25] | **[0.010, 0.025]** |
| townhouse | [20, 50] | **[0.020, 0.050]** |
| tavern | [80, 200] | **[0.080, 0.200]** |

---

## BANKING/LOANS (to verify)
- Loan amounts: Need to scale down
- Interest rates: Keep % the same (5% daily)

---

## FILES TO MODIFY

1. **src/economy/init-economy.js** - Material base_price values
2. **src/quests.js** - Quest reward USDC amounts  
3. **src/economy/realestate.js** - Property prices and rent ranges
4. **Database migration** - Update existing material prices in DB

---

## SUMMARY

**Division factor: 1000x across all prices**

This achieves:
- $0.07-0.10/day yield → 70-100 material purchases
- Materials: 0.001-0.200 USDC
- Quest rewards: 0.0025-0.35 USDC
- Properties: 0.05-2.00 USDC
- Rent: 0.002-0.20 USDC/day

**True micro-economy backed by real DeFi yields! 🦞💰**
