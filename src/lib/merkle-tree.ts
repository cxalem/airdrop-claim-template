import { PublicKey } from '@solana/web3.js'
import { keccak_256 } from 'js-sha3'
import { Recipient } from '../../types'
import { RECIPIENTS_DATA, RecipientFromJson, RecipientsFile } from './recipients'

export class MerkleTree {
  public root: Uint8Array
  private leaves: Uint8Array[]
  private tree: Uint8Array[][]

  constructor(recipients: Recipient[]) {
    this.leaves = recipients.map((r) => this.createLeaf(r.recipient, r.amount))
    this.tree = [this.leaves]
    let currentLevel = this.leaves

    while (currentLevel.length > 1) {
      const nextLevel: Uint8Array[] = []

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left
        const parent = this.hashPair(left, right)
        nextLevel.push(parent)
      }

      this.tree.push(nextLevel)
      currentLevel = nextLevel
    }

    this.root = currentLevel[0]
  }

  private createLeaf(recipient: PublicKey, amount: number): Uint8Array {
    const data = Buffer.concat([
      recipient.toBuffer(),
      Buffer.from(new Uint8Array(new BigUint64Array([BigInt(amount)]).buffer)),
      Buffer.from([0]),
    ])
    return new Uint8Array(keccak_256.arrayBuffer(data))
  }

  private hashPair(left: Uint8Array, right: Uint8Array): Uint8Array {
    const data = Buffer.concat([Buffer.from(left), Buffer.from(right)])
    return new Uint8Array(keccak_256.arrayBuffer(data))
  }

  public getProof(leafIndex: number): Uint8Array[] {
    const proof: Uint8Array[] = []
    let index = leafIndex

    for (let level = 0; level < this.tree.length - 1; level++) {
      const currentLevel = this.tree[level]
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1

      if (siblingIndex < currentLevel.length) {
        proof.push(currentLevel[siblingIndex])
      }

      index = Math.floor(index / 2)
    }

    return proof
  }

  public getRootHex(): string {
    return '0x' + Buffer.from(this.root).toString('hex')
  }

  public getLeafCount(): number {
    return this.leaves.length
  }
}

export async function generateMerkleTree() {
  try {
    console.log('Generating Merkle tree...')

    const recipientsData = loadRecipients()

    const recipients: Recipient[] = recipientsData.recipients.map((r) => ({
      recipient: new PublicKey(r.publicKey),
      amount: parseInt(r.amount),
    }))

    const merkleTree = new MerkleTree(recipients)
    const merkleRootHex = merkleTree.getRootHex()

    console.log(`✅ Merkle tree generated!`)
    console.log(`   Leaves: ${merkleTree.getLeafCount()}`)
    console.log(`   Root: ${merkleRootHex}`)

    return {
      merkleTree,
      merkleRoot: merkleRootHex,
      recipients,
    }
  } catch (error) {
    console.error('Error generating merkle tree:', error)
    throw error
  }
}

export function generateProofForRecipient(recipientPublicKey: string): {
  proof: number[][]
  leafIndex: number
  amount: string
  recipient: string
} | null {
  try {
    console.log(`Generating proof for ${recipientPublicKey}...`)

    // Load recipients
    const recipientsData = loadRecipients()

    // Find the recipient
    const recipientInfo = recipientsData.recipients.find((r) => r.publicKey === recipientPublicKey)
    if (!recipientInfo) {
      console.error(`Recipient ${recipientPublicKey} not found in recipients list`)
      return null
    }

    // Convert to format expected by merkle tree
    const recipients: Recipient[] = recipientsData.recipients.map((r) => ({
      recipient: new PublicKey(r.publicKey),
      amount: parseInt(r.amount),
    }))

    // Generate merkle tree
    const merkleTree = new MerkleTree(recipients)

    // Generate proof for this recipient
    const leafIndex = recipientInfo.index
    const proof = merkleTree.getProof(leafIndex)

    // Convert proof to format expected by the program (Vec<[u8; 32]>)
    const proofArray = proof.map((p) => Array.from(p))

    console.log(`Proof generated for ${recipientInfo.description || 'recipient'}:`)
    console.log(`   Leaf Index: ${leafIndex}`)
    console.log(`   Amount: ${recipientInfo.amount} lamports (${parseInt(recipientInfo.amount) / 1e9} SOL)`)
    console.log(`   Proof Length: ${proof.length} hashes`)
    console.log(`   Proof: [${proofArray.map((p) => `[${p.join(', ')}]`).join(', ')}]`)

    return {
      proof: proofArray,
      leafIndex,
      amount: recipientInfo.amount,
      recipient: recipientPublicKey,
    }
  } catch (error) {
    console.error('Error generating proof:', error)
    return null
  }
}

// Generate proofs for all recipients
export function generateAllProofs() {
  try {
    console.log('Generating proofs for all recipients...')

    const recipientsData = loadRecipients()
    const proofs: { [key: string]: any } = {}

    for (const recipient of recipientsData.recipients) {
      const proof = generateProofForRecipient(recipient.publicKey)
      if (proof) {
        proofs[recipient.publicKey] = proof
      }
    }

    console.log(`Generated ${Object.keys(proofs).length} proofs`)
    return proofs
  } catch (error) {
    console.error('Error generating proofs:', error)
    throw error
  }
}

export function loadRecipients(): RecipientsFile {
  try {
    console.log(`Loaded ${RECIPIENTS_DATA.recipients.length} recipients from recipients.ts`)
    console.log(`Total amount: ${parseInt(RECIPIENTS_DATA.totalAmount) / 1e9} SOL`)

    return RECIPIENTS_DATA
  } catch (error) {
    console.error('Error loading recipients:', error)
    throw error
  }
}
