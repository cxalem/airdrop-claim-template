import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaDistributor } from "../target/types/solana_distributor";
import { PublicKey } from "@solana/web3.js";
import { loadRecipients } from "./load-recipients";

// Initialize the airdrop with recipients data
export async function initializeAirdrop(
  recipientsFile: string = "recipients.json"
) {
  try {
    console.log("🚀 Initializing airdrop...");

    // Load recipients data
    const recipientsData = loadRecipients(recipientsFile);
    console.log(`📋 Loaded ${recipientsData.recipients.length} recipients`);
    console.log(
      `💰 Total amount: ${parseInt(recipientsData.totalAmount) / 1e9} SOL`
    );
    console.log(`🌳 Merkle root: ${recipientsData.merkleRoot}`);

    // Set up Anchor
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace
      .SolanaDistributor as Program<SolanaDistributor>;
    console.log(`📍 Program ID: ${program.programId.toString()}`);
    console.log(`👤 Authority: ${provider.wallet.publicKey.toString()}`);

    // Convert hex merkle root to bytes
    const merkleRootHex = recipientsData.merkleRoot.replace("0x", "");
    const merkleRootBytes = Buffer.from(merkleRootHex, "hex");
    console.log(
      `🔢 Merkle root bytes: [${Array.from(merkleRootBytes).join(", ")}]`
    );

    // Calculate airdrop state PDA
    const [airdropStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merkle_tree")],
      program.programId
    );
    console.log(`🏛️  Airdrop state PDA: ${airdropStatePda.toString()}`);

    // Check if already initialized
    try {
      const existingState = await program.account.airdropState.fetch(
        airdropStatePda
      );
      console.log("⚠️  Airdrop already initialized:");
      console.log(
        `   Root: 0x${Buffer.from(existingState.merkleRoot).toString("hex")}`
      );
      console.log(
        `   Amount: ${existingState.airdropAmount.toNumber() / 1e9} SOL`
      );
      console.log(
        `   Claimed: ${existingState.amountClaimed.toNumber() / 1e9} SOL`
      );
      console.log(`   Authority: ${existingState.authority.toString()}`);
      return {
        airdropStatePda,
        signature: null,
        alreadyInitialized: true,
      };
    } catch (e) {
      // Not initialized yet, continue
      console.log("✅ Airdrop not yet initialized, proceeding...");
    }

    // Initialize the airdrop
    const totalAmount = new anchor.BN(recipientsData.totalAmount);

    console.log("📤 Sending initialize transaction...");
    const tx = await program.methods
      .initializeAirdrop(Array.from(merkleRootBytes), totalAmount)
      .accounts({
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("✅ Airdrop initialized successfully!");
    console.log(`📋 Transaction signature: ${tx}`);
    console.log(
      `🔍 View on explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`
    );

    // Verify the state
    const airdropState = await program.account.airdropState.fetch(
      airdropStatePda
    );
    console.log("\n🔍 Verification:");
    console.log(
      `   Merkle root: 0x${Buffer.from(airdropState.merkleRoot).toString(
        "hex"
      )}`
    );
    console.log(`   Authority: ${airdropState.authority.toString()}`);
    console.log(
      `   Total amount: ${airdropState.airdropAmount.toNumber() / 1e9} SOL`
    );
    console.log(
      `   Amount claimed: ${airdropState.amountClaimed.toNumber() / 1e9} SOL`
    );

    return {
      airdropStatePda,
      signature: tx,
      alreadyInitialized: false,
    };
  } catch (error) {
    console.error("❌ Error initializing airdrop:", error);
    throw error;
  }
}

// If running this script directly
if (require.main === module) {
  initializeAirdrop()
    .then((result) => {
      if (result.alreadyInitialized) {
        console.log("✨ Airdrop was already initialized!");
      } else {
        console.log("🎉 Airdrop initialization completed!");
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Failed:", error);
      process.exit(1);
    });
}
