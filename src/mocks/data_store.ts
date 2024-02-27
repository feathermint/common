/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as m from "@feathermint/mongo-connect";
import { Dictionary } from "..";
import type { DataStore, RepositoryMap } from "../lib/data_store";

interface MockCollectionMethods<T = m.Document> {
  find?: MockCollection<T>["find"];
  findOne?: MockCollection<T>["findOne"];
  findOneAndUpdate?: MockCollection<T>["findOneAndUpdate"];
  insertOne?: MockCollection<T>["insertOne"];
  updateOne?: MockCollection<T>["updateOne"];
  deleteOne?: MockCollection<T>["deleteOne"];
  countDocuments?: MockCollection<T>["countDocuments"];
}

export class MockCollection<T = m.Document> {
  constructor(methods: MockCollectionMethods<T>) {
    Object.assign(this, methods);
  }

  find(...args: unknown[]): MockCursor<T> {
    throw new Error("Method not implemented.");
  }

  findOne(...args: unknown[]): Promise<T | null> {
    throw new Error("Method not implemented.");
  }

  findOneAndUpdate(
    ...args: unknown[]
  ): ReturnType<m.Collection["findOneAndUpdate"]> {
    throw new Error("Method not implemented.");
  }

  insertOne(...args: unknown[]): ReturnType<m.Collection["insertOne"]> {
    throw new Error("Method not implemented.");
  }

  updateOne(...args: unknown[]): ReturnType<m.Collection["updateOne"]> {
    throw new Error("Method not implemented.");
  }

  deleteOne(...args: unknown[]): ReturnType<m.Collection["deleteOne"]> {
    throw new Error("Method not implemented.");
  }

  countDocuments(
    ...args: unknown[]
  ): ReturnType<m.Collection["countDocuments"]> {
    throw new Error("Method not implemented.");
  }
}

export class MockDataStore implements Required<DataStore> {
  constructor(private collections: Dictionary<MockCollection>) {}

  get client(): m.MongoClient {
    throw new Error("Property getter not implemented.");
  }

  repository<K extends keyof RepositoryMap>(name: K): RepositoryMap[K] {
    return this.collections[name] as unknown as RepositoryMap[K];
  }

  startSession(): m.ClientSession {
    return {
      async withTransaction(callback: () => Promise<void>) {
        await callback();
      },
      async endSession() {
        //
      },
    } as m.ClientSession;
  }

  async runTransaction(
    fn: m.WithTransactionCallback<void>,
    options?:
      | {
          session?: m.ClientSessionOptions | undefined;
          transaction?: m.TransactionOptions | undefined;
        }
      | undefined,
  ): Promise<void> {
    await fn({} as m.ClientSession);
  }

  close(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

export class MockCursor<T> {
  constructor(private next: () => Promise<IteratorResult<T>>) {}

  [Symbol.asyncIterator]() {
    return {
      next: this.next,
      return() {
        return { done: true };
      },
    };
  }

  toArray(): Promise<m.Document[]> {
    throw new Error("Method not implemented.");
  }
}
