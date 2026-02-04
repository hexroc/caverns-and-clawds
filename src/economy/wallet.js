/**
 * Wallet Infrastructure for C&C Economy
 * 
 * Handles Solana devnet wallets and USDC transfers.
 * Every pearl is a real USDC token on-chain.
 */

const { 
  Connection, 
  Keypair, 
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} = require('@solana/web3.js');
const { 
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  getMint,
  getAccount
} = require('@solana/spl-token');
const bs58 = require('bs58').default;
const crypto = require('crypto');

// Solana Devnet
const SOLANA_RPC = 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_RPC, 'confirmed');

// USDC on Devnet (Circle's official devnet USDC)
// Note: Devnet USDC mint address
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const USDC_DECIMALS = 6; // USDC has 6 decimals

/**
 * Generate a new Solana keypair
 */
function generateWallet() {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: bs58.encode(keypair.secretKey)
  };
}

/**
 * Restore keypair from secret key
 */
function restoreWallet(secretKeyBase58) {
  const secretKey = bs58.decode(secretKeyBase58);
  return Keypair.fromSecretKey(secretKey);
}

/**
 * Encrypt a secret key for storage
 */
function encryptSecretKey(secretKey, encryptionKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', 
    crypto.createHash('sha256').update(encryptionKey).digest(), 
    iv
  );
  let encrypted = cipher.update(secretKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a secret key from storage
 */
function decryptSecretKey(encryptedData, encryptionKey) {
  const [ivHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc',
    crypto.createHash('sha256').update(encryptionKey).digest(),
    iv
  );
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Get USDC balance for a wallet
 */
async function getUSDCBalance(publicKeyStr) {
  try {
    const publicKey = new PublicKey(publicKeyStr);
    
    // Find the associated token account for USDC
    const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
      mint: USDC_MINT
    });
    
    if (tokenAccounts.value.length === 0) {
      return 0;
    }
    
    const accountInfo = await getAccount(connection, tokenAccounts.value[0].pubkey);
    // Convert from smallest unit (6 decimals) to USDC
    return Number(accountInfo.amount) / Math.pow(10, USDC_DECIMALS);
  } catch (err) {
    console.error('Error getting USDC balance:', err);
    return 0;
  }
}

/**
 * Transfer USDC between wallets
 * 
 * @param {string} fromSecretKey - Base58 encoded secret key of sender
 * @param {string} toPublicKey - Base58 public key of recipient  
 * @param {number} amount - Amount in USDC (not smallest unit)
 * @returns {Object} - { success, signature, error }
 */
async function transferUSDC(fromSecretKey, toPublicKey, amount) {
  try {
    const fromKeypair = restoreWallet(fromSecretKey);
    const toPublicKeyObj = new PublicKey(toPublicKey);
    
    // Convert USDC to smallest unit
    const amountInSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)));
    
    // Get or create token accounts
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      fromKeypair,
      USDC_MINT,
      fromKeypair.publicKey
    );
    
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      fromKeypair, // Payer for account creation if needed
      USDC_MINT,
      toPublicKeyObj
    );
    
    // Create transfer instruction
    const transferIx = createTransferInstruction(
      fromTokenAccount.address,
      toTokenAccount.address,
      fromKeypair.publicKey,
      amountInSmallestUnit
    );
    
    // Build and send transaction
    const transaction = new Transaction().add(transferIx);
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [fromKeypair]
    );
    
    console.log(`✅ USDC Transfer: ${amount} USDC`);
    console.log(`   From: ${fromKeypair.publicKey.toBase58()}`);
    console.log(`   To: ${toPublicKey}`);
    console.log(`   Signature: ${signature}`);
    
    return {
      success: true,
      signature,
      amount,
      from: fromKeypair.publicKey.toBase58(),
      to: toPublicKey
    };
  } catch (err) {
    console.error('USDC Transfer failed:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Get SOL balance for a wallet (needed for transaction fees)
 */
async function getSOLBalance(publicKeyStr) {
  try {
    const publicKey = new PublicKey(publicKeyStr);
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9; // Convert lamports to SOL
  } catch (err) {
    console.error('Error getting SOL balance:', err);
    return 0;
  }
}

/**
 * Request SOL airdrop (devnet only)
 */
async function requestAirdrop(publicKeyStr, amountSOL = 1) {
  try {
    const publicKey = new PublicKey(publicKeyStr);
    const signature = await connection.requestAirdrop(
      publicKey,
      amountSOL * 1e9 // Convert to lamports
    );
    await connection.confirmTransaction(signature);
    console.log(`✅ Airdrop: ${amountSOL} SOL to ${publicKeyStr}`);
    return { success: true, signature };
  } catch (err) {
    console.error('Airdrop failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * System wallets for the economy
 */
const SYSTEM_WALLETS = {
  // These will be generated and stored on first run
  treasury: null,  // House wallet - backs the economy
  bank: null,      // Reef Bank - handles interest/loans
  npcs: {
    barnacle_bob: null,
    coral_smith: null,
    old_shellworth: null,
    mystic_mantis: null,
    loan_shark: null
  }
};

module.exports = {
  // Wallet operations
  generateWallet,
  restoreWallet,
  encryptSecretKey,
  decryptSecretKey,
  
  // Balance queries
  getUSDCBalance,
  getSOLBalance,
  
  // Transfers
  transferUSDC,
  
  // Devnet utilities
  requestAirdrop,
  
  // Constants
  USDC_MINT,
  USDC_DECIMALS,
  SOLANA_RPC,
  connection,
  
  // System wallets (to be initialized)
  SYSTEM_WALLETS
};
