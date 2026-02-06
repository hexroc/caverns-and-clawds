-- Seed Test Funds (Development Only!)
-- DO NOT RUN ON PRODUCTION - Uses fake USDC for testing

-- Add test funds to treasury (simulate DeFi yield)
UPDATE system_wallets SET balance_cache = 1.0 WHERE id = 'treasury';

-- Distribute to NPCs for testing
UPDATE system_wallets SET balance_cache = 0.40 WHERE id = 'npc_quest_giver';  -- Quest rewards
UPDATE system_wallets SET balance_cache = 0.20 WHERE id = 'bank';              -- Banking/loans
UPDATE system_wallets SET balance_cache = 0.10 WHERE id = 'npc_old_shellworth'; -- Material buying
UPDATE system_wallets SET balance_cache = 0.10 WHERE id = 'npc_coral_smith';   -- Material buying
UPDATE system_wallets SET balance_cache = 0.10 WHERE id = 'npc_barnacle_bob';  -- Jobs
UPDATE system_wallets SET balance_cache = 0.05 WHERE id = 'npc_mystic_mantis'; -- Services
UPDATE system_wallets SET balance_cache = 0.05 WHERE id = 'npc_loan_shark';    -- Enforcement

-- Show balances
SELECT id, name, balance_cache as balance FROM system_wallets 
WHERE balance_cache > 0 
ORDER BY balance_cache DESC;
