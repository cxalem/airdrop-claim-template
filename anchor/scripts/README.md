# Solana Distributor Scripts

This directory contains TypeScript utilities for managing the Solana Distributor merkle tree airdrop system.

## 📂 Available Scripts

### Core Scripts

#### 1. **generate-merkle-tree.ts**
Generates a merkle tree from the recipients list and updates `recipients.json` with the computed root.

```bash
npx ts-node scripts/generate-merkle-tree.ts
```

**What it does:**
- Loads recipients from `recipients.json`
- Creates merkle tree leaves using format: `recipient_pubkey(32) + amount(8) + is_claimed(1)`
- Builds complete merkle tree using keccak256 hashing
- Updates `recipients.json` with computed merkle root

#### 2. **generate-proof.ts**
Generates merkle proofs for individual recipients or all recipients.

```bash
# Generate proof for specific recipient
npx ts-node scripts/generate-proof.ts <PUBLIC_KEY>

# Generate proofs for all recipients
npx ts-node scripts/generate-proof.ts --all
```

**Examples:**
```bash
npx ts-node scripts/generate-proof.ts HcCcKydEcuGMbBso7jciQrFpBw1XQrKHKFckGSAxXXQG
npx ts-node scripts/generate-proof.ts --all
```

#### 3. **initialize-airdrop.ts**
Initializes the on-chain airdrop with the merkle root and recipients data.

```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=your-wallet.json \
npx ts-node scripts/initialize-airdrop.ts
```

**Features:**
- Checks if airdrop already initialized
- Creates airdrop state PDA with merkle root
- Transfers SOL to fund the airdrop
- Provides verification of the setup

#### 4. **claim-airdrop.ts**
Allows recipients to claim their tokens using merkle proofs.

```bash
npx ts-node scripts/claim-airdrop.ts <RECIPIENT_PUBLIC_KEY> <SECRET_KEY_BASE58>
```

**Example:**
```bash
npx ts-node scripts/claim-airdrop.ts HcCcKydEcuGMbBso7jciQrFpBw1XQrKHKFckGSAxXXQG CmRj15BFFh1ECMtYgwzQyYN1AncZvqQRyNHmMD5JqujNMEPaDnJEG5AQvUcDgLjPwbs7dAVLbQ2pPzk3bsWuboS
```

### Utility Scripts

#### 5. **extract-private-keys.ts**
Extracts private keys from wallet keypair files in multiple formats.

```bash
# Extract all test wallet keys
npx ts-node scripts/extract-private-keys.ts

# Extract specific wallet keys
npx ts-node scripts/extract-private-keys.ts test-wallet-1.json
```

**Output formats:**
- **Private Key (32 bytes)**: Hex and Base58
- **Secret Key (64 bytes)**: Hex, Base58, and Array (use this for wallets)

#### 6. **load-recipients.ts**
Utility functions for loading and validating recipient data.

```typescript
import { loadRecipients, validateRecipientsFile } from './load-recipients';

const data = loadRecipients('recipients.json');
const isValid = validateRecipientsFile(data);
```

## 🔄 Complete Workflow

### 1. Setup Recipients
```bash
# Edit recipients.json with your recipient list
```

### 2. Generate Merkle Tree
```bash
npx ts-node scripts/generate-merkle-tree.ts
```

### 3. Deploy Program (if needed)
```bash
anchor build
anchor deploy
```

### 4. Initialize Airdrop
```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=test-wallet-1.json \
npx ts-node scripts/initialize-airdrop.ts
```

### 5. Generate Proofs
```bash
npx ts-node scripts/generate-proof.ts --all
```

### 6. Claim Tokens
```bash
npx ts-node scripts/claim-airdrop.ts <PUBLIC_KEY> <SECRET_KEY>
```

## 📊 Data Formats

### Recipients File Structure
```json
{
  "airdropId": "your-airdrop-id",
  "description": "Airdrop description",
  "merkleRoot": "0x...",
  "totalAmount": "300000000",
  "network": "devnet",
  "programId": "ErbDoJTnJyG6EBXHeFochTsHJhB3Jfjc3MF1L9aNip3y",
  "recipients": [
    {
      "publicKey": "RECIPIENT_PUBLIC_KEY",
      "amount": "75000000",
      "index": 0,
      "description": "Recipient description"
    }
  ]
}
```

### Proof Output Format
```typescript
{
  proof: number[][], // Array of 32-byte arrays (sibling hashes)
  leafIndex: number,  // Position in merkle tree
  amount: string,     // Amount in lamports
  recipient: string   // Public key
}
```

## 🔧 Environment Variables

Required for most scripts:

```bash
export ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"
export ANCHOR_WALLET="path/to/your/wallet.json"
```

## 📋 Dependencies

All scripts require these npm packages:
- `@coral-xyz/anchor` - Anchor framework
- `@solana/web3.js` - Solana web3 library
- `js-sha3` - Keccak256 hashing
- `bs58` - Base58 encoding

## ⚠️ Important Notes

1. **Merkle Root Consistency**: Always regenerate the merkle tree if you change recipients
2. **Secret Keys**: Use 64-byte secret keys (not 32-byte private keys) for claiming
3. **Network**: Scripts default to devnet - update environment variables for mainnet
4. **Testing**: Test all flows on devnet before mainnet deployment

## 🐛 Troubleshooting

### Common Issues

**"Key pair bytes must be of length 64"**
- Use the 64-byte secret key from `extract-private-keys.ts`, not the 32-byte private key

**"Invalid Merkle proof"**  
- Regenerate merkle tree: `npx ts-node scripts/generate-merkle-tree.ts`
- Ensure recipients list hasn't changed since initialization

**"Airdrop already initialized"**
- Use a different program ID or update the existing airdrop

**"Account not found"**
- Make sure the program is deployed: `anchor deploy`
- Check you're on the correct network (devnet vs mainnet)

## 📈 Performance

- **Merkle Tree Generation**: O(n log n) for n recipients
- **Proof Generation**: O(log n) proof size, O(n) to find recipient
- **On-chain Verification**: O(log n) for proof verification

---

For more detailed information, see the main [README.md](../README.md). 