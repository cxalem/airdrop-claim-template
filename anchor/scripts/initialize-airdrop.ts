import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { SolanaDistributor } from '../target/types/solana_distributor'
import { PublicKey, Connection, Keypair } from '@solana/web3.js'
import { loadRecipients } from './load-recipients'
import * as fs from 'fs'

// Constants for Anchor configuration
const PROVIDER_URL = 'https://api.devnet.solana.com'
const WALLET_PATH = './deploy-wallet.json'

function getDeclaredProgramId(): string | null {
  try {
    const libContent = fs.readFileSync('programs/solana-distributor/src/lib.rs', 'utf8')
    const match = libContent.match(/declare_id!\("([^"]+)"\);/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

function getIdlProgramId(): string | null {
  try {
    const idlPath = 'target/idl/solana_distributor.json'
    if (fs.existsSync(idlPath)) {
      const idlContent = fs.readFileSync(idlPath, 'utf8')
      const idl = JSON.parse(idlContent)
      return idl.address || null
    }
    return null
  } catch {
    return null
  }
}

// Initialize the airdrop with recipients data
export async function initializeAirdrop(recipientsFile: string = 'recipients.json') {
  try {
    console.log('🚀 Initializing airdrop...')

    // Proactive check for common issues before starting
    console.log('🔍 Performing pre-flight checks...')
    const declaredId = getDeclaredProgramId()
    const idlId = getIdlProgramId()

    if (!declaredId || !idlId) {
      console.log('❌ Missing required files. Please run the deploy-setup script first.')
      throw new Error('Missing program files - run deploy-setup script')
    }

    if (declaredId !== idlId) {
      console.log('❌ Program ID mismatch detected!')
      console.log(`   Declared in lib.rs: ${declaredId}`)
      console.log(`   IDL file: ${idlId}`)
      console.log('💡 Run the deploy-setup script to fix program ID mismatches')
      throw new Error('Program ID mismatch - run deploy-setup script')
    }

    console.log('✅ Pre-flight checks passed')

    console.log('📡 Using devnet endpoint:', PROVIDER_URL)
    console.log('👛 Using wallet:', WALLET_PATH)

    // Load recipients data
    const recipientsData = loadRecipients(recipientsFile)
    console.log(`📋 Loaded ${recipientsData.recipients.length} recipients`)
    console.log(`💰 Total amount: ${parseInt(recipientsData.totalAmount) / 1e9} SOL`)
    console.log(`🌳 Merkle root: ${recipientsData.merkleRoot}`)

    // Set up Anchor provider with hardcoded configuration
    console.log('📡 Creating provider with explicit configuration...')
    const connection = new Connection(PROVIDER_URL)

    // Load wallet keypair
    const walletKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'))))
    const wallet = new anchor.Wallet(walletKeypair)

    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })

    anchor.setProvider(provider)

    const program = anchor.workspace.SolanaDistributor as Program<SolanaDistributor>
    console.log(`📍 Program ID: ${program.programId.toString()}`)
    console.log(`👤 Authority: ${provider.wallet.publicKey.toString()}`)

    // Verify program exists on-chain
    console.log('🔍 Verifying program exists on-chain...')
    try {
      const programInfo = await provider.connection.getAccountInfo(program.programId)
      if (!programInfo) {
        throw new Error('Program account not found on-chain')
      }
      console.log('✅ Program verified on-chain')
      console.log(`   Owner: ${programInfo.owner.toString()}`)
      console.log(`   Executable: ${programInfo.executable}`)
    } catch (error) {
      console.error('❌ Program verification failed:', error)
      console.log("💡 Make sure you have deployed the program with 'anchor deploy'")
      throw error
    }

    // Convert hex merkle root to bytes
    const merkleRootHex = recipientsData.merkleRoot.replace('0x', '')
    const merkleRootBytes = Buffer.from(merkleRootHex, 'hex')
    console.log(`🔢 Merkle root bytes: [${Array.from(merkleRootBytes).join(', ')}]`)

    // Calculate airdrop state PDA
    console.log('🔍 Calculating airdrop state PDA...')
    console.log(`   Program ID: ${program.programId.toString()}`)
    console.log(`   Seeds: ["merkle_tree"]`)

    const [airdropStatePda, bump] = PublicKey.findProgramAddressSync([Buffer.from('merkle_tree')], program.programId)
    console.log(`🏛️  Airdrop state PDA: ${airdropStatePda.toString()}`)
    console.log(`🎯 PDA bump: ${bump}`)

    // Check if already initialized
    try {
      const existingState = await program.account.airdropState.fetch(airdropStatePda)
      console.log('⚠️  Airdrop already initialized:')
      console.log(`   Root: 0x${Buffer.from(existingState.merkleRoot).toString('hex')}`)
      console.log(`   Amount: ${existingState.airdropAmount.toNumber() / 1e9} SOL`)
      console.log(`   Claimed: ${existingState.amountClaimed.toNumber() / 1e9} SOL`)
      console.log(`   Authority: ${existingState.authority.toString()}`)
      return {
        airdropStatePda,
        signature: null,
        alreadyInitialized: true,
      }
    } catch {
      // Not initialized yet, continue
      console.log('✅ Airdrop not yet initialized, proceeding...')
    }

    // Initialize the airdrop
    const totalAmount = new anchor.BN(recipientsData.totalAmount)

    console.log('📤 Sending initialize transaction...')
    let tx: string
    try {
      tx = await program.methods
        .initializeAirdrop(Array.from(merkleRootBytes), totalAmount)
        .accounts({
          authority: provider.wallet.publicKey,
        })
        .rpc()

      console.log('✅ Transaction sent successfully!')
      console.log(`📋 Transaction signature: ${tx}`)
      console.log(`🔍 View on explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`)
    } catch (error) {
      console.error('❌ Failed to send initialization transaction:', error)
      throw error
    }

    // Wait for transaction confirmation with finalized commitment
    console.log('⏳ Waiting for transaction confirmation...')
    try {
      // First confirm with 'confirmed' for speed
      const confirmation = await provider.connection.confirmTransaction(tx, 'confirmed')
      if (confirmation.value.err) {
        console.error('❌ Transaction failed:', confirmation.value.err)
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
      }
      console.log('✅ Transaction confirmed successfully!')

      // Then wait for finalized for more reliability
      console.log('⏳ Waiting for finalized confirmation...')
      await provider.connection.confirmTransaction(tx, 'finalized')
      console.log('✅ Transaction finalized!')
    } catch (error) {
      console.error('❌ Failed to confirm transaction:', error)
      throw error
    }

    // Add a delay and retry mechanism to ensure account is available
    console.log('⏳ Waiting for account to be available...')
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Verify the state with retry mechanism
    console.log('🔍 Fetching airdrop state for verification...')
    let airdropState
    let retryCount = 0
    const maxRetries = 5

    while (retryCount < maxRetries) {
      try {
        // First check if the account exists at all
        const accountInfo = await provider.connection.getAccountInfo(airdropStatePda)
        if (!accountInfo) {
          console.log(`🔍 Account does not exist yet (attempt ${retryCount + 1}/${maxRetries})`)
          throw new Error('Account does not exist')
        }

        console.log(`✅ Account exists, attempting to parse data (attempt ${retryCount + 1}/${maxRetries})...`)
        console.log(`   Account owner: ${accountInfo.owner.toString()}`)
        console.log(`   Account data length: ${accountInfo.data.length} bytes`)

        // Now try to fetch the parsed account data
        airdropState = await program.account.airdropState.fetch(airdropStatePda)
        console.log('✅ Airdrop initialized and verified successfully!')
        break
      } catch (error) {
        retryCount++
        if (retryCount >= maxRetries) {
          console.error('❌ Failed to fetch airdrop state after initialization:', error)
          console.error(`   Expected PDA: ${airdropStatePda.toString()}`)
          console.error(`   Retries attempted: ${maxRetries}`)

          // Final diagnostic check
          try {
            const finalAccountInfo = await provider.connection.getAccountInfo(airdropStatePda)
            if (finalAccountInfo) {
              console.log('💡 Account exists but data parsing failed:')
              console.log(`   Owner: ${finalAccountInfo.owner.toString()}`)
              console.log(`   Expected owner (program): ${program.programId.toString()}`)
              console.log(`   Data length: ${finalAccountInfo.data.length} bytes`)
              console.log(`   Executable: ${finalAccountInfo.executable}`)
            } else {
              console.log('💡 Account does not exist on-chain.')
            }
          } catch (diagError) {
            console.log('💡 Could not perform final diagnostic check')
          }

          console.log('\n💡 This might be a timing issue. The airdrop may still be properly initialized.')
          console.log('   You can verify by running the claim test or checking the explorer:')
          console.log(`   https://explorer.solana.com/tx/${tx}?cluster=devnet`)
          console.log('\n   If the transaction succeeded, the airdrop should work even if verification failed.')
          return {
            airdropStatePda,
            signature: tx,
            alreadyInitialized: false,
            verificationFailed: true,
          }
        }

        console.log(`🔄 Verification attempt ${retryCount} failed, retrying in 2 seconds...`)
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }
    // Only show verification details if we successfully fetched the state
    if (airdropState) {
      console.log('\n🔍 Verification:')
      console.log(`   Merkle root: 0x${Buffer.from(airdropState.merkleRoot).toString('hex')}`)
      console.log(`   Authority: ${airdropState.authority.toString()}`)
      console.log(`   Total amount: ${airdropState.airdropAmount.toNumber() / 1e9} SOL`)
      console.log(`   Amount claimed: ${airdropState.amountClaimed.toNumber() / 1e9} SOL`)
    }

    return {
      airdropStatePda,
      signature: tx,
      alreadyInitialized: false,
    }
  } catch (error) {
    console.error('❌ Error initializing airdrop:', error)

    // Provide helpful error guidance
    if (error instanceof Error) {
      if (
        error.message?.includes('Cannot find module') ||
        error.message?.includes('DeclaredProgramIdMismatch') ||
        error.message?.includes('Error Code: DeclaredProgramIdMismatch') ||
        error.message?.includes('4100') ||
        (error as any)?.error?.errorCode?.code === 'DeclaredProgramIdMismatch' ||
        (error as any)?.errorLogs?.some((log: string) => log.includes('DeclaredProgramIdMismatch'))
      ) {
        console.log('\n💡 This looks like a program setup issue.')
        console.log('   Try running the deploy-setup script to fix common issues:')
        console.log('   pnpm deploy-setup')
      } else if (error.message?.includes('AccountNotInitialized')) {
        console.log('\n💡 The program account might not be deployed.')
        console.log("   Make sure you've deployed the program with the deploy-setup script.")
      }
    }

    throw error
  }
}

// If running this script directly
if (require.main === module) {
  initializeAirdrop()
    .then((result) => {
      if (result.alreadyInitialized) {
        console.log('✨ Airdrop was already initialized!')
      } else {
        console.log('🎉 Airdrop initialization completed!')
      }
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Failed:', error)
      process.exit(1)
    })
}
