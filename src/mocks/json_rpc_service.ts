/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as c from "..";
import type { JsonRpcService } from "../lib/json_rpc_service";

export class MockJsonRpcService implements Required<JsonRpcService> {
  constructor(public rpcUrl = "http://127.0.0.1:8545") {}

  getChainId(): Promise<c.JsonRpcResponse<string>> {
    throw new Error("Method not implemented.");
  }

  getBlockNumber(): Promise<c.JsonRpcResponse<string>> {
    throw new Error("Method not implemented.");
  }

  getTransactionCount(
    account: string,
    headers?: HeadersInit | undefined,
  ): Promise<c.JsonRpcResponse<string>> {
    throw new Error("Method not implemented.");
  }

  getFeeHistory(
    params: [
      blockCount: string,
      newestBlock: string,
      rewardPercentiles: number[],
    ],
    headers?: HeadersInit | undefined,
  ): Promise<c.JsonRpcResponse<c.FeeHistory>> {
    throw new Error("Method not implemented.");
  }

  getLogs(
    filter: {
      address?: string[] | undefined;
      fromBlock?: string | undefined;
      toBlock?: string | undefined;
      topics?: string[] | undefined;
      blockHash?: string | undefined;
    },
    headers?: HeadersInit | undefined,
  ): Promise<c.JsonRpcResponse<c.TransactionLog[]>> {
    throw new Error("Method not implemented.");
  }

  sendRawTransaction(
    signedTxArray: string[],
    headers?: HeadersInit | undefined,
  ): Promise<c.JsonRpcResponse<string>[]> {
    throw new Error("Method not implemented.");
  }

  getTransactionReceipt(
    txHashArray: string[],
    headers?: HeadersInit | undefined,
  ): Promise<c.JsonRpcResponse<c.TransactionReceipt | null>[]> {
    throw new Error("Method not implemented.");
  }

  getTransactionByHash(
    txHashArray: string[],
    headers?: HeadersInit | undefined,
  ): Promise<c.JsonRpcResponse<c.Transaction | null>[]> {
    throw new Error("Method not implemented.");
  }

  batch(
    data: string[],
    method: "eth_sendRawTransaction" | "eth_getTransactionReceipt",
  ): string {
    throw new Error("Method not implemented.");
  }

  fetch(body: string, headers?: HeadersInit | undefined): Promise<unknown> {
    throw new Error("Method not implemented.");
  }

  isJsonRpcError(
    res: c.JsonRpcResponse<unknown>,
  ): res is c.JsonRpcResponseWithError {
    throw new Error("Method not implemented.");
  }
}
