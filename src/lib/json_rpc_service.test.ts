import {
  FeathermintERC1155,
  FeathermintERC1155__factory,
  FeathermintProxy__factory,
} from "@feathermint/contracts";
import estimates from "@feathermint/contracts/gas/FeathermintERC1155.json";
import { ObjectId } from "@feathermint/mongo-connect";
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { JsonRpcProvider, Wallet, id } from "ethers";
import { randomBytes } from "node:crypto";
import type * as c from "..";
import {
  JsonRpcRequestError,
  JsonRpcResponseError,
  JsonRpcService,
} from "./json_rpc_service";

chai.use(chaiAsPromised);

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

describe("JsonRpcService", () => {
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

  describe("#batch", () => {
    it("returns a JSON string of batched JSON-RPC requests", () => {
      const txHashArray = [];
      for (let i = 0; i < 3; i++)
        txHashArray.push(`0x${randomBytes(32).toString("hex")}`);

      const method = "eth_getTransactionReceipt";
      const result = service.batch(txHashArray, method);
      expect(typeof result).to.eq("string");

      const batch = JSON.parse(result) as c.JsonRpcPayload[];
      for (let i = 0; i < batch.length; i++) {
        expect(batch[i].jsonrpc).to.eq("2.0");
        expect(batch[i].method).to.eq(method);
        expect((batch[i].params as string[])[0]).to.eq(txHashArray[i]);
        expect(batch[i].id).to.eq(i + 1);
      }
    });
  });

  describe("#fetch", () => {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getTransactionReceipt",
      params: [randomBytes(32).toString("hex")],
      id: 1,
    } as c.JsonRpcPayload);

    it("throws a JsonRpcRequestError when the request fails", async () => {
      const _globalThis = globalThis.fetch;
      globalThis.fetch = () => Promise.reject();

      await expect(service.fetch(body)).to.be.rejectedWith(JsonRpcRequestError);

      globalThis.fetch = _globalThis;
    });

    it("throws JsonRpcResponseError when response status is not ok", async () => {
      const _globalThis = globalThis.fetch;
      globalThis.fetch = () =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve(""),
        } as Response);

      await expect(service.fetch(body)).to.be.rejectedWith(
        JsonRpcResponseError,
      );

      globalThis.fetch = _globalThis;
    });

    it("returns the JSON-RPC response", async () => {
      const response = { jsonrpc: "2.0", result: "0x1a", id: "1" };
      const _globalThis = globalThis.fetch;
      globalThis.fetch = () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
        } as Response);

      await expect(
        service.fetch(body, { Accept: "application/json" }),
      ).to.eventually.deep.eq(response);

      globalThis.fetch = _globalThis;
    });
  });

  describe("#getChainId", () => {
    it("returns JSON-RPC response containing the chain id", async () => {
      const response = await service.getChainId();
      assert(!service.isJsonRpcError(response));
      expect(Number(response.result)).to.be.greaterThan(0);
    });
  });

  describe("#getBlockNumber", () => {
    it("returns JSON-RPC response containing the current block number", async () => {
      const response = await service.getBlockNumber();
      assert(!service.isJsonRpcError(response));
      expect(Number(response.result)).to.be.greaterThan(0);
    });
  });

  describe("#getTransactionCount", () => {
    it("returns JSON-RPC response containing the nonce for a given account", async () => {
      const response_1 = await service.getTransactionCount(wallet.address);
      assert(!service.isJsonRpcError(response_1));
      const tx = await proxiedERC1155.setBucketURL("bucket_url");
      await tx.wait();
      const response_2 = await service.getTransactionCount(wallet.address);
      assert(!service.isJsonRpcError(response_2));
      expect(Number(response_2.result) - Number(response_1.result)).to.eq(1);
    });
  });

  describe("#getFeeHistory", () => {
    it("returns JSON-RPC response with historical gas information", async () => {
      const params: [string, string, number[]] = ["0x4", "latest", [80]];
      const response = await service.getFeeHistory(params);
      assert(!service.isJsonRpcError(response));
      const {
        result: { baseFeePerGas, gasUsedRatio, oldestBlock, reward },
      } = response;

      expect(Array.isArray(baseFeePerGas)).to.be.true;
      expect(Array.isArray(gasUsedRatio)).to.be.true;
      expect(oldestBlock).to.be.a("string");
      expect(Array.isArray(reward)).to.be.true;
      reward.every((el) => Array.isArray(el) && el.length === 1);
    });
  });

  describe("#getLogs", () => {
    it("returns JSON-RPC response with logs matching the given filter", async () => {
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
      expect(Array.isArray(logs)).to.be.true;
      expect(logs.length).to.eq(2);
    });
  });

  describe("#sendRawTransaction", () => {
    it("returns array of JSON-RPC responses containing a tx hash", async () => {
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
      expect(Array.isArray(responses)).to.be.true;
      expect(responses.length).to.eq(3);

      for (const response of responses) {
        if (service.isJsonRpcError(response))
          assert.fail("Response should not contain an error.");

        expect(typeof response.result).to.eq("string");
        expect(response.result.length).to.eq(66);
      }
    });
  });

  describe("#getTransactionReceipt", () => {
    it("returns array of JSON-RPC responses containing a receipt or null", async () => {
      const txHashArray = [...txHashes, `0x${randomBytes(32).toString("hex")}`];
      const responses = await service.getTransactionReceipt(txHashArray);
      expect(Array.isArray(responses)).to.be.true;
      expect(responses.length).to.eq(txHashArray.length);

      const results: (c.TransactionReceipt | null)[] = [];
      for (const response of responses) {
        if (service.isJsonRpcError(response))
          assert.fail("Response should not contain an error.");
        results.push(response.result);
      }

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (i < results.length - 1) {
          assert(result !== null, "Result should not be null.");
          expect(Array.isArray(result.logs)).to.be.true;
        } else {
          expect(result).to.be.null;
        }
      }
    });
  });

  describe("#getTransactionByHash", () => {
    it("returns array of JSON-RPC responses containing a receipt or null", async () => {
      const txHashArray = [...txHashes, `0x${randomBytes(32).toString("hex")}`];
      const responses = await service.getTransactionByHash(txHashArray);
      expect(Array.isArray(responses)).to.be.true;
      expect(responses.length).to.eq(txHashArray.length);

      const results: (c.Transaction | null)[] = [];
      for (const response of responses) {
        if (service.isJsonRpcError(response))
          assert.fail("Response should not contain an error.");
        results.push(response.result);
      }

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (i < results.length - 1) {
          assert(result !== null, "Result should not be null.");
          expect(result.hash).to.eq(txHashArray[i]);
        } else {
          expect(result).to.be.null;
        }
      }
    });
  });
});
