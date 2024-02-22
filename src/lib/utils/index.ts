import type { NonEmptyArray } from "../..";

export * from "./constants";

export function isUndefined(value: unknown): value is undefined {
  return typeof value === "undefined";
}

export function prettyJSON(value: unknown) {
  JSON.stringify(value, null, 2);
}

export function stringifyOptions(options: string[]) {
  return options.reduce((prev, current, index, array) => {
    if (index === 0) return `${current}`;
    if (index + 1 < array.length) return `${prev}, ${current}`;
    return `${prev} or ${current}.`;
  }, "");
}

export async function run<T>(
  fn: () => Promise<T>,
): Promise<[T, null] | [undefined, Error]> {
  try {
    return [await fn(), null];
  } catch (cause: unknown) {
    if (cause instanceof Error) return [undefined, cause];
    return [undefined, new Error("Unknown exception", { cause })];
  }
}

export function runSync<T>(fn: () => T): [T, null] | [undefined, Error] {
  try {
    return [fn(), null];
  } catch (cause: unknown) {
    if (cause instanceof Error) return [undefined, cause];
    return [undefined, new Error("Unknown exception", { cause })];
  }
}

export function isErrorWithStatusCode(
  err: unknown,
): err is Error & { status: number } {
  if (
    err instanceof Error &&
    typeof (err as { status?: unknown }).status === "number"
  ) {
    return true;
  }
  return false;
}

export function isNonEmptyArray<T>(obj: T[]): obj is NonEmptyArray<T> {
  return obj.length > 0;
}

export async function sleep(delay: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}
