# Economy Implementation Tasks

**Status:** Phases 1-4 COMPLETE ✅ | Phase 5-6 In Progress

## Phase 1: Wallet Infrastructure ✅ COMPLETE
- [x] Install Solana web3.js dependencies
- [x] Create wallet generation utility
- [x] Create house wallet (treasury)
- [x] Create bank wallet
- [x] Create NPC wallets (5 merchants)
- [x] Add wallet field to clawds table
- [x] Generate wallet on character creation
- [x] Store encrypted private keys
- [ ] Fund wallets with devnet USDC (faucet rate limited)
- [x] Basic USDC transfer function
- [x] Test transfers between wallets (simulated mode works)

## Phase 2: Material System ✅ COMPLETE
- [x] Create materials table in DB
- [x] Define material types and properties (18 materials)
- [x] Remove pearl drops from monsters
- [x] Add material drop tables to monsters
- [x] Material inventory for players
- [x] Material inventory for NPCs
- [x] Loot display shows materials not pearls

## Phase 3: NPC Trading ✅ COMPLETE
- [x] NPC buy prices (base + demand modifier)
- [x] Sell material to NPC endpoint
- [x] USDC transfer on sale (simulated)
- [x] NPC inventory tracking
- [x] Dynamic pricing algorithm
- [x] Buy item from NPC endpoint
- [x] USDC transfer on purchase

## Phase 4: Jobs System ✅ COMPLETE
- [x] Jobs table in DB
- [x] Available jobs per NPC (5 jobs)
- [x] Take job endpoint
- [x] Complete job endpoint
- [x] Job rewards (USDC transfer)
- [x] Cooldowns between jobs

## Phase 5: Banking System ✅ COMPLETE
- [x] Bank account table
- [x] Deposit endpoint (USDC → bank)
- [x] Withdraw endpoint (bank → USDC)
- [x] Interest calculation (daily tick)
- [x] Loan request endpoint
- [x] Loan repayment endpoint
- [x] Overdue loan tracking

## Phase 6: Loan Shark Enforcement 🦈 ✅ COMPLETE
- [x] Loan shark monster definition (scales with debt)
- [x] Debt tracking per player (with interest)
- [x] Overdue detection (enforcement check)
- [x] Spawn loan shark in player's zone
- [x] "No Escape" ability - cannot flee
- [x] Debt collection on defeat (takes materials)
- [x] Reward for victory (50% debt forgiven + XP)

## Phase 7: Peer-to-Peer Trading 🤝 TODO
- [ ] Trade request endpoint
- [ ] Trade accept/reject
- [ ] USDC transfer between players
- [ ] Trade history

## Phase 8: Economic Dashboard 📊 TODO
- [ ] Total USDC in system
- [ ] Per-wallet balances
- [ ] Transaction history
- [ ] Material supply/demand
- [ ] Interest rates display

## Phase 9: QA & Balance 🧪 TODO
- [ ] Spawn test agents
- [ ] Stress test economy
- [ ] Adjust prices/rates
- [ ] Fix bugs
- [ ] Document for hackathon

---

## API Endpoints (Live)

### Economy
- `GET /api/economy/wallet` - Get player wallet info
- `GET /api/economy/materials` - List all materials
- `GET /api/economy/inventory` - Get player material inventory
- `GET /api/economy/prices` - Get current NPC buy prices
- `POST /api/economy/sell` - Sell materials to NPC

### Banking
- `GET /api/economy/bank/account` - Get bank account
- `POST /api/economy/bank/deposit` - Deposit USDC
- `POST /api/economy/bank/withdraw` - Withdraw USDC
- `POST /api/economy/bank/loan` - Request loan
- `POST /api/economy/bank/repay` - Repay loan

### Jobs
- `GET /api/economy/jobs` - List available jobs
- `POST /api/economy/jobs/take` - Take a job
- `POST /api/economy/jobs/complete` - Complete job

### Transactions
- `GET /api/economy/transactions` - Transaction history

---

## Testing Notes

**Material drops working:**
- Killed Reef Shark → Got Shark Tooth
- Dynamic pricing: base 3 USDC → 4.5 USDC (1.5x due to low NPC stock)
- Sale completed successfully (simulated transaction)

**Devnet funding needed:**
- Faucet rate limited (429 errors)
- Use https://faucet.solana.com/ manually
- Or use Circle's faucet for devnet USDC
