# Solana Airdrop Claim Template

A Next.js template for claiming Solana airdrops using Merkle tree-based distribution. This template provides a complete frontend interface for users to claim their allocated tokens from a Solana program.

## 🚀 Features

- **Automatic Claim Status Check**: Verifies if airdrop has already been claimed before attempting to claim
- **Merkle Tree Verification**: Uses cryptographic proofs to verify eligibility
- **Real-time UI Feedback**: Shows detailed status messages during the claiming process
- **Solana Integration**: Built with modern Solana libraries (`gill`, `@wallet-ui/react`)
- **TypeScript Support**: Fully typed for better development experience
- **Responsive UI**: Built with Tailwind CSS and modern UI components

## 📋 Prerequisites

- Node.js 18+ and pnpm
- A Solana wallet with some SOL for transaction fees (minimum 0.005 SOL)
- Access to a deployed Solana airdrop program
- Your wallet's private key (for claiming)

## 🛠️ Setup

1. **Clone and install dependencies:**
```bash
git clone <your-repo>
cd airdrop-claim-template
pnpm install
```

2. **Configure environment variables:**
Create a `.env.local` file:
```bash
# Required: Your wallet's private key (Base58 encoded)
NEXT_PUBLIC_USER_PRIVATE_KEY=your_private_key_here

# Optional: Solana network (defaults to devnet)
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Optional: Airdrop program ID (defaults to example program)
NEXT_PUBLIC_AIRDROP_PROGRAM_ID=ErbDoJTnJyG6EBXHeFochTsHJhB3Jfjc3MF1L9aNip3y
```

3. **Update recipient data:**
Edit `src/lib/recipients.ts` to include your actual airdrop recipients and amounts.

4. **Start the development server:**
```bash
pnpm dev
```

## 🔄 How It Works

### Step-by-Step Process

1. **User clicks "Claim Airdrop"**
   - The UI shows "Initializing..." status

2. **Configuration Validation**
   - Checks that required environment variables are set
   - Validates private key and program ID

3. **Claim Status Check**
   - Shows "Checking if airdrop has already been claimed..." 
   - Queries the blockchain for the user's claim account (PDA)
   - If already claimed, shows "Already claimed" and stops

4. **Eligibility Verification**
   - Checks if the wallet address is in the recipients list
   - Verifies the wallet has enough SOL for transaction fees (0.005 SOL minimum)

5. **Merkle Proof Generation**
   - Generates a cryptographic proof that the user is eligible
   - Creates the Merkle tree from all recipients
   - Extracts the specific proof path for this user

6. **Transaction Execution**
   - Shows "Claiming airdrop..." status
   - Creates and sends the claim transaction to the Solana program
   - Waits for confirmation

7. **Success Confirmation**
   - Shows "Success!" status
   - Displays the claimed amount and transaction signature

### Technical Architecture

```ascii
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │───▶│  AirdropClient   │───▶│ Solana Program  │
│  (ClaimButton)  │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Status UI     │    │  Merkle Tree     │    │   Claim PDA     │
│   (Messages)    │    │   Generator      │    │   (On-chain)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```ascii
src/
├── app/
│   ├── page.tsx                 # Main page with ClaimButton
│   ├── layout.tsx               # App layout with providers
│   └── globals.css              # Global styles
├── components/
│   ├── claim-button.tsx         # Main claim interface
│   ├── app-providers.tsx        # React Query & theme providers
│   └── solana/
│       └── solana-provider.tsx  # Solana wallet connection
├── lib/
│   ├── airdrop-client.ts        # Core claiming logic
│   ├── airdrop-instructions.ts  # Solana instruction serialization
│   ├── config.ts                # Configuration management
│   ├── merkle-tree.ts           # Merkle tree generation & proofs
│   ├── recipients.ts            # Airdrop recipient data
│   ├── idl.json                 # Solana program interface
│   └── utils.ts                 # Utility functions
└── types.ts                     # TypeScript definitions
```

### Key Files Explained

#### `src/lib/airdrop-client.ts`
The core client that handles:
- Checking if airdrop has been claimed (`checkClaimStatus()`)
- Claiming the airdrop (`claimAirdrop()`)
- Validating user eligibility and balance
- Building and sending Solana transactions

#### `src/lib/merkle-tree.ts`
Implements the Merkle tree algorithm:
- Creates leaves from recipient data (public key + amount + claim status)
- Builds the tree using Keccak-256 hashing
- Generates proofs for specific recipients
- Verifies eligibility cryptographically

#### `src/lib/recipients.ts`
Contains the airdrop distribution data:
- List of eligible wallet addresses
- Amount each address can claim
- Merkle root for verification
- Metadata about the airdrop

#### `src/components/claim-button.tsx`
The main UI component that:
- Handles user interactions
- Shows real-time status updates
- Manages the claiming flow
- Displays success/error messages

## ⚙️ Configuration

### Environment Variables

```ascii
| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_USER_PRIVATE_KEY` | Yes | User's wallet private key (Base58) | - |
| `NEXT_PUBLIC_SOLANA_NETWORK` | No | Solana network to use | `devnet` |
| `NEXT_PUBLIC_AIRDROP_PROGRAM_ID` | No | Airdrop program address | Example program |
```

### Airdrop Configuration

Edit `src/lib/config.ts` to modify:
- Network settings
- Minimum SOL balance requirements
- Debug logging preferences

### Recipient Data

Update `src/lib/recipients.ts` with:
- Your actual recipient addresses
- Corresponding claim amounts
- Airdrop metadata (ID, description, etc.)

## 🎯 Usage

1. **For Recipients:**
   - Open the application
   - Ensure your wallet has the minimum SOL balance
   - Click "Claim Airdrop"
   - Wait for the process to complete
   - Check your wallet for the claimed tokens

2. **For Developers:**
   - Customize the recipient list in `recipients.ts`
   - Deploy your own Solana airdrop program
   - Update the program ID in configuration
   - Style the UI to match your brand

## 🔐 Security Notes

- **Private Key Handling**: The private key is used client-side only for signing transactions
- **Environment Variables**: Use `NEXT_PUBLIC_` prefix only for non-sensitive config
- **Claim Verification**: Each claim is cryptographically verified via Merkle proofs
- **Double-Claim Protection**: The system checks and prevents double claiming

## 🧪 Testing

The template includes test data with 4 sample recipients:
- 3 funded test wallets (2 SOL each)
- 1 unfunded wallet (for testing insufficient balance)
- Each eligible for 0.075 SOL (75M lamports)

## 🚨 Important Notes

- **Production Use**: Replace test data with real recipient information
- **Private Keys**: Never commit private keys to version control
- **Network Costs**: Each claim transaction costs ~0.000005 SOL in fees
- **Program Deployment**: You'll need to deploy your own Solana program for production

## 📝 Development

```bash
# Development
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Linting and formatting
pnpm lint
pnpm format
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

---

Built with ❤️ using Next.js, TypeScript, and Solana
