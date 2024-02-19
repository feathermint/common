import type * as c from "..";

const defaultHeaders = { "Content-Type": "application/json" };

export class JsonRpcService {
  constructor(public readonly rpcUrl = "http://127.0.0.1:8545") {
    this.rpcUrl = rpcUrl;
  }

  getChainId() {
    return this.fetch(
      '{"jsonrpc":"2.0","method":"eth_chainId","params": [],"id":1}',
    ) as Promise<c.JsonRpcResponse>;
  }

  getBlockNumber() {
    return this.fetch(
      '{"jsonrpc":"2.0","method":"eth_blockNumber","params": [],"id":1}',
    ) as Promise<c.JsonRpcResponse>;
  }

  getTransactionCount(account: string, headers?: HeadersInit) {
    const req = JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getTransactionCount",
      params: [account, "latest"],
      id: 1,
    } satisfies c.JsonRpcPayload);
    return this.fetch(req, headers) as Promise<c.JsonRpcResponse>;
  }

  getFeeHistory(
    params: [
      blockCount: string,
      newestBlock: string,
      rewardPercentiles: number[],
    ],
    headers?: HeadersInit,
  ) {
    const req = JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_feeHistory",
      params,
      id: 1,
    } satisfies c.JsonRpcPayload);
    return this.fetch(req, headers) as Promise<c.JsonRpcResponse<c.FeeHistory>>;
  }

  sendRawTransaction(signedTxArray: string[], headers?: HeadersInit) {
    const batch = this.batch(signedTxArray, "eth_sendRawTransaction");
    return this.fetch(batch, headers) as Promise<c.JsonRpcResponse[]>;
  }

  getTransactionReceipt(txHashArray: string[], headers?: HeadersInit) {
    const batch = this.batch(txHashArray, "eth_getTransactionReceipt");
    return this.fetch(batch, headers) as Promise<
      c.JsonRpcResponse<c.TransactionReceipt | null>[]
    >;
  }

  getTransactionByHash(txHashArray: string[], headers?: HeadersInit) {
    const batch = this.batch(txHashArray, "eth_getTransactionByHash");
    return this.fetch(batch, headers) as Promise<
      c.JsonRpcResponse<c.Transaction | null>[]
    >;
  }

  batch(
    data: string[],
    method:
      | "eth_sendRawTransaction"
      | "eth_getTransactionReceipt"
      | "eth_getTransactionByHash",
  ): string {
    const size = data.length;
    const batch = new Array<c.JsonRpcPayload>(size);

    for (let i = 0; i < size; i++)
      batch[i] = { jsonrpc: "2.0", method, params: [data[i]], id: i + 1 };

    return JSON.stringify(batch);
  }

  async fetch(body: string, headers?: HeadersInit): Promise<unknown> {
    let response: Response;
    let status: number;
    try {
      response = await fetch(this.rpcUrl, {
        method: "POST",
        headers: headers ? { ...defaultHeaders, ...headers } : defaultHeaders,
        keepalive: true,
        body,
      });
      status = response.status;
    } catch (err) {
      throw new JsonRpcRequestError(err);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (cause) {
      throw new JsonRpcResponseError({ status, cause });
    }

    if (!response.ok) {
      throw new JsonRpcResponseError({ status, cause: data });
    }

    return data;
  }

  isJsonRpcError(
    res: c.JsonRpcResponse<unknown>,
  ): res is c.JsonRpcResponseWithError {
    return typeof (res as c.JsonRpcResponseWithError).error !== "undefined";
  }
}

export class JsonRpcRequestError extends Error {
  static readonly code = "json_request_error";
  constructor(cause: unknown) {
    super(JsonRpcRequestError.code, { cause });
  }
}

export class JsonRpcResponseError extends Error {
  static readonly code = "json_response_error";
  constructor(
    cause:
      | { status: number; cause: unknown }
      | { code: number; message: string },
  ) {
    super(JsonRpcResponseError.code, { cause });
  }
}
