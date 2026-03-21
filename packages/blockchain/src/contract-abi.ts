export const SUBSIDY_LEDGER_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'farmerId',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'distributorId',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'itemType',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'quantity',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'DistributionRecorded',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'farmerId',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'itemType',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'itemName',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'quantity',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'unit',
        type: 'string',
      },
    ],
    name: 'recordDistribution',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
