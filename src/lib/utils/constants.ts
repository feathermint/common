export const REDIS = {
  KEYS: { txjobs: "jobs:tx" } as const,
  CHANNELS: {
    blockNumber: "channel:blockNumber",
    gasPrice: "channel:gasPrice",
  } as const,
};
