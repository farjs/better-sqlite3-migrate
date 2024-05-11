//import assert from "node:assert/strict";
//import Database from "@farjs/better-sqlite3-wrapper";
import { runBundle } from "../index.mjs";

const { describe, it } = await (async () => {
  // @ts-ignore
  const module = process.isBun ? "bun:test" : "node:test";
  // @ts-ignore
  return process.isBun // @ts-ignore
    ? Promise.resolve({ describe: (_, fn) => fn(), it: test })
    : import(module);
})();

describe("index.test.mjs", () => {
  it("should apply migrations", async () => {
    //when
    await runBundle([]);
  });
});
