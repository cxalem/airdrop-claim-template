import * as fs from "fs";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

// Extract private key from keypair file
function extractPrivateKey(keypairFile: string): {
  publicKey: string;
  privateKeyHex: string;
  privateKeyBase58: string;
  privateKeyArray: number[];
  secretKeyHex: string;
  secretKeyBase58: string;
  secretKeyArray: number[];
} {
  try {
    // Read the keypair file
    const keypairData = JSON.parse(fs.readFileSync(keypairFile, "utf8"));

    // Create Keypair object from the data
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

    // Extract private key (first 32 bytes of the secret key)
    const secretKey = keypair.secretKey;
    const privateKey = secretKey.slice(0, 32);

    return {
      publicKey: keypair.publicKey.toString(),
      privateKeyHex: Buffer.from(privateKey).toString("hex"),
      privateKeyBase58: bs58.encode(privateKey),
      privateKeyArray: Array.from(privateKey),
      secretKeyHex: Buffer.from(secretKey).toString("hex"),
      secretKeyBase58: bs58.encode(secretKey),
      secretKeyArray: Array.from(secretKey),
    };
  } catch (error) {
    console.error(`Error reading keypair file ${keypairFile}:`, error);
    throw error;
  }
}

// Extract keys for all test wallets
function extractAllTestWallets() {
  const wallets = [
    { name: "test-wallet-1", file: "test-wallet-1.json" },
    { name: "test-wallet-2", file: "test-wallet-2.json" },
    { name: "test-wallet-3", file: "test-wallet-3.json" },
  ];

  console.log("🔑 Test Wallet Private Keys\n");
  console.log(
    "⚠️  WARNING: Keep these private keys secure! Never share them publicly.\n"
  );

  wallets.forEach((wallet) => {
    try {
      if (fs.existsSync(wallet.file)) {
        const keys = extractPrivateKey(wallet.file);

        console.log(`=== ${wallet.name.toUpperCase()} ===`);
        console.log(`Public Key: ${keys.publicKey}`);
        console.log(`Private Key (32 bytes):`);
        console.log(`  Hex: ${keys.privateKeyHex}`);
        console.log(`  Base58: ${keys.privateKeyBase58}`);
        console.log(`Secret Key (64 bytes - USE THIS FOR WALLETS):`);
        console.log(`  Hex: ${keys.secretKeyHex}`);
        console.log(`  Base58: ${keys.secretKeyBase58}`);
        console.log(`  Array: [${keys.secretKeyArray.join(", ")}]`);
        console.log("");
      } else {
        console.log(`❌ ${wallet.file} not found`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${wallet.name}:`, error);
    }
  });
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Extract all test wallets
    extractAllTestWallets();
  } else {
    // Extract specific wallet
    const keypairFile = args[0];
    try {
      const keys = extractPrivateKey(keypairFile);
      console.log("🔑 Key Extraction\n");
      console.log(`File: ${keypairFile}`);
      console.log(`Public Key: ${keys.publicKey}`);
      console.log(`Private Key (32 bytes): ${keys.privateKeyBase58}`);
      console.log(`Secret Key (64 bytes - USE THIS): ${keys.secretKeyBase58}`);
    } catch (error) {
      console.error("❌ Error:", error);
      process.exit(1);
    }
  }
}

export { extractPrivateKey };
