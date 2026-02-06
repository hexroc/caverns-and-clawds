# 🔍 Money Flow Audit - Caverns & Clawds
**Date:** 2026-02-06 12:40 PM PST  
**Auditor:** Hex  
**Status:** 🚨 CRITICAL ISSUE FOUND

## Executive Summary

**🚨 NPCs ARE MONEY PRINTERS** - NPCs pay players unlimited USDC without checking if they have funds. This breaks the closed-loop economy design.

## Current State

### Player Balances
- **Crusher:** 1.13 USDC
- **Bubbles:** 0.01 USDC  
- **Scalesworth:** 1.26 USDC

### Recent Transactions (Last 11)
All are material sales to `npc_old_shellworth`:
```
1.  0.15 USDC - Giant Claw
2.  0.12 USDC - Lurker Heart
3.  0.26 USDC - 7x Pristine Chitin
4.  0.03 USDC - Shark Fin
5.  0.05 USDC - 2x Lurker Fang
6.  0.12 USDC - 10x Lurker Hide
7.  0.07 USDC - 8x Sea Glass
8.  0.26 USDC - 34x Crab Shell
9.  0.02 USDC - 5x Shark Tooth
10. 0.02 USDC - 7x Kelp Bundle
11. 0.03 USDC - 21x Fish Scales
```

## Money Flow Analysis

### SOURCES (How USDC Enters Economy)

1. **✅ Starting Balance**  
   - 100 USDC per character on creation
   - This IS a money printer, but documented/intentional
   
2. **❌ Material Sales (BROKEN!)**
   - Code path: `/api/economy/sell` in `economy-routes.js`
   - **PROBLEM:** NPCs pay players without checking funds
   ```javascript
   // ALWAYS update database balance (works regardless of on-chain status)
   db.prepare('UPDATE clawds SET usdc_balance = usdc_balance + ? WHERE id = ?')
     .run(totalPrice, char.id);
   // Update NPC balance cache
   db.prepare('UPDATE system_wallets SET balance_cache = balance_cache - ? WHERE id = ?')
     .run(totalPrice, npcId);
   ```
   - NO CHECK: `if (npc.balance_cache < totalPrice)` ❌
   - NPC balance can go NEGATIVE → **infinite money printer**

3. **❌ Quest Rewards (NEEDS VERIFICATION)**
   - Likely same issue - pays from Quest Board wallet without checking funds

4. **❌ Jobs (NEEDS VERIFICATION)**
   - NPCs pay for completed jobs without checking wallet balances

5. **✅ Player-to-Player Trades**
   - No money created, just transferred

### SINKS (How USDC Leaves Economy)

1. **Material Purchases from NPCs**
   - Player → NPC wallet
   - ✅ Works correctly (player balance checked)

2. **Inn Rest**
   - Briny Flagon: 0.005 USDC
   - Tide Temple: 0.002 USDC
   - Player → NPC
   - ✅ Verified in commit history

3. **Resurrection (Paid Method)**
   - 0.025 USDC
   - Player → NPC (Tide Temple)
   - ✅ Verified

4. **Treasury Tax (1%)**
   - Applied on material sales
   - ✅ Collected but treasury balance unknown

5. **Auction Fees**
   - 1% on auction sales
   - ✅ Code exists, needs verification

## 🚨 Critical Issues

### Issue #1: NPC Money Printing
**Severity:** CRITICAL  
**Impact:** Breaks closed-loop economy, infinite USDC creation

**Current Behavior:**
- Player sells 100x materials to NPC for 10 USDC
- Player gains 10 USDC ✅
- NPC balance_cache -= 10 (can go negative!) ❌
- **No check if NPC has 10 USDC before paying**

**Expected Behavior (Closed Loop):**
- NPC should have a FUNDED wallet
- Before paying player, check: `if (npc.balance_cache < totalPrice) return error`
- If NPC runs out of money, they stop buying materials
- Treasury must periodically refill NPC wallets from yield/revenue

**Fix Required:**
```javascript
// Check NPC has sufficient funds
if (npc.balance_cache < totalPrice) {
  return res.status(400).json({
    success: false,
    error: 'NPC has insufficient funds',
    npcBalance: npc.balance_cache,
    priceAsked: totalPrice,
    hint: 'Try selling to a different NPC or wait for treasury refill'
  });
}
```

### Issue #2: No NPC Funding System
**Severity:** HIGH  
**Impact:** Even with fix #1, NPCs will quickly run out of money

**Missing Systems:**
1. Initial NPC wallet funding (how much USDC to start?)
2. Periodic refill from treasury → NPC wallets
3. Yield emission → Treasury → NPCs loop
4. Emergency backstop if treasury empty

**Recommended:**
- Start each NPC with 50-100 USDC  
- Weekly/daily sweep: Treasury → refill all NPCs to 100 USDC
- Track NPC "sold inventory value" → only refill when they've sold materials

### Issue #3: Quest Rewards Unverified
**Severity:** MEDIUM  
**Impact:** Likely same money printing issue

**Action:** Audit quest reward payment code

### Issue #4: Jobs Payment Unverified  
**Severity:** MEDIUM  
**Impact:** Likely same money printing issue

**Action:** Audit jobs completion payment code

## Money Flow Diagram

```
┌─────────────────┐
│   NEW PLAYERS   │
│  (100 USDC ea)  │ ← 🚨 MONEY PRINTER (intentional)
└────────┬────────┘
         │
         v
┌─────────────────┐       ┌──────────────┐
│     PLAYERS     │◄──────│     NPCs     │ 🚨 MONEY PRINTER! (bug)
│   1.13 USDC     │  pay  │   ???  USDC  │    NO BALANCE CHECK
└────────┬────────┘       └──────┬───────┘
         │                       ▲
         │ buy/rest/rez         │
         v                       │ 1% tax
┌─────────────────┐       ┌──────────────┐
│      NPCs       │──────►│   TREASURY   │
│  (sell items)   │       │   ??? USDC   │
└─────────────────┘       └──────┬───────┘
                                 │
                                 │ sweep (weekly)
                                 v
                          ┌──────────────┐
                          │ KAMINO VAULT │
                          │  ~10% APY    │
                          └──────────────┘
```

## Recommended Fixes (Priority Order)

### P0 - CRITICAL (Deploy ASAP)
1. **Add NPC balance checks to material sales**
   - File: `src/economy/economy-routes.js`
   - Function: `/sell` endpoint
   - Add: `if (npc.balance_cache < totalPrice)` check

2. **Add NPC balance checks to quest rewards**
   - Audit and patch quest system

3. **Add NPC balance checks to job payments**
   - Audit and patch jobs system

### P1 - HIGH (Next Deploy)
1. **Initial NPC funding**
   - Update `init-economy.js`
   - Give each NPC 100 USDC starting balance

2. **Treasury → NPC refill system**
   - Weekly cron: Check all NPCs, refill if < 50 USDC
   - Max refill: 100 USDC per NPC
   - Source: Treasury wallet

### P2 - MEDIUM (Future)
1. **NPC balance monitoring**
   - Dashboard showing all NPC balances
   - Alerts when NPC < 20 USDC

2. **Emergency backstop**
   - If treasury empty AND NPCs empty, trigger admin alert
   - Prevent game from becoming unplayable

## Testing Checklist

After fixes deployed:
- [ ] Try to sell materials when NPC has 0 balance → should fail gracefully
- [ ] Verify NPC balance decreases when buying from players
- [ ] Verify NPC balance doesn't go negative
- [ ] Verify treasury refill cron works
- [ ] Check quest rewards don't print money
- [ ] Check job payments don't print money

## Notes

- **Why this wasn't caught:** The code says "ALWAYS update database balance" which implies it works regardless of on-chain success, but it should still check NPC balance
- **Impact so far:** Unknown - need to check total USDC in circulation vs. treasury funding
- **Player experience:** Players haven't noticed because they're getting paid (more money = happy players), but economy is fundamentally broken

---

**Next Steps:** B-Rock decides priority - fix immediately or document for next sprint?
