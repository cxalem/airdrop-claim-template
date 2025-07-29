import * as fs from "fs";
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

  public getRootHex(): string {
    return "0x" + Buffer.from(this.root).toString("hex");
  }

  public getLeafCount(): number {
    return this.leaves.length;
  }
}

// Generate merkle tree and update recipients.json
export async function generateMerkleTree(
  recipientsFile: string = "recipients.json"
) {
  try {
    console.log("🌳 Generating Merkle tree...");

    // Load recipients
    const recipientsData = loadRecipients(recipientsFile);

    // Convert to format expected by merkle tree
    const recipients: Recipient[] = recipientsData.recipients.map((r) => ({
      recipient: new PublicKey(r.publicKey),
      amount: parseInt(r.amount),
    }));

    // Generate merkle tree
    const merkleTree = new SimpleMerkleTree(recipients);
    const merkleRootHex = merkleTree.getRootHex();

    console.log(`✅ Merkle tree generated!`);
    console.log(`   Leaves: ${merkleTree.getLeafCount()}`);
    console.log(`   Root: ${merkleRootHex}`);

    // Update recipients.json with the computed root
    recipientsData.merkleRoot = merkleRootHex;
    recipientsData.metadata.algorithm = "keccak256";
    recipientsData.metadata.leafFormat =
      "recipient_pubkey(32) + amount(8) + is_claimed(1)";

    // Write back to file
    fs.writeFileSync(recipientsFile, JSON.stringify(recipientsData, null, 2));
    console.log(`✅ Updated ${recipientsFile} with merkle root`);

    return {
      merkleTree,
      merkleRoot: merkleRootHex,
      recipients,
    };
  } catch (error) {
    console.error("❌ Error generating merkle tree:", error);
    throw error;
  }
}

// If running this script directly
if (require.main === module) {
  generateMerkleTree()
    .then(() => {
      console.log("🎉 Merkle tree generation completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Failed:", error);
      process.exit(1);
    });
}
