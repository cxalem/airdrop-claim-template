import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaDistributor } from "../target/types/solana_distributor";
import { PublicKey } from "@solana/web3.js";
import { loadRecipients } from "./load-recipients";
import { execSync } from "child_process";
import * as fs from "fs";

// Auto-fix functionality
async function autoFixCommonIssues(): Promise<boolean> {
  console.log("🔧 Checking for common issues and auto-fixing...");
  
  let fixesApplied = false;
  
  try {
    // Check 1: Missing TypeScript types
    const typesPath = "target/types/solana_distributor.ts";
    if (!fs.existsSync(typesPath)) {
      console.log("⚠️  Missing TypeScript types, generating...");
      execSync("anchor idl type target/idl/solana_distributor.json -o target/types/solana_distributor.ts", { stdio: "inherit" });
      console.log("✅ TypeScript types generated");
      fixesApplied = true;
    }
    
    // Check 2: Missing IDL file
    const idlPath = "target/idl/solana_distributor.json";
    if (!fs.existsSync(idlPath)) {
      console.log("⚠️  Missing IDL file, rebuilding...");
      execSync("anchor build", { stdio: "inherit" });
      execSync("anchor idl type target/idl/solana_distributor.json -o target/types/solana_distributor.ts", { stdio: "inherit" });
      console.log("✅ IDL and types generated");
      fixesApplied = true;
    }
    
    // Check 3: Program ID consistency
    const declaredId = getDeclaredProgramId();
    const deployedId = getDeployedProgramId();
    
    if (declaredId && deployedId && declaredId !== deployedId) {
      console.log("⚠️  Program ID mismatch detected!");
      console.log(`   Declared: ${declaredId}`);
      console.log(`   Deployed: ${deployedId}`);
      console.log("🔄 Redeploying program to fix mismatch...");
      
      execSync("anchor build", { stdio: "inherit" });
      execSync("anchor deploy", { stdio: "inherit" });
      console.log("✅ Program redeployed successfully");
      fixesApplied = true;
    }
    
    if (fixesApplied) {
      console.log("✅ Auto-fixes applied successfully!");
      return true;
    } else {
      console.log("✅ No issues detected");
      return false;
    }
    
  } catch (error) {
    console.error("❌ Error during auto-fix:", error);
    console.log("💡 You may need to manually run:");
    console.log("   1. anchor clean && anchor build");
    console.log("   2. anchor deploy");
    console.log("   3. anchor idl type target/idl/solana_distributor.json -o target/types/solana_distributor.ts");
    return false;
  }
}

function getDeclaredProgramId(): string | null {
  try {
    const libContent = fs.readFileSync("programs/solana-distributor/src/lib.rs", "utf8");
    const match = libContent.match(/declare_id!\("([^"]+)"\);/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function getDeployedProgramId(): string | null {
  try {
    const output = execSync("solana address -k target/deploy/solana_distributor-keypair.json", { encoding: "utf8" });
    return output.trim();
  } catch {
    return null;
  }
}

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
    } catch {
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
    
    // Check if this is a common issue we can auto-fix
        if (error instanceof Error && (
        error.message?.includes("Cannot find module") ||
        error.message?.includes("DeclaredProgramIdMismatch") ||
        error.message?.includes("AccountNotInitialized"))) {
      
      console.log("\n🔧 Attempting to auto-fix common issues...");
      const fixesApplied = await autoFixCommonIssues();
      
      if (fixesApplied) {
        console.log("\n🔄 Retrying airdrop initialization after fixes...");
        
        // Wait a moment for changes to take effect
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Retry once
        try {
          return await initializeAirdrop(recipientsFile);
        } catch (retryError) {
          console.error("❌ Retry failed:", retryError);
          throw retryError;
        }
      }
    }
    
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
