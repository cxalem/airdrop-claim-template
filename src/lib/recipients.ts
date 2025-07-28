interface RecipientFromJson {
  publicKey: string
  amount: string
  index: number
  description: string
}

interface RecipientsFile {
  airdropId: string
  description: string
  merkleRoot: string
  totalAmount: string
  network: string
  programId: string
  recipients: RecipientFromJson[]
  metadata: {
    createdAt: string
    version: string
    algorithm: string
    leafFormat: string
  }
}

export const RECIPIENTS_DATA: RecipientsFile = {
  airdropId: 'solana-distributor-airdrop-2024',
  description: 'Sample airdrop for testing purposes',
  merkleRoot: '0x76fa4794dd39f41fa5a231ade7440c1e1caf466688aa2c89ec085ae39857a756',
  totalAmount: '300000000',
  network: 'devnet',
  programId: 'ErbDoJTnJyG6EBXHeFochTsHJhB3Jfjc3MF1L9aNip3y',
  recipients: [
    {
      publicKey: 'Hb6dzd4pYxmFYKkJDWuhzBEUkkaE93sFcvXYtriTkmw9',
      amount: '75000000',
      index: 0,
      description: 'Original test recipient'
    },
    {
      publicKey: 'HcCcKydEcuGMbBso7jciQrFpBw1XQrKHKFckGSAxXXQG',
      amount: '75000000',
      index: 1,
      description: 'Test wallet 1 - Funded with 2 SOL'
    },
    {
      publicKey: 'H3LgCdztZyfE5zch3YAVXYj5D7bf19fR4QTbPtCho6Lu',
      amount: '75000000',
      index: 2,
      description: 'Test wallet 2 - Funded with 2 SOL'
    },
    {
      publicKey: '8aRyik34YsWL2gz2AYnBHoaxju52b3DHvFyMTCpddh4i',
      amount: '75000000',
      index: 3,
      description: 'Test wallet 3 - Unfunded (rate limited)'
    }
  ],
  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    version: '1.0.0',
    algorithm: 'keccak256',
    leafFormat: 'recipient_pubkey(32) + amount(8) + is_claimed(1)'
  }
}

export type { RecipientFromJson, RecipientsFile } 