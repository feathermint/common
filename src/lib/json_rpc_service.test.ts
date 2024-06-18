import {
  FeathermintERC1155,
  FeathermintERC1155__factory,
  FeathermintProxy__factory,
} from "@feathermint/contracts";
import estimates from "@feathermint/contracts/gas/FeathermintERC1155.json";
import { ObjectId } from "@feathermint/mongo-connect";
import { JsonRpcProvider, Wallet, id } from "ethers";
import assert from "node:assert";
import { randomBytes } from "node:crypto";
import { before, describe, it } from "node:test";
import type * as c from "..";
import {
  JsonRpcRequestError,
  JsonRpcResponseError,
  JsonRpcService,
} from "./json_rpc_service";

const service = new JsonRpcService();
// The accounts below are for testing purposes only.
// HD wallet mnemonic: "test test test test test test test test test test test junk".
const accounts = [
  {
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  },
];
const provider = new JsonRpcProvider();
const wallet = new Wallet(accounts[0].privateKey, provider);
const bucketURL = "https://bucket.storage.com";

void describe("JsonRpcService", () => {
  let FeathermintProxy: FeathermintProxy__factory;
  let FeathermintERC1155: FeathermintERC1155__factory;
  let proxiedERC1155: FeathermintERC1155;
  let chainId: bigint;
  const txHashes: string[] = [];

  before(async () => {
    chainId = (await provider.getNetwork()).chainId;
    FeathermintERC1155 = new FeathermintERC1155__factory(wallet);
    FeathermintProxy = new FeathermintProxy__factory(wallet);

    const erc1155 = await FeathermintERC1155.deploy();
    txHashes.push(erc1155.deploymentTransaction()?.hash as string);
    await erc1155.waitForDeployment();

    const data = erc1155.interface.encodeFunctionData("initialize", [
      wallet.address,
      [wallet.address],
      bucketURL,
    ]);
    const proxy = await FeathermintProxy.deploy(
      wallet.address,
      await erc1155.getAddress(),
      data,
    );
    txHashes.push(proxy.deploymentTransaction()?.hash as string);
    await proxy.waitForDeployment();

    proxiedERC1155 = FeathermintERC1155__factory.connect(
      await proxy.getAddress(),
      wallet,
    );
  });

  void describe("#batch", () => {
    void it("returns a JSON string of batched JSON-RPC requests", () => {
      const txHashArray = [];
      for (let i = 0; i < 3; i++)
        txHashArray.push(`0x${randomBytes(32).toString("hex")}`);

      const method = "eth_getTransactionReceipt";
      const result = service.batch(txHashArray, method);
      assert.equal(typeof result, "string");

      const batch = JSON.parse(result) as c.JsonRpcPayload[];
      for (let i = 0; i < batch.length; i++) {
        assert.equal(batch[i].jsonrpc, "2.0");
        assert.equal(batch[i].method, method);
        assert.equal((batch[i].params as string[])[0], txHashArray[i]);
        assert.equal(batch[i].id, i + 1);
      }
    });
  });

  void describe("#fetch", () => {
    const body = JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_getTransactionReceipt",
      params: [randomBytes(32).toString("hex")],
    } as c.JsonRpcPayload);

    void it("throws a JsonRpcRequestError when the request fails", async () => {
      const _globalThis = globalThis.fetch;
      globalThis.fetch = () => Promise.reject();

      await assert.rejects(
        service.fetch(body),
        (err) => err instanceof JsonRpcRequestError,
      );

      globalThis.fetch = _globalThis;
    });

    void it("throws JsonRpcResponseError when response status is not ok", async () => {
      const _globalThis = globalThis.fetch;
      globalThis.fetch = () =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve(""),
        } as Response);

      await assert.rejects(
        service.fetch(body),
        (err) => err instanceof JsonRpcResponseError,
      );

      globalThis.fetch = _globalThis;
    });

    void it("returns the JSON-RPC response", async () => {
      const response: c.JsonRpcResponse = {
        id: 1,
        jsonrpc: "2.0",
        result: "0x1a",
      };
      const _globalThis = globalThis.fetch;
      globalThis.fetch = () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
        } as Response);

      assert.deepStrictEqual(
        await service.fetch(body, { Accept: "application/json" }),
        response,
      );

      globalThis.fetch = _globalThis;
    });
  });

  void describe("#getChainId", () => {
    void it("returns JSON-RPC response containing the chain id", async () => {
      const response = await service.getChainId();
      assert.ok(!service.isJsonRpcError(response));
      assert.ok(Number(response.result) > 0);
    });
  });

  void describe("#getBlockNumber", () => {
    void it("returns JSON-RPC response containing the current block number", async () => {
      const response = await service.getBlockNumber();
      assert.ok(!service.isJsonRpcError(response));
      assert.ok(Number(response.result) > 0);
    });
  });

  void describe("#getTransactionCount", () => {
    void it("returns JSON-RPC response containing the nonce for a given account", async () => {
      const response_1 = await service.getTransactionCount(wallet.address);
      assert.ok(!service.isJsonRpcError(response_1));
      const tx = await proxiedERC1155.setBucketURL("bucket_url");
      await tx.wait();
      const response_2 = await service.getTransactionCount(wallet.address);
      assert.ok(!service.isJsonRpcError(response_2));
      assert.equal(Number(response_2.result) - Number(response_1.result), 1);
    });
  });

  void describe("#getFeeHistory", () => {
    void it("returns JSON-RPC response with historical gas information", async () => {
      const params: [string, string, number[]] = ["0x4", "latest", [80]];
      const response = await service.getFeeHistory(params);
      assert(!service.isJsonRpcError(response));
      const {
        result: { baseFeePerGas, gasUsedRatio, oldestBlock, reward },
      } = response;

      assert.ok(Array.isArray(baseFeePerGas));
      assert.ok(Array.isArray(gasUsedRatio));
      assert.equal(typeof oldestBlock, "string");
      assert.ok(Array.isArray(reward));
      assert.ok(reward.every((el) => Array.isArray(el) && el.length === 1));
    });
  });

  void describe("#getLogs", () => {
    void it("returns JSON-RPC response with logs matching the given filter", async () => {
      const ids = [
        BigInt(`0x${new ObjectId().toString()}`),
        BigInt(`0x${new ObjectId().toString()}`),
      ];

      const tx_1 = await proxiedERC1155.createToken(ids[0], 1000);
      const receipt_1 = await tx_1.wait();
      const tx_2 = await proxiedERC1155.createToken(ids[1], 1000);
      const receipt_2 = await tx_2.wait();

      const fromBlock = receipt_1?.blockNumber;
      assert(typeof fromBlock !== "undefined");
      const toBlock = receipt_2?.blockNumber;
      assert(typeof toBlock !== "undefined");

      const filter = {
        address: [await proxiedERC1155.getAddress()],
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        topics: [id("TokenCreated(uint256,uint256)")],
      };
      const response = await service.getLogs(filter);
      assert(!service.isJsonRpcError(response));

      const logs = response.result;
      assert.ok(Array.isArray(logs));
      assert.equal(logs.length, 2);
    });
  });

  void describe("#sendRawTransaction", () => {
    void it("returns array of JSON-RPC responses containing a tx hash", async () => {
      const response = await service.getTransactionCount(wallet.address);
      assert(!service.isJsonRpcError(response));
      let nonce = Number(response.result);

      const gasLimit = estimates.createToken;
      const maxFeePerGas = 10 ** 11;
      const options = { chainId, nonce, gasLimit, maxFeePerGas };
      const ids = [
        BigInt(`0x${new ObjectId().toString()}`),
        BigInt(`0x${new ObjectId().toString()}`),
        BigInt(`0x${new ObjectId().toString()}`),
      ];
      const txArray = await Promise.all([
        proxiedERC1155.createToken.populateTransaction(ids[0], 1000, options),
        proxiedERC1155.createToken.populateTransaction(ids[1], 2000, {
          ...options,
          nonce: ++nonce,
        }),
        proxiedERC1155.createToken.populateTransaction(ids[2], 3000, {
          ...options,
          nonce: ++nonce,
        }),
      ]);
      const signedTxArray = await Promise.all(
        txArray.map(wallet.signTransaction.bind(wallet)),
      );
      const responses = await service.sendRawTransaction(signedTxArray);
      assert.ok(Array.isArray(responses));
      assert.equal(responses.length, 3);

      for (const response of responses) {
        if (service.isJsonRpcError(response))
          assert.fail("Response should not contain an error.");

        assert.equal(typeof response.result, "string");
        assert.equal(response.result.length, 66);
      }
    });
  });

  void describe("#getTransactionReceipt", () => {
    void it("returns array of JSON-RPC responses containing a receipt or null", async () => {
      const txHashArray = [...txHashes, `0x${randomBytes(32).toString("hex")}`];
      const responses = await service.getTransactionReceipt(txHashArray);
      assert.ok(Array.isArray(responses));
      assert.equal(responses.length, txHashArray.length);

      const results: (c.TransactionReceipt | null)[] = [];
      for (const response of responses) {
        if (service.isJsonRpcError(response))
          assert.fail("Response should not contain an error.");
        results.push(response.result);
      }

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (i < results.length - 1) {
          assert.ok(result !== null);
          assert.ok(Array.isArray(result.logs));
        } else {
          assert.ok(result === null);
        }
      }
    });
  });

  void describe("#getTransactionByHash", () => {
    void it("returns array of JSON-RPC responses containing a receipt or null", async () => {
      const txHashArray = [...txHashes, `0x${randomBytes(32).toString("hex")}`];
      const responses = await service.getTransactionByHash(txHashArray);
      assert.ok(Array.isArray(responses));
      assert.equal(responses.length, txHashArray.length);

      const results: (c.Transaction | null)[] = [];
      for (const response of responses) {
        if (service.isJsonRpcError(response))
          assert.fail("Response should not contain an error.");
        results.push(response.result);
      }

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (i < results.length - 1) {
          assert.ok(result !== null);
          assert.equal(result.hash, txHashArray[i]);
        } else {
          assert.ok(result === null);
        }
      }
    });
  });

  void describe("#isJsonRpcError", () => {
    const errorResponse: c.JsonRpcResponse = {
      id: 1,
      jsonrpc: "2.0",
      error: { code: -32003, message: "Transaction rejected" },
    };
    assert.equal(service.isJsonRpcError(errorResponse), true);

    const successResponse: c.JsonRpcResponse = {
      id: 1,
      jsonrpc: "2.0",
      result: "0x1a",
    };
    assert.equal(service.isJsonRpcError(successResponse), false);
  });
});
