type ObjectId = import("mongodb").ObjectId;

export type Resource = "token" | "token pool" | "transfer" | "user" | "status";

export interface User {
  account: string;
  profile: {
    name: string | null;
    avatar: string | null;
    banner: string | null;
  };
  flags: number;
  active: boolean;
  verified: boolean;
}

export interface Token {
  userId: ObjectId;
  poolId: ObjectId;
  name: string;
  description: string;
  balance: number;
  supply: number;
  transferred: number;
  txHash: string | null;
  status: TokenStatus;
  // Arbitrary properties. Values may be strings, numbers, object or arrays.
  // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1155.md#erc-1155-metadata-uri-json-schema
  // properties: unknown;
}

export interface TokenMetadata {
  name: string;
  decimals: 0;
  description: string;
  image: string;
}

export interface LiquidityTokenMetadata {
  name: string;
  decimals: 18;
  description: string;
  image: string;
}

export interface TokenPool {
  userId: ObjectId;
  heroTokenId: ObjectId | null;
  name: string;
  description: string;
  count: number;
  balances: { [tokenId: string]: number };
  aggregate: {
    balance: number;
    supply: number;
    transferred: number;
  };
  pending: ObjectId[];
}

export interface Transfer {
  userId: ObjectId;
  poolId: ObjectId;
  txHash: string;
  recipient: string;
  token: {
    ids: ObjectId[];
    amounts: number[];
  };
}

export type TransactionJob = TokenCreationJobV1 | TransferJobV1;

interface BaseTransactionJob {
  userId: ObjectId;
  signerAddress?: string;
  nonce?: number;
  maxPriorityFeePerGas?: number;
  txHash?: string;
}

export interface TokenCreationJobV1 extends BaseTransactionJob {
  type: "TokenCreationJob";
  v: 1;
  token: {
    id: ObjectId;
    poolId: ObjectId;
    supply: number;
  };
}

export interface TransferJobV1 extends BaseTransactionJob {
  type: "TransferJob";
  v: 1;
  transfer: {
    id: ObjectId;
    poolId: ObjectId;
    balances: { [tokenId: string]: number };
    recipient: string;
  };
}

export interface Transaction {
  accessList: string[];
  blockHash: string;
  blockNumber: string;
  chainId: string;
  from: string;
  gas: string;
  gasPrice: string;
  hash: string;
  input: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  nonce: string;
  r: string;
  s: string;
  to: string;
  transactionIndex: string;
  type: string;
  v: string;
  value: string;
}

export interface TransactionReceipt {
  transactionHash: string;
  transactionIndex: string;
  blockHash: string;
  blockNumber: string;
  from: string;
  to: string | null;
  cumulativeGasUsed: string;
  gasUsed: string;
  contractAddress: string | null;
  logs: TransactionLog[];
  logsBloom: string;
  type: string;
  status: string;
  effectiveGasPrice: string;
}

export interface TransactionLog {
  removed: boolean;
  logIndex: string;
  transactionIndex: string;
  transactionHash: string;
  blockHash: string;
  blockNumber: string;
  address: string;
  data: string;
  topics: string[];
}

export interface FeeHistory {
  oldestBlock: string;
  baseFeePerGas: string[];
  gasUsedRatio: number[];
  reward: string[][];
}

export interface GasPrice {
  baseFeePerGas: number;
  maxPriorityFeePerGas: number;
}

export enum JobStatus {
  Unknown = 0,
  Queued = 1,
  InProgress = 2,
  Success = 3,
  Failure = 4,
}

export enum TokenStatus {
  Default = 0,
  HasImage = 1,
  HasTokenMetadata = 1 << 1,
  HasLiquidityTokenMetadata = 1 << 2,
  IsMined = 1 << 3,
}
