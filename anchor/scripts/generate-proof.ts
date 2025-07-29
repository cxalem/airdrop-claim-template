import { PublicKey } from "@solana/web3.js";
import { keccak_256 } from "js-sha3";
import { loadRecipients } from "./load-recipients";

interface Recipient {
  recipient: PublicKey;
  amount: number;
}

class SimpleMerkleTree {
  public root: Uint8Array;
  private leaves: Uint8Array[];
  private tree: Uint8Array[][];

  constructor(recipients: Recipient[]) {
    // Create leaves
    this.leaves = recipients.map((r) => this.createLeaf(r.recipient, r.amount));

    // Build tree
    this.tree = [this.leaves];
    let currentLevel = this.leaves;

    while (currentLevel.length > 1) {
      const nextLevel: Uint8Array[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const parent = this.hashPair(left, right);
        nextLevel.push(parent);
      }

      this.tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    this.root = currentLevel[0];
  }

  private createLeaf(recipient: PublicKey, amount: number): Uint8Array {
    const data = Buffer.concat([
      recipient.toBuffer(),
      Buffer.from(new Uint8Array(new BigUint64Array([BigInt(amount)]).buffer)),
      Buffer.from([0]), // isClaimed = false
    ]);
    return new Uint8Array(keccak_256.arrayBuffer(data));
  }

  private hashPair(left: Uint8Array, right: Uint8Array): Uint8Array {
    const data = Buffer.concat([Buffer.from(left), Buffer.from(right)]);
    return new Uint8Array(keccak_256.arrayBuffer(data));
  }

  public getProof(leafIndex: number): Uint8Array[] {
    const proof: Uint8Array[] = [];
    let index = leafIndex;

    for (let level = 0; level < this.tree.length - 1; level++) {
      const currentLevel = this.tree[level];
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;

      if (siblingIndex < currentLevel.length) {
        proof.push(currentLevel[siblingIndex]);
      }

      index = Math.floor(index / 2);
    }

    return proof;
  }
}

// Generate proof for a specific recipient
export function generateProofForRecipient(
  recipientPublicKey: string,
  recipientsFile: string = "recipients.json"
): {
  proof: number[][];
  leafIndex: number;
  amount: string;
  recipient: string;
} | null {
  try {
    console.log(`🔍 Generating proof for ${recipientPublicKey}...`);

    // Load recipients
    const recipientsData = loadRecipients(recipientsFile);

    // Find the recipient
    const recipientInfo = recipientsData.recipients.find(
      (r) => r.publicKey === recipientPublicKey
    );
    if (!recipientInfo) {
      console.error(
        `❌ Recipient ${recipientPublicKey} not found in recipients list`
      );
      return null;
    }

    // Convert to format expected by merkle tree
    const recipients: Recipient[] = recipientsData.recipients.map((r) => ({
      recipient: new PublicKey(r.publicKey),
      amount: parseInt(r.amount),
    }));

    // Generate merkle tree
    const merkleTree = new SimpleMerkleTree(recipients);

    // Generate proof for this recipient
    const leafIndex = recipientInfo.index;
    const proof = merkleTree.getProof(leafIndex);

    // Convert proof to format expected by the program (Vec<[u8; 32]>)
    const proofArray = proof.map((p) => Array.from(p));

    console.log(
      `✅ Proof generated for ${recipientInfo.description || "recipient"}:`
    );
    console.log(`   Leaf Index: ${leafIndex}`);
    console.log(
      `   Amount: ${recipientInfo.amount} lamports (${
        parseInt(recipientInfo.amount) / 1e9
      } SOL)`
    );
    console.log(`   Proof Length: ${proof.length} hashes`);
    console.log(
      `   Proof: [${proofArray.map((p) => `[${p.join(", ")}]`).join(", ")}]`
    );

    return {
      proof: proofArray,
      leafIndex,
      amount: recipientInfo.amount,
      recipient: recipientPublicKey,
    };
  } catch (error) {
    console.error("❌ Error generating proof:", error);
    return null;
  }
}

// Generate proofs for all recipients
export function generateAllProofs(recipientsFile: string = "recipients.json") {
  try {
    console.log("🔍 Generating proofs for all recipients...");

    const recipientsData = loadRecipients(recipientsFile);
    const proofs: { [key: string]: any } = {};

    for (const recipient of recipientsData.recipients) {
      const proof = generateProofForRecipient(
        recipient.publicKey,
        recipientsFile
      );
      if (proof) {
        proofs[recipient.publicKey] = proof;
      }
    }

    console.log(`✅ Generated ${Object.keys(proofs).length} proofs`);
    return proofs;
  } catch (error) {
    console.error("❌ Error generating proofs:", error);
    throw error;
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("📋 Usage:");
    console.log(
      "  Generate proof for specific recipient: ts-node scripts/generate-proof.ts <public_key>"
    );
    console.log(
      "  Generate proofs for all recipients: ts-node scripts/generate-proof.ts --all"
    );
    console.log("");
    console.log("📝 Examples:");
    console.log(
      "  ts-node scripts/generate-proof.ts HcCcKydEcuGMbBso7jciQrFpBw1XQrKHKFckGSAxXXQG"
    );
    console.log("  ts-node scripts/generate-proof.ts --all");
    process.exit(1);
  }

  if (args[0] === "--all") {
    generateAllProofs();
  } else {
    const publicKey = args[0];
    generateProofForRecipient(publicKey);
  }
}
