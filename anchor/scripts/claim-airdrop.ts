import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaDistributor } from "../target/types/solana_distributor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { loadRecipients } from "./load-recipients";
import { generateProofForRecipient } from "./generate-proof";
import bs58 from "bs58";

// Claim airdrop for a specific recipient
export async function claimAirdrop(
  recipientPublicKey: string,
  secretKeyBase58: string,
  recipientsFile: string = "recipients.json"
) {
  try {
    console.log(`🎯 Claiming airdrop for ${recipientPublicKey}...`);

    // Set up Anchor
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace
      .SolanaDistributor as Program<SolanaDistributor>;
    console.log(`📍 Program ID: ${program.programId.toString()}`);

    // Load recipients data and generate proof
    const recipientsData = loadRecipients(recipientsFile);
    const proofData = generateProofForRecipient(
      recipientPublicKey,
      recipientsFile
    );

    if (!proofData) {
      throw new Error(
        `Recipient ${recipientPublicKey} not found or proof generation failed`
      );
    }

    console.log(`💰 Claiming ${parseInt(proofData.amount) / 1e9} SOL`);
    console.log(`📊 Leaf Index: ${proofData.leafIndex}`);
    console.log(`🔍 Proof Length: ${proofData.proof.length} hashes`);

    // Create keypair from secret key
    const secretKey = bs58.decode(secretKeyBase58);
    const claimant = Keypair.fromSecretKey(secretKey);

    if (claimant.publicKey.toString() !== recipientPublicKey) {
      throw new Error("Secret key doesn't match the recipient public key");
    }

    // Calculate PDAs
    const [airdropStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merkle_tree")],
      program.programId
    );

    const [userClaimPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("claim"),
        airdropStatePda.toBuffer(),
        claimant.publicKey.toBuffer(),
      ],
      program.programId
    );

    console.log(`🏛️  Airdrop State PDA: ${airdropStatePda.toString()}`);
    console.log(`👤 User Claim PDA: ${userClaimPda.toString()}`);

    // Check if already claimed
    try {
      await program.account.claimStatus.fetch(userClaimPda);
      console.log("❌ This recipient has already claimed their airdrop!");
      return {
        success: false,
        error: "Already claimed",
        signature: null,
      };
    } catch (e) {
      // Not claimed yet, continue
      console.log("✅ Recipient hasn't claimed yet, proceeding...");
    }

    // Convert proof format - program expects Vec<[u8; 32]>
    const proofBytes = proofData.proof.map((p) =>
      Array.from(new Uint8Array(p))
    );

    console.log("📤 Sending claim transaction...");
    const tx = await program.methods
      .claimAirdrop(
        new anchor.BN(proofData.amount),
        proofBytes,
        new anchor.BN(proofData.leafIndex)
      )
      .accounts({
        signer: claimant.publicKey,
      })
      .signers([claimant])
      .rpc();

    console.log("✅ Airdrop claimed successfully!");
    console.log(`📋 Transaction signature: ${tx}`);
    console.log(
      `🔍 View on explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`
    );

    return {
      success: true,
      signature: tx,
      amount: proofData.amount,
      recipient: recipientPublicKey,
    };
  } catch (error) {
    console.error("❌ Error claiming airdrop:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      signature: null,
    };
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("📋 Usage:");
    console.log(
      "  npx ts-node scripts/claim-airdrop.ts <recipient_public_key> <secret_key_base58>"
    );
    console.log("");
    console.log("📝 Example:");
    console.log(
      "  npx ts-node scripts/claim-airdrop.ts HcCcKydEcuGMbBso7jciQrFpBw1XQrKHKFckGSAxXXQG CmRj15BFF..."
    );
    console.log("");
    console.log(
      "💡 Tip: Use scripts/extract-private-keys.ts to get secret keys from test wallets"
    );
    process.exit(1);
  }

  const [recipientPublicKey, secretKeyBase58] = args;

  // Set environment variables if not already set
  if (!process.env.ANCHOR_PROVIDER_URL) {
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
  }
  if (!process.env.ANCHOR_WALLET) {
    process.env.ANCHOR_WALLET = "test-wallet-1.json";
  }

  claimAirdrop(recipientPublicKey, secretKeyBase58)
    .then((result) => {
      if (result.success) {
        console.log("🎉 Claim completed successfully!");
      } else {
        console.log("💥 Claim failed:", result.error);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Failed:", error);
      process.exit(1);
    });
}
