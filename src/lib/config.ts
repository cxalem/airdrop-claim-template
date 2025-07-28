/**
 * Airdrop System Configuration
 * Centralized configuration for the airdrop claiming system
 */

export const AIRDROP_CONFIG = {
  // Network settings
  NETWORK: (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet' | 'testnet',
  
  // Program addresses
  AIRDROP_PROGRAM_ID: process.env.NEXT_PUBLIC_AIRDROP_PROGRAM_ID || 'ErbDoJTnJyG6EBXHeFochTsHJhB3Jfjc3MF1L9aNip3y',
  
  // Transaction settings
  MIN_SOL_BALANCE: 0.005, // Minimum SOL needed for transaction fees
  
  // UI settings
  ENABLE_DEBUG_LOGS: process.env.NODE_ENV === 'development',
  
  // Private key (for development only)
  PRIVATE_KEY: process.env.NEXT_PUBLIC_USER_PRIVATE_KEY,
} as const

/**
 * Validates the configuration and throws errors for missing required values
 */
export function validateConfig(): void {
  if (!AIRDROP_CONFIG.PRIVATE_KEY) {
    throw new Error('NEXT_PUBLIC_USER_PRIVATE_KEY environment variable is required')
  }
  
  if (!AIRDROP_CONFIG.AIRDROP_PROGRAM_ID) {
    throw new Error('NEXT_PUBLIC_AIRDROP_PROGRAM_ID environment variable is required')
  }
}

/**
 * Logs the current configuration (for debugging)
 */
export function logConfig(): void {
  if (AIRDROP_CONFIG.ENABLE_DEBUG_LOGS) {
    console.log('🔧 Airdrop Configuration:', {
      network: AIRDROP_CONFIG.NETWORK,
      programId: AIRDROP_CONFIG.AIRDROP_PROGRAM_ID,
      minBalance: AIRDROP_CONFIG.MIN_SOL_BALANCE,
      hasPrivateKey: !!AIRDROP_CONFIG.PRIVATE_KEY,
    })
  }
} 