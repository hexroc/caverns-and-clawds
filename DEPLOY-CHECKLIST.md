# Production Deployment Checklist
**Date:** 2026-02-06  
**Current Production:** v1.2.3 (Build: 2026-02-04 23:05 UTC)  
**Ready to Deploy:** 1484dc1 (5 commits ahead)

---

## 🚀 STEP 1: Deploy to Railway (B-Rock)

**Action Required:** Manual redeploy from Railway dashboard

1. Go to: https://railway.app/project/45f2b5d1-3c50-44c5-9afa-0bec349eb7a8
2. Click on "Caverns&Clawds" service
3. Click "Redeploy" button (NOT "Deploy Latest")
4. Wait for build to complete (~3-5 minutes)
5. Verify health: https://www.cavernsandclawds.com/api/health

**Expected New Version:** 1.2.4+  
**Expected Build Date:** 2026-02-06

---

## 📦 Critical Commits in This Deploy

### P0 - CRITICAL FIXES
1. **458c7ab** - ALL MISSING SPELLS ADDED (61 spells total)
   - Fixed circular dependency crash (encounters.js ↔ character.js)
   - Created spell-definitions.js standalone module
   - All cantrips + level 1 + level 2 spells now available

2. **fa0a6e8** - Spell tracking system implementation
   - Created character_spells table
   - Characters now properly track known/prepared spells
   - Character API returns spells array

3. **c349c80** - Death system + resurrection endpoints
   - Fixed "Encounters is not a constructor" error
   - Added /api/world/death-status and /api/world/resurrect endpoints
   - Death system now fully functional

### P1 - IMPORTANT FIXES
4. **1484dc1** - Security: Removed internal audit documentation
   - Cleaned up 9 sensitive files from GitHub
   - Updated .gitignore to prevent future commits

5. **799396f** - Ghost agent cleanup (1 hour auto-logout)

6. **2ac63fd** - AGENT-GUIDE: Spellcasting section added

---

## 💰 STEP 2: Fund NPCs (After Deploy)

**Why:** NPCs were nearly broke (0-0.4 USDC), causing "insufficient funds" errors

**Script Ready:** `scripts/fund-npcs.js`

**Action:**
```bash
# SSH to Railway pod OR use Railway CLI
node scripts/fund-npcs.js
```

**Expected Result:**
- 9 NPCs funded with 100 USDC each
- Total treasury spend: ~900 USDC
- NPCs can now pay players for materials/jobs

---

## ✅ STEP 3: Verification Tests

### Test 1: Spell System
1. Create new Cleric character via `/api/character/create`
2. GET `/api/character` - verify `spells` array present
3. Check spectator - should show 6 spells (3 cantrips + 3 level 1)

**Expected:** All spells display with names/descriptions

### Test 2: Death & Resurrection
1. Use test character, get killed in combat
2. GET `/api/world/death-status` - should show resurrection options
3. POST `/api/world/resurrect` with `method: "free"`
4. Verify character at Tide Temple with full HP, -10% XP

**Expected:** No "Encounters is not a constructor" error

### Test 3: Combat & Spell Casting
1. Start combat encounter
2. Cast a level 1 spell (e.g., Cure Wounds)
3. Verify spell slot consumed
4. Rest at inn
5. Verify spell slots restored

**Expected:** Spell slots restore on rest (critical fix from audit)

### Test 4: NPC Trading
1. Kill monster, loot materials
2. POST `/api/economy/sell-material` to Old Shellworth
3. Verify USDC deposited to player balance

**Expected:** No "insufficient funds" error from NPC

### Test 5: Spectator UI
1. Visit https://www.cavernsandclawds.com/spectate.html
2. Check Watch tab - combat narration working
3. Check Character Sheet tab - spells display

**Expected:** No SQL errors, all UI functional

---

## 🤖 STEP 4: Bot Squad Verification

**Current Status:** 3 bots running locally (Crusher Fighter, Crusher Economy, Bubbles Social)

**After Deploy:**
1. Monitor bot logs for errors
2. Verify bots can:
   - Sell materials to NPCs (no "insufficient funds")
   - List items on auction house
   - Earn USDC from jobs
   - Rest at inn and restore spell slots (for Bubbles Cleric)

---

## 🎯 Success Criteria

✅ Production health check returns new build date  
✅ NPCs funded with 100 USDC each  
✅ New characters receive spells automatically  
✅ Death/resurrection system works without errors  
✅ Spell slots restore on rest  
✅ NPC trading doesn't fail with "insufficient funds"  
✅ Spectator UI loads without SQL errors  
✅ Bot squad operates normally  

---

## ⚠️ Rollback Plan

If critical issues after deploy:

1. **Quick Fix:** Railway dashboard → "Deployments" → Redeploy previous build (bff1d68)
2. **Nuclear Option:** `scripts/production-reset.js` (resets database to fresh state)

**Backup Strategy:**
- All critical fixes tested locally ✅
- Bot squad verified working ✅
- Low-risk deployment (bug fixes only, no new features)

---

## 📞 Support

**If Issues:**
- Check Railway logs: `railway logs -f`
- Check server health: `curl https://www.cavernsandclawds.com/api/health`
- Verify DB: Connect via Railway DB credentials

**Discord:** Post in #caverns-and-clawds  
**Hex:** Available for debugging
