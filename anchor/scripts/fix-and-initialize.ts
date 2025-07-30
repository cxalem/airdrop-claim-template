#!/usr/bin/env ts-node

import { execSync } from "child_process";
import * as fs from "fs";

console.log("🔧 Solana Airdrop Auto-Fixer & Initializer");
console.log("==========================================\n");

// Auto-fix functionality
async function autoFixCommonIssues(): Promise<boolean> {
  console.log("🔍 Checking for common issues and auto-fixing...");
  
  let fixesApplied = false;
  
  try {
    // Check 1: Missing TypeScript types
    const typesPath = "target/types/solana_distributor.ts";
    if (!fs.existsSync(typesPath)) {
      console.log("⚠️  Missing TypeScript types, generating...");
      
      // First ensure IDL exists
      const idlPath = "target/idl/solana_distributor.json";
      if (!fs.existsSync(idlPath)) {
        console.log("📋 IDL missing, building first...");
        execSync("anchor build", { stdio: "inherit" });
      }
      
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
    
    console.log(`📋 Declared program ID: ${declaredId || 'Not found'}`);
    console.log(`📍 Deployed program ID: ${deployedId || 'Not found'}`);
    
    if (declaredId && deployedId && declaredId !== deployedId) {
      console.log("⚠️  Program ID mismatch detected!");
      console.log("🔄 Redeploying program to fix mismatch...");
      
      execSync("anchor build", { stdio: "inherit" });
      execSync("anchor deploy", { stdio: "inherit" });
      console.log("✅ Program redeployed successfully");
      fixesApplied = true;
    } else if (!deployedId) {
      console.log("⚠️  Program not deployed yet, deploying...");
      execSync("anchor build", { stdio: "inherit" });
      execSync("anchor deploy", { stdio: "inherit" });
      console.log("✅ Program deployed successfully");
      fixesApplied = true;
    }
    
    // Check 4: Missing target directories
    const targetDirs = ["target", "target/idl", "target/types", "target/deploy"];
    for (const dir of targetDirs) {
      if (!fs.existsSync(dir)) {
        console.log(`⚠️  Missing directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
        fixesApplied = true;
      }
    }
    
    if (fixesApplied) {
      console.log("\n✅ Auto-fixes applied successfully!");
      return true;
    } else {
      console.log("\n✅ No issues detected, everything looks good!");
      return false;
    }
    
  } catch (error) {
    console.error("❌ Error during auto-fix:", error);
    console.log("\n💡 You may need to manually run:");
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
    const keypairPath = "target/deploy/solana_distributor-keypair.json";
    if (!fs.existsSync(keypairPath)) {
      return null;
    }
    const output = execSync(`solana address -k ${keypairPath}`, { encoding: "utf8" });
    return output.trim();
  } catch {
    return null;
  }
}

async function runInitializeAirdrop(): Promise<void> {
  console.log("\n🚀 Running airdrop initialization...");
  
  try {
    // Set required environment variables if not set
    if (!process.env.ANCHOR_PROVIDER_URL) {
      process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
      console.log("📡 Using devnet endpoint");
    }
    
    if (!process.env.ANCHOR_WALLET) {
      process.env.ANCHOR_WALLET = "deploy-wallet.json";
      console.log("👛 Using deploy-wallet.json");
    }
    
    execSync("npx ts-node scripts/initialize-airdrop.ts", { 
      stdio: "inherit",
      env: process.env
    });
    
    console.log("\n🎉 Airdrop initialization completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Airdrop initialization failed:", error);
    console.log("\n🔧 Troubleshooting tips:");
    console.log("1. Ensure your deploy wallet has sufficient SOL");
    console.log("2. Check network connectivity");
    console.log("3. Verify recipients.json is properly formatted");
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    // Step 1: Auto-fix common issues
    await autoFixCommonIssues();
    
    // Step 2: Run airdrop initialization
    await runInitializeAirdrop();
    
    console.log("\n" + "=".repeat(50));
    console.log("✅ SUCCESS! Everything completed successfully!");
    console.log("🎯 Your airdrop is now ready for claims!");
    console.log("=".repeat(50));
    
  } catch {
    console.error("\n" + "=".repeat(50));
    console.error("❌ FAILED! Process terminated with error");
    console.error("=".repeat(50));
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { autoFixCommonIssues, runInitializeAirdrop }; 