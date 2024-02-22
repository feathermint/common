export const REDIS = {
  KEYS: {
    blockNumber: "chain:blockNumber",
    gasPrice: "chain:gasPrice",
    txjobs: "jobs:tx",
  } as const,
  CHANNELS: {
    blockNumber: "channel:blockNumber",
    gasPrice: "channel:gasPrice",
  } as const,
};
