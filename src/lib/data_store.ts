import type * as m from "@feathermint/mongo-connect";
import { connect } from "@feathermint/mongo-connect";
import * as c from "..";

export interface RepositoryMap {
  users: m.Collection<c.User>;
  tokenpools: m.Collection<c.TokenPool>;
  tokens: m.Collection<c.Token>;
  transfers: m.Collection<c.Transfer>;
  txjobs: m.Collection<c.TransactionJob>;
}

export interface DataStoreOptions extends m.MongoClientOptions {
  url?: string;
  dbName?: string;
}

export class DataStore {
  static #instance: DataStore;
  readonly #client: m.MongoClient;
  readonly #cache: Partial<RepositoryMap> = {};
  readonly #dbName?: string;
  readonly #defaultTransactionOptions: m.TransactionOptions = {
    readPreference: "primary",
    readConcern: { level: "majority" },
    writeConcern: { w: "majority" },
  };

  static async init(options: DataStoreOptions = {}): Promise<DataStore> {
    if (this.#instance) return this.#instance;
    const { url, dbName, ...mongoClientOptions } = options;

    const mongoClient = await connect(url, mongoClientOptions);
    this.#instance = new DataStore(mongoClient, dbName);
    return this.#instance;
  }

  private constructor(client: m.MongoClient, dbName?: string) {
    this.#client = client;
    this.#dbName = dbName;
  }

  get client(): m.MongoClient {
    return this.#client;
  }

  repository<K extends keyof RepositoryMap>(name: K): RepositoryMap[K] {
    if (!this.#cache[name]) {
      this.#cache[name] = this.#client
        .db(this.#dbName)
        .collection(name) as RepositoryMap[K];
    }
    return this.#cache[name]!;
  }

  startSession(options?: m.ClientSessionOptions): m.ClientSession {
    return this.#client.startSession({
      defaultTransactionOptions: this.#defaultTransactionOptions,
      ...options,
    });
  }

  async runTransaction(
    fn: m.WithTransactionCallback<void>,
    options?: {
      session?: m.ClientSessionOptions;
      transaction?: m.TransactionOptions;
    },
  ) {
    await this.#client.withSession(
      {
        defaultTransactionOptions: this.#defaultTransactionOptions,
        ...options?.session,
      },
      async (session) => {
        await session.withTransaction(fn, options?.transaction);
      },
    );
  }

  async close(force = false) {
    return await this.#client.close(force);
  }
}
