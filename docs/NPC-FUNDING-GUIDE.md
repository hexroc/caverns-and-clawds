# NPC Wallet Funding Guide

## The Problem
Quest rewards, material sales, and other NPC-to-player payments require **funded NPC wallets**. NPCs can't create USDC from thin air (closed-loop economy), so they need USDC allocated to them from the treasury.

## Current Issue (Production)
- **Quest Board NPC**: 0 USDC → Can't pay quest rewards ❌
- **Bank**: Low/empty → Can't issue loans
- **Material NPCs**: May run low → Can't buy materials from players

## Solution: Fund NPCs from Treasury

### Option 1: Manual SQL (Quick Fix)
For testing/development:
```bash
cd caverns-and-clawds
sqlite3 db/caverns.db < scripts/seed-test-funds.sql
```

**⚠️ Development only!** This creates fake USDC for testing.

### Option 2: Interactive Script (Production Safe)
Distributes real treasury funds to NPCs:
```bash
cd caverns-and-clawds
node scripts/fund-npcs.js
```

This will:
1. Check treasury balance
2. Show distribution plan (40% quests, 20% bank, etc.)
3. Ask for confirmation
4. Transfer funds from treasury to NPCs

### Recommended Distribution
From $254 treasury balance:
- **Quest Board**: 40% ($101.60) — High volume of quest completions
- **Bank**: 20% ($50.80) — Loans and banking services
- **Material NPCs**: 30% total ($76.20) — Old Shellworth, Coral Smith, Barnacle Bob
- **Services**: 10% total ($25.40) — Mystic Mantis, Loan Shark

## Automation (Future)
Set up weekly cron to:
1. Collect DeFi yield from Kamino vault
2. Distribute to NPCs based on their balance
3. Alert if any NPC below threshold

## How to Check NPC Balances
```sql
SELECT id, name, balance_cache 
FROM system_wallets 
WHERE id LIKE 'npc_%' OR id IN ('bank', 'treasury')
ORDER BY balance_cache DESC;
```

## Emergency: NPC Out of Funds
If quest rewards fail or "0 USDC received":
1. Check NPC balance (SQL above)
2. Run funding script immediately
3. Players keep completed quest status, just need to re-claim

## Production Checklist
- [ ] Verify treasury has $254+ USDC (mainnet wallet)
- [ ] Run `node scripts/fund-npcs.js`
- [ ] Test quest completion (should receive rewards)
- [ ] Monitor NPC balances weekly
- [ ] Set up automated refunding from DeFi yield

## Notes
- NPCs automatically cap rewards at their available balance
- System logs warnings when NPCs run low: `⚠️ Quest NPC low on funds`
- Treasury receives: DeFi yield (weekly) + 1% transaction tax
- This is intentional closed-loop design — prevents inflation
