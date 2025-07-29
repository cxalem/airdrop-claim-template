import * as fs from "fs";
import * as path from "path";
import { PublicKey } from "@solana/web3.js";

// Interface for recipient data
interface Recipient {
  publicKey: string;
  amount: string;
  index: number;
  description?: string;
}

// Interface for the recipients file
interface RecipientsFile {
  airdropId: string;
  description: string;
  merkleRoot: string;
  totalAmount: string;
  network: string;
  programId: string;
  recipients: Recipient[];
  metadata: {
    createdAt: string;
    version: string;
    algorithm: string;
    leafFormat: string;
  };
}

// Load recipients from JSON file
export function loadRecipients(
  filePath: string = "recipients.json"
): RecipientsFile {
  try {
    const fullPath = path.resolve(filePath);
    const fileContent = fs.readFileSync(fullPath, "utf8");
    const data = JSON.parse(fileContent) as RecipientsFile;

    console.log(`Loaded ${data.recipients.length} recipients from ${filePath}`);
    console.log(`Total amount: ${parseInt(data.totalAmount) / 1e9} SOL`);

    return data;
  } catch (error) {
    console.error(`Error loading recipients from ${filePath}:`, error);
    throw error;
  }
}

// Convert recipients to the format expected by the Merkle tree
export function convertRecipientsForMerkleTree(
  recipients: Recipient[]
): Array<{ recipient: PublicKey; amount: number }> {
  return recipients.map((r) => ({
    recipient: new PublicKey(r.publicKey),
    amount: parseInt(r.amount),
  }));
}

// Find a recipient by public key
export function findRecipientByPublicKey(
  recipients: Recipient[],
  publicKey: string
): Recipient | undefined {
  return recipients.find((r) => r.publicKey === publicKey);
}

// Validate recipients file
export function validateRecipientsFile(data: RecipientsFile): boolean {
  // Check required fields
  if (!data.airdropId || !data.recipients || !Array.isArray(data.recipients)) {
    console.error("Invalid recipients file: missing required fields");
    return false;
  }

  // Validate each recipient
  for (let i = 0; i < data.recipients.length; i++) {
    const recipient = data.recipients[i];

    // Check public key format
    try {
      new PublicKey(recipient.publicKey);
    } catch {
      console.error(`Invalid public key at index ${i}: ${recipient.publicKey}`);
      return false;
    }

    // Check amount is a valid number
    const amount = parseInt(recipient.amount);
    if (isNaN(amount) || amount <= 0) {
      console.error(`Invalid amount at index ${i}: ${recipient.amount}`);
      return false;
    }

    // Check index matches array position
    if (recipient.index !== i) {
      console.error(
        `Index mismatch at position ${i}: expected ${i}, got ${recipient.index}`
      );
      return false;
    }
  }

  // Validate total amount matches sum of individual amounts
  const calculatedTotal = data.recipients.reduce(
    (sum, r) => sum + parseInt(r.amount),
    0
  );
  const fileTotal = parseInt(data.totalAmount);

  if (calculatedTotal !== fileTotal) {
    console.error(
      `Total amount mismatch: calculated ${calculatedTotal}, file says ${fileTotal}`
    );
    return false;
  }

  console.log("Recipients file validation passed!");
  return true;
}

// Example usage
export function exampleUsage() {
  try {
    // Load recipients
    const recipientsData = loadRecipients();

    // Validate the file
    if (!validateRecipientsFile(recipientsData)) {
      console.error("Recipients file validation failed");
      return;
    }

    // Convert for Merkle tree
    const merkleRecipients = convertRecipientsForMerkleTree(
      recipientsData.recipients
    );

    // Find a specific recipient
    const targetPublicKey = "11111111111111111111111111111111";
    const foundRecipient = findRecipientByPublicKey(
      recipientsData.recipients,
      targetPublicKey
    );

    if (foundRecipient) {
      console.log(`Found recipient: ${foundRecipient.description}`);
      console.log(`Amount: ${parseInt(foundRecipient.amount) / 1e9} SOL`);
      console.log(`Index: ${foundRecipient.index}`);
    }

    return {
      recipientsData,
      merkleRecipients,
    };
  } catch (error) {
    console.error("Error in example usage:", error);
  }
}

// If running this script directly
if (require.main === module) {
  exampleUsage();
}
