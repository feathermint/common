export type JsonRpcPayload = {
  id: number;
  method: string;
  params: unknown[];
  jsonrpc: "2.0";
};

export type JsonRpcResponse<Result = string> =
  | JsonRpcResponseWithResult<Result>
  | JsonRpcResponseWithError;

export interface BaseJsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
}

export type JsonRpcResponseWithResult<R = string> = BaseJsonRpcResponse & {
  result: R;
};

export type JsonRpcResponseWithError = BaseJsonRpcResponse & {
  error: { code: number; message: string };
};
