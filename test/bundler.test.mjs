import assert from "node:assert/strict";
import mockFunction from "mock-fn";
import { createBundle } from "../index.mjs";

const { describe, it } = await (async () => {
  // @ts-ignore
  const module = process.isBun ? "bun:test" : "node:test";
  // @ts-ignore
  return process.isBun // @ts-ignore
    ? Promise.resolve({ describe: (_, fn) => fn(), it: test })
    : import(module);
})();

describe("bundler.test.mjs", () => {
  it("should fail if migrations dir is not specified", async () => {
    //given
    let capturedError = "";
    const errorMock = mockFunction((msg) => {
      capturedError = msg;
    });
    const savedError = console.error;
    console.error = errorMock;

    //when
    let resError = null;
    try {
      await createBundle([]);
    } catch (error) {
      resError = error;
    }

    //then
    console.error = savedError;
    assert.deepEqual(resError, null);
    assert.deepEqual(
      capturedError,
      `Error: Migrations folder path expected as first argument`
    );
    assert.deepEqual(errorMock.times, 1);
  });
});
