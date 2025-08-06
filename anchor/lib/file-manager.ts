import * as fs from 'fs'
import * as path from 'path'
import type { RecipientsFile, GillWalletInfo } from './types'
import { type Address } from 'gill'

export interface GillFileConfig {
  workingDir?: string
  network?: 'devnet' | 'mainnet' | 'testnet'
}

export function updateGillAnchorConfig(
  deployWallet: GillWalletInfo,
  programId: string | Address,
  config: GillFileConfig = {},
): void {
  const { workingDir = 'anchor' } = config

  const programIdStr = typeof programId === 'string' ? programId : programId

  const anchorToml = `[toolchain]
anchor_version = "0.31.1"
package_manager = "pnpm"

[features]
resolution = true
skip-lint = false

[programs.devnet]
solana_distributor = "${programIdStr}"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "${deployWallet.keypairFile}"

[scripts]
test = "pnpm run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
`

  const anchorTomlPath = `${workingDir}/Anchor.toml`
  fs.writeFileSync(anchorTomlPath, anchorToml)
  console.log(`✅ Updated ${anchorTomlPath} to use ${deployWallet.keypairFile} (Gill)`)
}

export function generateGillRecipientsJson(
  testWallets: GillWalletInfo[],
  programId: string | Address,
  airdropAmountLamports: number = 75000000, // Default: 0.075 SOL
  config: GillFileConfig = {},
): void {
  const { workingDir = 'anchor' } = config

  // Convert Address to string if needed
  const programIdStr = typeof programId === 'string' ? programId : programId

  const recipients = testWallets.map((wallet, index) => ({
    publicKey: wallet.address, // Gill addresses are already strings
    amount: airdropAmountLamports.toString(),
    index,
    description: `${wallet.name} - ${wallet.funded ? 'Funded' : 'Unfunded'} - ${airdropAmountLamports / 1e9} SOL`,
  }))

  const totalAmount = (recipients.length * airdropAmountLamports).toString()
  const recipientsPath = `${workingDir}/recipients.json`

  let shouldUpdate = true
  if (fs.existsSync(recipientsPath)) {
    try {
      const existingData = JSON.parse(fs.readFileSync(recipientsPath, 'utf8'))
      const existingPublicKeys = existingData.recipients?.map((r: { publicKey: string }) => r.publicKey) || []
      const newPublicKeys = recipients.map((r) => r.publicKey)

      if (JSON.stringify(existingPublicKeys.sort()) === JSON.stringify(newPublicKeys.sort())) {
        console.log('📋 Recipients unchanged, updating descriptions only (Gill)')
        existingData.recipients = recipients
        existingData.description = 'Deployment setup airdrop for testing purposes'
        fs.writeFileSync(recipientsPath, JSON.stringify(existingData, null, 2))
        shouldUpdate = false
      }
    } catch {}
  }

  if (shouldUpdate) {
    const recipientsData: RecipientsFile = {
      airdropId: 'solana-distributor-airdrop-' + new Date().getFullYear(),
      description: 'Deployment setup airdrop for testing purposes',
      merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000', // Will be updated after tree generation
      totalAmount,
      network: 'devnet',
      programId: programIdStr,
      recipients,
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        algorithm: 'keccak256',
        leafFormat: 'recipient_pubkey(32) + amount(8) + is_claimed(1)',
      },
    }

    fs.writeFileSync(recipientsPath, JSON.stringify(recipientsData, null, 2))
    console.log(`📋 Generated ${recipientsPath} (Gill)`)
  }
}

export function updateGillRecipientsWithMerkleRoot(merkleRoot: string, config: GillFileConfig = {}): void {
  const { workingDir = 'anchor' } = config

  try {
    const recipientsPath = `${workingDir}/recipients.json`
    const recipientsData = JSON.parse(fs.readFileSync(recipientsPath, 'utf8'))

    recipientsData.merkleRoot = merkleRoot
    recipientsData.metadata.algorithm = 'keccak256'
    recipientsData.metadata.leafFormat = 'recipient_pubkey(32) + amount(8) + is_claimed(1)'

    fs.writeFileSync(recipientsPath, JSON.stringify(recipientsData, null, 2))
    console.log(`✅ Updated ${recipientsPath} with merkle root (Gill)`)
  } catch (error) {
    console.error('❌ Error updating recipients with merkle root:', error)
    throw error
  }
}

export function updateGillEnvironmentFile(programId: string | Address): void {
  try {
    console.log('📝 Updating environment file with program ID... (Gill)')

    const programIdStr = typeof programId === 'string' ? programId : programId

    let envFile = '.env.local'
    if (!fs.existsSync(envFile)) {
      envFile = '.env'
      if (!fs.existsSync(envFile)) {
        envFile = '.env.local'
      }
    }

    let envContent = ''
    const envVar = `NEXT_PUBLIC_PROGRAM_ID=${programIdStr}`

    if (fs.existsSync(envFile)) {
      envContent = fs.readFileSync(envFile, 'utf8')

      if (envContent.includes('NEXT_PUBLIC_PROGRAM_ID=')) {
        envContent = envContent.replace(/NEXT_PUBLIC_PROGRAM_ID=.*/, envVar)
        console.log(`   ✅ Updated existing ${path.basename(envFile)} (Gill)`)
      } else {
        envContent = envContent.trim() + `\n${envVar}\n`
        console.log(`   ✅ Added NEXT_PUBLIC_PROGRAM_ID to ${path.basename(envFile)} (Gill)`)
      }
    } else {
      envContent = `# Solana Airdrop Configuration\n# Generated by deploy-setup script using Gill\n${envVar}\n`
      console.log(`   ✅ Created new ${path.basename(envFile)} with program ID (Gill)`)
    }

    fs.writeFileSync(envFile, envContent)
    console.log(`   📍 Program ID: ${programIdStr}`)
  } catch (error) {
    console.error('❌ Error updating environment file:', error)
    console.log('⚠️  You may need to manually add NEXT_PUBLIC_PROGRAM_ID to your .env.local file')
  }
}

export function loadGillRecipientsFile(filePath?: string, config: GillFileConfig = {}): RecipientsFile {
  const { workingDir = 'anchor' } = config
  const recipientsPath = filePath || `${workingDir}/recipients.json`

  if (!fs.existsSync(recipientsPath)) {
    throw new Error(`Recipients file not found: ${recipientsPath}`)
  }

  try {
    const data = fs.readFileSync(recipientsPath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    throw new Error(`Failed to parse recipients file: ${error}`)
  }
}

export function getGillCurrentProgramId(config: GillFileConfig = {}): string {
  const { workingDir = 'anchor' } = config

  try {
    const anchorContent = fs.readFileSync(`${workingDir}/Anchor.toml`, 'utf8')
    const match = anchorContent.match(/solana_distributor = "([^"]+)"/)
    if (match) {
      return match[1]
    }

    const libContent = fs.readFileSync(`${workingDir}/programs/solana-distributor/src/lib.rs`, 'utf8')
    const libMatch = libContent.match(/declare_id!\("([^"]+)"\);/)
    if (libMatch) {
      return libMatch[1]
    }

    throw new Error('Could not find program ID in configuration files')
  } catch (error) {
    console.error('❌ Error getting current program ID:', error)
    throw new Error(`Failed to get program ID: ${error instanceof Error ? error.message : String(error)}`)
  }
}
