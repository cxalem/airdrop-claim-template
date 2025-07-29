# Solana Airdrop Claim Template

A complete Next.js template for creating and claiming Solana airdrops using Merkle tree-based distribution. This template includes both the Solana program deployment tools and a beautiful frontend interface for users to claim their allocated tokens.

## 🚀 Features

- **Complete Deployment Setup**: Automated script to deploy and configure your Solana airdrop program
- **Test Wallet Generation**: Creates funded test wallets for development and testing
- **Automatic Configuration**: Updates all config files, environment variables, and frontend code
- **Merkle Tree Verification**: Uses cryptographic proofs to verify eligibility  
- **Real-time UI Feedback**: Shows detailed status during the claiming process
- **Modern Stack**: Built with Next.js, TypeScript, Tailwind CSS, and latest Solana libraries
- **Developer Friendly**: Comprehensive error handling and detailed logging

## 📋 Prerequisites

- **Node.js 18+** and **pnpm** (or npm/yarn)
- **Solana CLI tools** installed and configured
- **Anchor Framework** (version 0.31.1+)
- **Rust** (for compiling Solana programs)
- Access to **Solana Devnet** (with SOL for deployment costs)

### Installing Prerequisites

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Install Anchor
npm install -g @coral-xyz/anchor-cli

# Verify installations
solana --version
anchor --version
```

## 🛠️ Complete Setup Guide

Follow these steps exactly to go from zero to a fully working airdrop system:

### Step 1: Clone and Install

```bash
git clone https://github.com/cxalem/airdrop-claim-template.git
cd airdrop-claim-template
pnpm install
```

**Common Issues:**
- `pnpm not found`: Install pnpm with `npm install -g pnpm`
- `Permission denied`: Run with `sudo` or fix npm permissions

### Step 2: Add Your Private Key

Create a `.env.local` file in the project root:

```bash
# Your wallet's private key (Base58 encoded) - this will be one of the airdrop recipients
NEXT_PUBLIC_USER_PRIVATE_KEY=your_base58_private_key_here

# Optional: Network (defaults to devnet)
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

**How to get your private key:**
```bash
# If you have a Solana keypair file:
solana-keygen pubkey ~/.config/solana/id.json  # Shows public key
cat ~/.config/solana/id.json  # Shows the keypair array

# Convert keypair array to base58 (if needed):
# Use online tools or Solana CLI to convert
```

**⚠️ Security Warning:** Never commit private keys to version control! The `.env.local` file is gitignored for your safety.

### Step 3: Run the Deploy Setup Script

This is the magic command that sets everything up:

```bash
cd anchor
npx ts-node scripts/deploy-setup.ts
```

**What this script does:**
1. **Creates/loads deployment wallet** - Generates or imports a wallet for deploying the program
2. **Requests SOL from faucet** - Automatically funds wallets on devnet  
3. **Generates test wallets** - Creates additional test wallets (your private key becomes one of the recipients)
4. **Builds configuration files** - Updates `recipients.json`, `Anchor.toml`, etc.
5. **Generates Merkle tree** - Computes cryptographic proofs for all recipients
6. **Updates frontend code** - Automatically updates `src/lib/recipients.ts` with real data
7. **Deploys Solana program** - Compiles and deploys your airdrop program to devnet
8. **Updates environment file** - Automatically adds the program ID to `.env.local`
9. **Initializes airdrop** - Sets up the on-chain airdrop state with Merkle root

**Interactive Prompts:**
- Choose to use existing wallets or create new ones
- Decide how many test wallets to create (default: 3)
- Choose whether to deploy with a new program ID
- Confirm deployment and initialization

**Common Errors & Solutions:**

**Error: `ANCHOR_PROVIDER_URL is not defined`**
```bash
# The script handles this automatically now, but if you run commands manually:
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=./deploy-wallet.json
```

**Error: `Transaction simulation failed`**
- **Cause:** Program not deployed or not initialized
- **Solution:** Make sure you completed the full deploy-setup process

**Error: `Insufficient SOL balance`**
- **Cause:** Deploy wallet needs more SOL for deployment costs
- **Solution:** 
  ```bash
  # Check balance
  solana balance <your-deploy-wallet-address> --url devnet
  
  # Request more SOL
  solana airdrop 2 <your-deploy-wallet-address> --url devnet
  ```

**Error: `Program ID mismatch`**
- **Cause:** Frontend using wrong program ID
- **Solution:** The script now fixes this automatically, but verify `.env.local` has the right `NEXT_PUBLIC_PROGRAM_ID`

**Error: `Airdrop rate limit exceeded`**
- **Cause:** Too many faucet requests
- **Solution:** Wait a few minutes and try again, or fund wallets manually

### Step 4: Verify Setup Success

After the script completes, you should see:

```
🎉 Everything is ready! You can now:
   - Test claiming: npx ts-node scripts/claim-airdrop.ts <pubkey> <secretkey>
   - Use the frontend to claim airdrops (restart dev server to pick up new env vars)

📁 Files created/updated:
   - deploy-wallet.json
   - test-wallets.json  
   - recipients.json (updated)
   - src/lib/recipients.ts (updated)
   - Anchor.toml (updated)
   - .env.local or .env (updated with program ID)
```

**Verify your setup:**
```bash
# Check your program ID was added
cat ../.env.local

# Verify recipients include your wallet
cat recipients.json

# Check deployed program exists
solana program show <your-program-id> --url devnet
```

### Step 5: Start the Frontend

```bash
cd ..  # Back to project root
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) - you should see the airdrop claiming interface.

**Common Issues:**
- **Blank page**: Check browser console for errors
- **"Program ID not found"**: Restart dev server to pick up new environment variables
- **TypeScript errors**: Run `pnpm build` to check for issues

### Step 6: Claim Your Airdrop

1. **Open the app** - Go to http://localhost:3000
2. **Click "Claim Airdrop"** - The button should be enabled
3. **Watch the process** - You'll see status updates:
   - "Initializing..."
   - "Checking if airdrop has already been claimed..."
   - "Claiming airdrop..."
   - "Success!" (with transaction signature)

**The claiming process:**
1. **Validates configuration** - Checks private key and program ID
2. **Checks claim status** - Verifies you haven't already claimed
3. **Validates eligibility** - Confirms you're in the recipients list
4. **Checks SOL balance** - Ensures you have enough for transaction fees
5. **Generates Merkle proof** - Creates cryptographic proof of eligibility
6. **Sends transaction** - Submits claim to the Solana program
7. **Confirms success** - Displays amount claimed and transaction link

**Common Claiming Errors:**

**Error: `Address not eligible for this airdrop`**
- **Cause:** Your private key doesn't match any recipient address
- **Solution:** Make sure the private key in `.env.local` corresponds to one of the recipients in your setup

**Error: `Insufficient SOL balance`** 
- **Cause:** Your wallet needs SOL for transaction fees (minimum 0.005 SOL)
- **Solution:**
  ```bash
  solana airdrop 1 <your-public-key> --url devnet
  ```

**Error: `Airdrop has already been claimed`**
- **Cause:** You (or someone with this private key) already claimed
- **Solution:** This is working as intended! Each address can only claim once

**Error: `Transaction simulation failed`**
- **Cause:** Usually a program or initialization issue
- **Solution:** 
  ```bash
  # Re-run initialization if needed
  cd anchor
  ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=./deploy-wallet.json npx ts-node scripts/initialize-airdrop.ts
  ```

## 🧪 Testing with Command Line

You can also test claiming via command line:

```bash
# From the anchor directory
cd anchor

# Extract private keys from test wallets
npx ts-node scripts/extract-private-keys.ts

# Claim for a specific recipient
npx ts-node scripts/claim-airdrop.ts <public-key> <base58-private-key>
```

## 🔄 Development Workflow

### For Initial Development (Mock Data)
- The template comes with mock data that allows frontend development
- You can work on UI/UX before deploying any Solana programs
- Mock program ID: `MockProgramId1111111111111111111111111111111`

### For Real Deployment
- Run the deploy-setup script to replace mock data with real deployment
- All configuration files are automatically updated
- Environment variables are set automatically

### Making Changes
- **Add more recipients**: Edit the test wallet creation in `deploy-setup.ts`
- **Change airdrop amounts**: Modify the amount in the recipients generation
- **Update UI**: Customize components in `src/components/`
- **Deploy to mainnet**: Change network settings (⚠️ be very careful!)

## 📁 Project Structure

```ascii
├── anchor/                        # Solana program and deployment scripts
│   ├── programs/solana-distributor/ # The airdrop Solana program
│   ├── scripts/                   # Deployment and management scripts
│   │   ├── deploy-setup.ts        # 🌟 Main setup script
│   │   ├── initialize-airdrop.ts  # Initialize on-chain airdrop state
│   │   ├── claim-airdrop.ts       # Command-line claiming tool
│   │   └── generate-merkle-tree.ts # Merkle tree utilities
│   ├── recipients.json            # Generated recipient data
│   └── test-wallets.json          # Generated test wallet info
├── src/
│   ├── app/                       # Next.js app router
│   ├── components/
│   │   └── claim-button.tsx       # Main claiming interface
│   └── lib/
│       ├── airdrop-client.ts      # Core claiming logic
│       ├── recipients.ts          # 🔄 Auto-updated recipient data
│       ├── config.ts              # Configuration management
│       └── merkle-tree.ts         # Merkle tree & proof generation
└── .env.local                     # 🔄 Auto-updated environment config
```

## 🐛 Troubleshooting Common Issues

### "My frontend shows errors after deployment"
- **Restart your dev server** - New environment variables need to be loaded
- **Check `.env.local`** - Ensure `NEXT_PUBLIC_PROGRAM_ID` is set correctly
- **Clear browser cache** - Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### "Deploy setup fails with permission errors"
- **Check Solana config**: `solana config get`
- **Verify keypair access**: Make sure you can access your default keypair
- **Try different RPC**: Sometimes devnet RPC is overloaded

### "Anchor commands fail"
- **Check Anchor version**: `anchor --version` (needs 0.31.1+)
- **Verify in anchor directory**: Run commands from `./anchor/` folder
- **Clean and rebuild**: `anchor clean && anchor build`

### "Test wallets have no SOL"
- **Devnet faucet limits**: You can only request SOL every few seconds
- **Manual funding**: Use `solana airdrop` command directly
- **Alternative faucets**: Try https://faucet.solana.com

### "Transaction fees too high"
- **You're on mainnet**: Make sure you're on devnet (`NEXT_PUBLIC_SOLANA_NETWORK=devnet`)
- **Check network in config**: Verify all configurations point to devnet

## 🚀 Going to Production

1. **Deploy to mainnet**: Change network configurations (⚠️ expensive!)
2. **Update recipient data**: Replace test wallets with real recipient addresses
3. **Secure private keys**: Use proper key management (never in environment files)
4. **Test thoroughly**: Test on devnet first, then mainnet with small amounts
5. **Monitor costs**: Solana mainnet transactions cost real money

## 💡 Tips for Success

- **Start simple**: Use the exact setup process above before customizing
- **Test everything**: Claim airdrops on devnet before going live
- **Keep backups**: Save your deploy wallet and program keypairs safely
- **Monitor resources**: Keep an eye on SOL balances for deployment and fees
- **Read error messages**: Most errors have clear solutions in the logs

## 🤝 Contributing

Found an issue or want to improve the template?

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Submit a pull request with a clear description

## 📄 License

This project is open source and available under the MIT License.

---

**Need help?** Check the error messages carefully - they often contain the exact solution! If you're stuck, the most common issues are covered in the troubleshooting section above.

Built with ❤️ using Next.js, TypeScript, Anchor, and Solana
