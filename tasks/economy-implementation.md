# Economy Implementation Tasks

## Phase 1: Wallet Infrastructure ⏳
- [ ] Install Solana web3.js dependencies
- [ ] Create wallet generation utility
- [ ] Create house wallet (treasury)
- [ ] Create bank wallet
- [ ] Create NPC wallets (5 merchants)
- [ ] Add wallet field to clawds table
- [ ] Generate wallet on character creation
- [ ] Store encrypted private keys
- [ ] Fund wallets with devnet USDC
- [ ] Basic USDC transfer function
- [ ] Test transfers between wallets

## Phase 2: Material System 🎯
- [ ] Create materials table in DB
- [ ] Define material types and properties
- [ ] Remove pearl drops from monsters
- [ ] Add material drop tables to monsters
- [ ] Material inventory for players
- [ ] Material inventory for NPCs
- [ ] Loot display shows materials not pearls

## Phase 3: NPC Trading 💰
- [ ] NPC buy prices (base + demand modifier)
- [ ] Sell material to NPC endpoint
- [ ] USDC transfer on sale
- [ ] NPC inventory tracking
- [ ] Dynamic pricing algorithm
- [ ] Buy item from NPC endpoint
- [ ] USDC transfer on purchase

## Phase 4: Jobs System 🔨
- [ ] Jobs table in DB
- [ ] Available jobs per NPC
- [ ] Take job endpoint
- [ ] Complete job endpoint
- [ ] Job rewards (USDC transfer)
- [ ] Cooldowns between jobs

## Phase 5: Banking System 🏦
- [ ] Bank account table
- [ ] Deposit endpoint (USDC → bank)
- [ ] Withdraw endpoint (bank → USDC)
- [ ] Interest calculation (daily tick)
- [ ] Loan request endpoint
- [ ] Loan repayment endpoint
- [ ] Overdue loan tracking

## Phase 6: Loan Shark Enforcement 🦈
- [ ] Loan shark NPC definition
- [ ] Debt tracking per player
- [ ] Overdue detection (cron job)
- [ ] Spawn loan shark in player's zone
- [ ] Loan shark combat behavior
- [ ] Debt collection on defeat

## Phase 7: Peer-to-Peer Trading 🤝
- [ ] Trade request endpoint
- [ ] Trade accept/reject
- [ ] USDC transfer between players
- [ ] Trade history

## Phase 8: Economic Dashboard 📊
- [ ] Total USDC in system
- [ ] Per-wallet balances
- [ ] Transaction history
- [ ] Material supply/demand
- [ ] Interest rates display

## Phase 9: QA & Balance 🧪
- [ ] Spawn test agents
- [ ] Stress test economy
- [ ] Adjust prices/rates
- [ ] Fix bugs
- [ ] Document for hackathon

---

## Current Focus: Phase 1 - Wallet Infrastructure

Starting with Solana devnet wallet setup.
