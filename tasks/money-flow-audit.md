# 💰 Caverns & Clawds — MONEY FLOW AUDIT
**Date:** February 5, 2026  
**Auditor:** Clawd (subagent)  
**Directive:** B-Rock: "Make sure money isn't just created. Every NPC must link to the bank for daily stipend."

---

## Executive Summary

The economy has **TWO major money printer categories**:

1. **Quest Engine v2 (quest-engine.js)** — Rewards 2.5–120 USDC per quest with NO source deduction. This is the #1 money printer.
2. **NPC Shop Item Sales (shop-routes.js)** — NPCs sell items and the USDC goes to `updateCurrency()` which just adds to player balance — the NPC has no wallet to receive it. And NPC buys give USDC to player via `updateCurrency()` from thin air.
3. **Resurrection cost (encounters.js)** — 25 USDC deducted on paid resurrection but goes nowhere (burned, not sent to bank).
4. **Rest costs (world-routes.js)** — 0.002–0.005 USDC deducted but goes nowhere (burned, not sent to any NPC/bank).

The **core economy system** (economy-routes.js, trading.js, auction.js, player-shops.js, realestate.js) is **well-designed and mostly closed-loop**. The main money printer is the **old quest system and quest-engine v2**, plus the **NPC item shop**.

---

## 1. Complete USDC Creation/Addition Points

### 🔴 MONEY PRINTERS (USDC appears from nowhere)

#### 1A. Quest System — `src/quests.js:697`
```js
'UPDATE clawds SET xp = ?, level = ?, usdc_balance = usdc_balance + ? WHERE id = ?'
```
- **Classification:** 🔴 **MONEY PRINTER**
- **Amount:** 0.0025–0.35 USDC per quest (micro-priced, relatively small)
- **Source of funds:** NOWHERE. USDC is simply added to player balance.
- **How it should work:** Quest giver NPC should have a wallet. USDC reward should be deducted from the NPC's balance. NPC gets refunded via bank stipend.

#### 1B. Quest Engine v2 — `src/quest-engine.js:1395`
```js
this.db.prepare('UPDATE clawds SET xp = ?, level = ?, usdc_balance = usdc_balance + ? WHERE id = ?')
  .run(newXP, newLevel, usdcGained, characterId);
```
- **Classification:** 🔴 **MONEY PRINTER — CRITICAL**
- **Amount:** 2.5–120+ USDC per quest (!!)
- **Quest rewards (NOT micro-priced!):**
  - `bounty_hunt`: 2.5 + 0.5/level USDC
  - `pest_control`: 4.0 + 0.8/level USDC
  - `shark_bounty`: 6.0 + 1.2/level USDC
  - `undead_purge`: 8.0 + 1.5/level USDC
  - `cartographer_kelp`: 5.0 + 1.0/level USDC
  - `deep_explorer`: 100 + 20/level USDC
  - `graveyard_surveyor`: 90 + 18/level USDC
  - `supply_run`: 45 + 0.8/level USDC
  - `parts_collector`: 75 + 1.5/level USDC
  - `relic_recovery`: 120 + 25/level USDC
- **This is the SINGLE BIGGEST money printer.** A level 5 character completing `deep_explorer` gets 200 USDC. The entire bank emission is 0.15 USDC/day.

#### 1C. NPC Item Shop — Sell to Player: `src/shop-routes.js:306`
```js
const currencyResult = characters.updateCurrency(char.id, 'usdc', totalValue);
```
- **Classification:** 🔴 **MONEY PRINTER**
- **Context:** When player sells items TO NPC shop, `updateCurrency` adds USDC to player balance.
- **Where does the USDC come from?** NOWHERE. `updateCurrency()` just does `usdc_balance + amount`. The NPC shopkeeper (Madame Pearl, Ironshell Gus, etc.) has NO wallet balance that is deducted.
- **Note:** These NPCs (defined in `world.js`) are DIFFERENT from the economy system NPCs (defined in `init-economy.js`). The shop system and economy system use different NPC registries!

#### 1D. NPC Item Shop — Buy from Player gets USDC deducted: `src/shop-routes.js:204`
```js
const currencyResult = characters.updateCurrency(char.id, 'usdc', -totalCost);
```
- **Classification:** ⚠️ **MONEY BURNER** (inverse problem)
- **Context:** When player buys items FROM NPC, USDC is deducted from player via `updateCurrency` but the USDC goes **nowhere** — not to the NPC, not to the bank, not to treasury. It's just destroyed.

#### 1E. Resurrection — `src/encounters.js:2398`
```js
UPDATE clawds SET ... usdc_balance = usdc_balance - ? ... WHERE id = ?
```
- **Classification:** ⚠️ **MONEY BURNER** (USDC destroyed, not transferred)
- **Amount:** 25 USDC for paid resurrection
- **The 25 USDC is NOT micro-priced!** Should be 0.025 USDC.
- **Deducted from player but goes nowhere.** Should go to the Tide Temple (NPC) or bank.

#### 1F. Rest Costs — `src/world-routes.js:455`
```js
db.prepare('UPDATE clawds SET usdc_balance = usdc_balance - ? WHERE id = ?')
  .run(restOption.cost, char.id);
```
- **Classification:** ⚠️ **MONEY BURNER** (USDC destroyed, not transferred)
- **Amount:** 0.005 USDC (Briny Flagon) or 0.002 USDC (Tide Temple)
- **Deducted from player but goes nowhere.** Should go to tavern NPC or temple NPC.

#### 1G. Henchman Pull Cost — `src/henchman-routes.js:133`
```js
db.prepare('UPDATE clawds SET usdc_balance = usdc_balance - ? WHERE id = ?')
  .run(cost, char.id);
```
- **Classification:** ⚠️ **MONEY BURNER** (USDC destroyed on henchman gacha pull)
- **Amount:** Variable per pull
- **Deducted from player but goes nowhere.** Could go to bank or treasury.

---

### ✅ CLOSED LOOP (USDC moves between accounts properly)

#### 2A. Material Sale to NPC — `src/economy/economy-routes.js:272`
```js
db.prepare('UPDATE clawds SET usdc_balance = usdc_balance + ? WHERE id = ?').run(totalPrice, char.id);
db.prepare('UPDATE system_wallets SET balance_cache = balance_cache - ? WHERE id = ?').run(totalPrice, npcId);
```
- **Classification:** ✅ **CLOSED LOOP**
- **Player gets USDC, NPC balance_cache decreases**
- **Also attempts on-chain transfer from NPC wallet**

#### 2B. Job Completion Pay — `src/economy/economy-routes.js:560`
```js
// Transfer payment: NPC -> Player (via wallet.transferUSDC)
db.prepare('UPDATE clawds SET usdc_balance = usdc_balance + ? WHERE id = ?') [implied by on-chain transfer]
```
- **Classification:** ⚠️ **PARTIALLY CLOSED**
- **The job payment comes from the NPC's system_wallet** (on-chain transfer attempted), but the database-level `usdc_balance` update for the player happens regardless of on-chain success. **The NPC's `balance_cache` is NOT decremented in the jobs/complete handler!**
- **Missing:** `UPDATE system_wallets SET balance_cache = balance_cache - ? WHERE id = ?` for the NPC

#### 2C. Bank Loan — `src/economy/economy-routes.js:480`
```js
db.prepare('UPDATE clawds SET usdc_balance = usdc_balance + ? WHERE id = ?').run(amount, char.id);
```
- **Classification:** ⚠️ **PARTIALLY CLOSED**
- **Attempts on-chain transfer from bank wallet to player wallet**
- **Bank's `balance_cache` is NOT decremented in the database!**
- **Missing:** `UPDATE system_wallets SET balance_cache = balance_cache - ? WHERE id = 'bank'`

#### 2D. Bank Deposit — `src/economy/economy-routes.js:398`
```js
db.prepare('UPDATE clawds SET usdc_balance = usdc_balance - ? WHERE id = ?').run(amount, char.id);
// bank_accounts.deposited_balance += amount
```
- **Classification:** ✅ **CLOSED LOOP**
- Player USDC decreases, bank deposited_balance increases

#### 2E. Bank Withdrawal — `src/economy/economy-routes.js:~450`
```js
db.prepare('UPDATE clawds SET usdc_balance = usdc_balance + ? WHERE id = ?').run(amount, char.id);
// bank_accounts.deposited_balance -= amount
```
- **Classification:** ✅ **CLOSED LOOP**
- Bank deposited_balance decreases, player USDC increases

#### 2F. Loan Repayment — `src/economy/economy-routes.js:650`
```js
db.prepare('UPDATE clawds SET usdc_balance = usdc_balance - ? WHERE id = ?').run(payAmount, char.id);
```
- **Classification:** ✅ **CLOSED LOOP** — Player pays, loan balance reduced, on-chain transfer to bank

#### 2G. P2P USDC Transfer — `src/economy/trading.js:59-61`
```js
db.prepare('UPDATE clawds SET usdc_balance = usdc_balance - ? WHERE id = ?').run(amount, fromChar.id);
db.prepare('UPDATE clawds SET usdc_balance = usdc_balance + ? WHERE id = ?').run(amount, toChar.id);
```
- **Classification:** ✅ **CLOSED LOOP** — Zero-sum player-to-player transfer

#### 2H. Auction Buyout — `src/economy/auction.js:263-265`
```js
db.prepare('UPDATE clawds SET usdc_balance = usdc_balance - ? WHERE id = ?').run(auction.buyout_price, buyerId);
db.prepare('UPDATE clawds SET usdc_balance = usdc_balance + ? WHERE id = ?').run(auction.buyout_price, auction.seller_id);
```
- **Classification:** ✅ **CLOSED LOOP** — Buyer pays, seller receives

#### 2I. Auction Finalize — `src/economy/auction.js:357-359`
- **Classification:** ✅ **CLOSED LOOP** — Same as buyout

#### 2J. Player Shop Buy — `src/economy/player-shops.js` buyFromShop()
```js
// Deduct from buyer bank, add to seller bank
db.prepare('UPDATE bank_accounts SET deposited_balance = deposited_balance - ? WHERE ...').run(totalPrice, buyerId);
db.prepare('UPDATE bank_accounts SET deposited_balance = deposited_balance + ? WHERE ...').run(totalPrice, shop.owner_id);
```
- **Classification:** ✅ **CLOSED LOOP** — Bank-to-bank transfer between players

#### 2K. Player Shop Sell to Buy Order — `src/economy/player-shops.js` sellToShop()
- **Classification:** ✅ **CLOSED LOOP** — Escrow already deducted from buyer, paid to seller

#### 2L. Real Estate Cash Purchase — `src/economy/realestate.js` buyPropertyCash()
```js
db.prepare('UPDATE bank_accounts SET deposited_balance = deposited_balance - ? WHERE ...').run(property.current_price, characterId);
```
- **Classification:** ⚠️ **MONEY BURNER** — Player pays, but USDC goes to 'system' (not a real account). Property price is burned.
- **Logged as:** `type: 'purchase', to_wallet: 'system'`

#### 2M. Property Sale Between Players — `src/economy/realestate.js` buyPropertyFromPlayer()
- **Classification:** ✅ **CLOSED LOOP** — Buyer's bank balance decreases, seller's bank balance increases

#### 2N. Rent Payment — `src/economy/realestate.js` payRent()
- **Classification:** ✅ **CLOSED LOOP** — Tenant's bank decreases, landlord's bank increases

#### 2O. Bank Emissions — `src/economy/bank-emissions.js:68-72`
```js
const updateBank = db.prepare('UPDATE economy_wallets SET usdc_balance = usdc_balance - ? WHERE type = "bank"');
const updateNPC = db.prepare('UPDATE economy_wallets SET usdc_balance = usdc_balance + ? WHERE wallet_id = ?');
```
- **Classification:** ✅ **CLOSED LOOP** — Bank balance decreases, NPC balances increase
- **NOTE:** Uses `economy_wallets` table (separate from `system_wallets`!)

#### 2P. Kamino Vault Emission — `src/economy/kamino-vault.js` simulateEmission()
```js
db.prepare('UPDATE system_wallets SET balance_cache = balance_cache + ? ... WHERE id = ?').run(perNpc, npcId);
```
- **Classification:** ⚠️ **EXTERNAL INPUT** — This is the LEGITIMATE source of new USDC from DeFi yields. Updates `system_wallets.balance_cache` for NPCs. But the source (treasury vault yield) is real-world.

#### 2Q. DeFi Yield Simulator — `src/defi/yield-simulator.js:84`
- **Classification:** ⚠️ **EXTERNAL INPUT** — Adds yield to NPC `economy_wallets`. Same legitimate external source.

#### 2R. DeFi Kamino Yield — `src/defi/kamino-yield.js:92`
- **Classification:** ⚠️ **EXTERNAL INPUT** — Same as above, different code path.

---

## 2. NPC Wallet Audit

### Economy System NPCs (init-economy.js — `system_wallets` table)
| NPC ID | Name | Has Wallet? | Gets Stipend? | Balance Deducted on Pay? |
|--------|------|-------------|---------------|--------------------------|
| `npc_barnacle_bob` | Barnacle Bob | ✅ system_wallet | ⚠️ Via kamino-vault only | ⚠️ On material sales, NOT on jobs |
| `npc_coral_smith` | Coral the Smith | ✅ system_wallet | ⚠️ Via kamino-vault only | ⚠️ On material sales, NOT on jobs |
| `npc_old_shellworth` | Old Shellworth | ✅ system_wallet | ⚠️ Via kamino-vault only | ✅ On material sales |
| `npc_mystic_mantis` | Mystic Mantis | ✅ system_wallet | ⚠️ Via kamino-vault only | ⚠️ On material sales, NOT on jobs |
| `npc_loan_shark` | The Loan Shark | ✅ system_wallet | ⚠️ Via kamino-vault only | ⚠️ On jobs only |
| `bank` | Reef Bank | ✅ system_wallet | N/A (IS the bank) | ✅ On loans/withdrawals |
| `treasury` | Treasury | ✅ system_wallet | N/A (IS treasury) | N/A |

### Bank Emissions NPCs (bank-emissions.js — `economy_wallets` table)
| NPC ID | Gets Stipend? | Notes |
|--------|---------------|-------|
| `madame_pearl` | ✅ Daily emission | Uses `economy_wallets`, not `system_wallets` |
| `ironshell_gus` | ✅ Daily emission | Different table! |
| `coral_trader` | ✅ Daily emission | |
| `weapon_smith` | ✅ Daily emission | |
| `old_shellworth` | ✅ Daily emission | |

### Shop NPCs (world.js NPCS — NO wallet!)
| NPC ID | Name | Has Wallet? | Gets Stipend? | Balance Deducted? |
|--------|------|-------------|---------------|-------------------|
| `madame_pearl` | Madame Pearl | ❌ NO wallet | ❌ NO | ❌ MONEY PRINTER |
| `ironshell_gus` | Ironshell Gus | ❌ NO wallet | ❌ NO | ❌ MONEY PRINTER |
| `wreckers_rest_salvage` | Wrecker's Salvage | ❌ NO wallet | ❌ NO | ❌ MONEY PRINTER |

### Quest Giver NPCs (quests.js — NO wallet!)
| NPC ID | Name | Has Wallet? | Gets Stipend? | Balance Deducted? |
|--------|------|-------------|---------------|-------------------|
| `barnacle_bill` | Barnacle Bill | ❌ NO wallet | ❌ NO | ❌ MONEY PRINTER |
| `captain_marlow` | Captain Marlow | ❌ NO wallet | ❌ NO | ❌ MONEY PRINTER |

---

## 3. 🔴 CRITICAL: Two Parallel NPC Systems

**This is a fundamental architecture problem.** There are THREE different NPC registries:

1. **`system_wallets` table** (init-economy.js) — `npc_barnacle_bob`, `npc_coral_smith`, etc.
   - These have on-chain wallets and `balance_cache`
   - Used by economy-routes.js for material trading and jobs

2. **`economy_wallets` table** (bank-emissions.js) — `madame_pearl`, `ironshell_gus`, etc.
   - These get daily bank emissions
   - Used by bank-emissions.js for NPC purchasing simulation

3. **`NPCS` object** (world.js) — `madame_pearl`, `ironshell_gus`, etc.
   - These have shop inventories (`npc.shop`)
   - Used by shop-routes.js for item buying/selling
   - **NO WALLET BALANCE AT ALL**

**Problem:** The shop NPCs that players buy/sell items from (world.js) have no connection to either wallet system. When you sell a sword to Madame Pearl in shop-routes.js, the USDC appears from nowhere. When you buy a potion, the USDC vanishes.

---

## 4. Money Flow Diagram (Current — Broken)

```
[Treasury/DeFi Yields]
        │
        ▼
[Bank (economy_wallets)]  ──→  [economy_wallets NPCs] ──→ (NPC purchase simulation)
                                                               │
                                                               ▼
                                                     [Player usdc_balance]
                                                     
[Bank (system_wallets)]  ──→  [system_wallets NPCs] ──→ (material sales & jobs)
                                                               │
                                                               ▼
                                                     [Player usdc_balance]

❌ [Quest System v1]     ──→  USDC created from nothing ──→  [Player usdc_balance]
❌ [Quest Engine v2]     ──→  USDC created from nothing ──→  [Player usdc_balance]  (2.5-200 USDC!!)
❌ [NPC Item Shop]       ──→  USDC created from nothing ──→  [Player usdc_balance]
❌ [Rest/Resurrection]   ──→  USDC burned to nothing    ──←  [Player usdc_balance]
❌ [Henchman Gacha]      ──→  USDC burned to nothing    ──←  [Player usdc_balance]
❌ [Property Purchase]   ──→  USDC burned to nothing    ──←  [Player usdc_balance]
```

---

## 5. Specific Code Fixes Needed

### FIX 1: Quest Engine v2 — CRITICAL (Biggest money printer)
**File:** `src/quest-engine.js`
**Problem:** Quest rewards not micro-priced AND come from nowhere
**Fix:**
1. Divide ALL `usdc_base` and `usdc_per_level` by 1000 to micro-price
2. Quest giver NPCs must have wallets (add to `system_wallets`)
3. Deduct reward from NPC wallet before adding to player
4. If NPC can't afford reward, quest turn-in fails gracefully

```js
// BEFORE (line 1395):
this.db.prepare('UPDATE clawds SET xp = ?, level = ?, usdc_balance = usdc_balance + ? WHERE id = ?')
  .run(newXP, newLevel, usdcGained, characterId);

// AFTER:
const npcWallet = this.db.prepare('SELECT balance_cache FROM system_wallets WHERE id = ?')
  .get(quest.giver_npc);
if (!npcWallet || npcWallet.balance_cache < usdcGained) {
  return { success: false, error: 'Quest giver cannot afford reward right now. Try again later.' };
}
this.db.prepare('UPDATE system_wallets SET balance_cache = balance_cache - ? WHERE id = ?')
  .run(usdcGained, quest.giver_npc);
this.db.prepare('UPDATE clawds SET xp = ?, level = ?, usdc_balance = usdc_balance + ? WHERE id = ?')
  .run(newXP, newLevel, usdcGained, characterId);
```

### FIX 2: Quest System v1 — Same Pattern
**File:** `src/quests.js:697`
**Same fix as above.** Deduct from NPC before awarding to player.

### FIX 3: NPC Item Shop — Connect to wallet system
**File:** `src/shop-routes.js`
**Problem:** Shop NPCs have no wallet
**Fix:**
1. Map shop NPC IDs to `system_wallets` IDs (or add them)
2. On sell-to-NPC: deduct from NPC balance_cache, add to player
3. On buy-from-NPC: deduct from player, add to NPC balance_cache

```js
// In POST /:npcId/sell (player sells TO npc):
// ADD: Deduct from NPC wallet
const npcWalletId = NPC_WALLET_MAP[npc.id]; // e.g., 'madame_pearl' → 'npc_madame_pearl'
db.prepare('UPDATE system_wallets SET balance_cache = balance_cache - ? WHERE id = ?')
  .run(totalValue, npcWalletId);

// In POST /:npcId/buy (player buys FROM npc):
// ADD: Credit NPC wallet
db.prepare('UPDATE system_wallets SET balance_cache = balance_cache + ? WHERE id = ?')
  .run(totalCost, npcWalletId);
```

### FIX 4: Job Completion — Deduct from NPC
**File:** `src/economy/economy-routes.js` POST /jobs/complete
**Problem:** On-chain transfer attempted but `balance_cache` not decremented
**Fix:** Add after job completion:
```js
db.prepare('UPDATE system_wallets SET balance_cache = balance_cache - ? WHERE id = ?')
  .run(assignment.pay, assignment.npc_id);
```

### FIX 5: Bank Loan — Deduct from Bank
**File:** `src/economy/economy-routes.js` POST /bank/loan
**Problem:** Bank balance_cache not decremented when loan issued
**Fix:** Add:
```js
db.prepare('UPDATE system_wallets SET balance_cache = balance_cache - ? WHERE id = ?')
  .run(amount, 'bank');
```

### FIX 6: Rest/Resurrection — Route payments to NPCs
**File:** `src/world-routes.js` POST /rest
**Fix:** Rest cost should go to tavern NPC or temple NPC:
```js
// After deducting from player:
const npcId = restOption.npcId; // 'npc_barnacle_bob' for tavern, 'npc_mystic_mantis' for temple
db.prepare('UPDATE system_wallets SET balance_cache = balance_cache + ? WHERE id = ?')
  .run(restOption.cost, npcId);
```

**File:** `src/encounters.js` resurrect()
**Fix:** Resurrection cost should go to Tide Temple NPC:
```js
// Paid resurrection: send 25 USDC to temple (also needs micro-pricing: 0.025)
db.prepare('UPDATE system_wallets SET balance_cache = balance_cache + ? WHERE id = ?')
  .run(usdcCost, 'npc_mystic_mantis');
```

### FIX 7: Henchman Gacha — Route payments to bank/treasury
**File:** `src/henchman-routes.js:133`
**Fix:** Gacha pull cost should go to bank or treasury:
```js
db.prepare('UPDATE system_wallets SET balance_cache = balance_cache + ? WHERE id = ?')
  .run(cost, 'treasury');
```

### FIX 8: Property Purchase — Route payments to bank
**File:** `src/economy/realestate.js` buyPropertyCash()
**Fix:** Property price should go to bank (NPC properties) or seller (player properties):
```js
// For initial property purchases from the system:
db.prepare('UPDATE system_wallets SET balance_cache = balance_cache + ? WHERE id = ?')
  .run(property.current_price, 'bank');
```

### FIX 9: Unify NPC Registries
**The fundamental fix.** Consolidate the three NPC systems:
1. All NPCs should be in `system_wallets` with proper IDs
2. Bank emissions should target `system_wallets.balance_cache` (not a separate `economy_wallets` table)
3. Shop NPCs (world.js) should reference their `system_wallets` ID
4. Map: `madame_pearl` → `npc_madame_pearl`, `ironshell_gus` → `npc_ironshell_gus`, etc.

### FIX 10: Quest Engine v2 — Micro-price rewards
**File:** `src/quest-engine.js`
All USDC rewards need ÷1000:
| Quest | Current usdc_base | Should Be |
|-------|-------------------|-----------|
| bounty_hunt | 2.5 | 0.0025 |
| pest_control | 4.0 | 0.004 |
| shark_bounty | 6.0 | 0.006 |
| undead_purge | 8.0 | 0.008 |
| cartographer_kelp | 5.0 | 0.005 |
| deep_explorer | 100 | 0.100 |
| graveyard_surveyor | 90 | 0.090 |
| supply_run | 45 | 0.045 |
| parts_collector | 75 | 0.075 |
| relic_recovery | 120 | 0.120 |

---

## 6. Recommended Architecture: Closed-Loop Economy

```
[Real-World DeFi Yields (Kamino/MarginFi)]
              │
              ▼
   [Treasury Vault (on-chain)]
              │
              ▼ (daily yield calculation)
   [Bank (system_wallets 'bank')]
              │
              ▼ (daily stipend distribution)
  ┌───────────┼───────────────────────────┐
  │           │           │               │
  ▼           ▼           ▼               ▼
[NPC Shops] [NPC Jobs] [Quest NPCs] [Temple/Tavern]
  │           │           │               │
  ▼           ▼           ▼               ▼
  └───────────┼───────────────────────────┘
              │ (players earn USDC from NPCs)
              ▼
     [Player Wallets]
              │
    ┌─────────┼─────────────┐
    │         │             │
    ▼         ▼             ▼
 [Buy Items] [Rest/Heal]  [Property]
 [Loan Repay] [Gacha]     [Auction Fees]
    │         │             │
    └─────────┼─────────────┘
              │ (players spend USDC back to NPCs/bank)
              ▼
     [NPC/Bank Wallets]
              │
              ▼ (cycle continues)
```

**Key Rules:**
1. **ONLY source of new USDC:** DeFi yields from treasury
2. **Every NPC payment to player:** Must deduct from NPC's `balance_cache`
3. **Every player payment:** Must credit recipient's wallet (NPC or bank)
4. **If NPC is broke:** Cannot pay player — "Sorry, I'm out of funds. Come back tomorrow."
5. **Daily bank emission:** Refills NPC wallets from bank, bank refilled from DeFi yield
6. **Zero-sum P2P:** Trading, auctions, player shops all transfer between players

---

## 7. Priority Fix Order

| Priority | Fix | Impact | Effort |
|----------|-----|--------|--------|
| 🔴 P0 | Quest Engine v2 micro-pricing (÷1000) | Stops 200 USDC/quest printing | 15 min |
| 🔴 P0 | Quest rewards deduct from NPC wallet | Closes biggest money printer | 30 min |
| 🔴 P1 | NPC Item Shop connect to wallet | Closes second biggest printer | 1 hour |
| 🟡 P2 | Unify NPC registries | Architecture foundation | 2 hours |
| 🟡 P2 | Job completion deduct NPC balance | Close partial loop | 15 min |
| 🟡 P2 | Bank loan deduct bank balance | Close partial loop | 10 min |
| 🟢 P3 | Rest/resurrection route to NPC | Close money burn → NPC | 20 min |
| 🟢 P3 | Henchman gacha route to treasury | Close money burn → treasury | 10 min |
| 🟢 P3 | Property purchase route to bank | Close money burn → bank | 10 min |
| 🟢 P3 | Add quest giver NPCs to system_wallets | Enable NPC wallet checks | 20 min |
| 🟢 P3 | Resurrection cost micro-pricing (25→0.025) | Fix pricing | 5 min |

---

## 8. What's Already Working Well ✅

- **Material economy** (economy-routes.js) — NPC buys materials from player, NPC balance deducted
- **Bank deposits/withdrawals** — Properly moves between player wallet and bank
- **P2P trading** (trading.js) — Zero-sum transfers
- **Auction house** (auction.js) — Buyer pays seller, zero-sum
- **Player shops** (player-shops.js) — Bank-to-bank transfers between players
- **Real estate P2P sales** — Buyer pays seller properly
- **Rent payments** — Tenant pays landlord properly
- **Bank emissions** (bank-emissions.js) — Deducts from bank, credits NPCs
- **Material drops** — Monsters drop materials NOT USDC (correct design!)
- **Loan shark enforcement** — Collects debt from materials/items (no USDC creation)

**The core economy architecture is SOUND.** The problems are in the **satellite systems** (quests, NPC shops, rest/resurrection) that were built separately and don't connect to the economy wallet system.
