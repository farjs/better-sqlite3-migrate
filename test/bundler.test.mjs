import fs from "fs";
import path from "path";
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

const bundleFileName = "bundle.json";
const migrationsDir = "./test/migrations";
const migrationsBundle = path.join(migrationsDir, bundleFileName);

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

  it("should fail if migrations dir doesn't exist", async () => {
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
      await createBundle(["1234"]);
    } catch (error) {
      resError = error;
    }

    //then
    console.error = savedError;
    assert.deepEqual(resError, null);
    assert.deepEqual(
      capturedError,
      `Error: Migrations folder "1234" doesn't exist`
    );
    assert.deepEqual(errorMock.times, 1);
  });

  it("should fail if migrations dir is not a directory", async () => {
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
      await createBundle(["package.json"]);
    } catch (error) {
      resError = error;
    }

    //then
    console.error = savedError;
    assert.deepEqual(resError, null);
    assert.deepEqual(capturedError, `Error: "package.json" is not a directory`);
    assert.deepEqual(errorMock.times, 1);
  });

  it("should generate new bundle file", async () => {
    //given
    if (fs.existsSync(migrationsBundle)) {
      fs.unlinkSync(migrationsBundle);
    }
    const logs = /** @type {string[]} */ ([]);
    const logMock = mockFunction((msg) => {
      logs.push(msg);
    });
    const savedLog = console.log;
    console.log = logMock;

    //when
    await createBundle([migrationsDir]);

    //then
    console.log = savedLog;
    assert.deepEqual(logMock.times, 1);
    assert.deepEqual(logs, [`Generated SQL bundle file: ${migrationsBundle}`]);
    assertBundleFile(migrationsBundle);
  });

  it("should not generate bundle file if it's up to date", async () => {
    //given
    if (fs.existsSync(migrationsBundle)) {
      fs.unlinkSync(migrationsBundle);
    }
    const logs = /** @type {string[]} */ ([]);
    const logMock = mockFunction((msg) => {
      logs.push(msg);
    });
    const savedLog = console.log;
    console.log = logMock;

    //when & then
    await createBundle([migrationsDir]);
    assert.deepEqual(logMock.times, 1);
    assert.deepEqual(logs, [`Generated SQL bundle file: ${migrationsBundle}`]);
    assertBundleFile(migrationsBundle);

    //when
    await createBundle([migrationsDir]);

    //then
    console.log = savedLog;
    assert.deepEqual(logMock.times, 2);
    assert.deepEqual(logs, [
      `Generated SQL bundle file: ${migrationsBundle}`,
      `Nothing to generate, SQL bundle is up to date!`,
    ]);
    assertBundleFile(migrationsBundle);
  });

  it("should re-generate bundle file if it's older", async () => {
    //given
    if (fs.existsSync(migrationsBundle)) {
      fs.unlinkSync(migrationsBundle);
    }
    const logs = /** @type {string[]} */ ([]);
    const logMock = mockFunction((msg) => {
      logs.push(msg);
    });
    const savedLog = console.log;
    console.log = logMock;

    //when & then
    await createBundle([migrationsDir]);
    assert.deepEqual(logMock.times, 1);
    assert.deepEqual(logs, [`Generated SQL bundle file: ${migrationsBundle}`]);
    assertBundleFile(migrationsBundle);

    const bundleStats = fs.lstatSync(migrationsBundle);
    fs.utimesSync(
      migrationsBundle,
      bundleStats.atimeMs / 1000,
      bundleStats.mtimeMs / 1000 - 1 // set bundle time to minus 1 sec.
    );

    //when
    await createBundle([migrationsDir]);

    //then
    console.log = savedLog;
    assert.deepEqual(logMock.times, 2);
    assert.deepEqual(logs, [
      `Generated SQL bundle file: ${migrationsBundle}`,
      `Generated SQL bundle file: ${migrationsBundle}`,
    ]);
    assertBundleFile(migrationsBundle);
  });

  it("should re-generate bundle file if it's newer", async () => {
    //given
    if (fs.existsSync(migrationsBundle)) {
      fs.unlinkSync(migrationsBundle);
    }
    const logs = /** @type {string[]} */ ([]);
    const logMock = mockFunction((msg) => {
      logs.push(msg);
    });
    const savedLog = console.log;
    console.log = logMock;

    //when & then
    await createBundle([migrationsDir]);
    assert.deepEqual(logMock.times, 1);
    assert.deepEqual(logs, [`Generated SQL bundle file: ${migrationsBundle}`]);
    assertBundleFile(migrationsBundle);

    const bundleStats = fs.lstatSync(migrationsBundle);
    fs.utimesSync(
      migrationsBundle,
      bundleStats.atimeMs / 1000,
      bundleStats.mtimeMs / 1000 + 1 // set bundle time to plus 1 sec.
    );

    //when
    await createBundle([migrationsDir]);

    //then
    console.log = savedLog;
    assert.deepEqual(logMock.times, 2);
    assert.deepEqual(logs, [
      `Generated SQL bundle file: ${migrationsBundle}`,
      `Generated SQL bundle file: ${migrationsBundle}`,
    ]);
    assertBundleFile(migrationsBundle);
  });
});

/**
 * @param {string} bundleFile
 */
function assertBundleFile(bundleFile) {
  assert.deepEqual(
    fs.readFileSync(bundleFile).toString(),
    `[
  {
    "file": "V001__initial_db_structure.sql",
    "content": "\\n-- non-transactional\\nPRAGMA foreign_keys = ON;\\n\\n-- comment 1\\n-- comment 2\\ncreate table test_migrations (\\n  id              integer primary key, -- inline comment\\n  original_name   text\\n);\\n\\ninsert into test_migrations (original_name) values ('test 1');\\n"
  },
  {
    "file": "V002__rename_db_field.sql",
    "content": "\\n/*\\n * multi-line comment\\n */\\n\\nalter table test_migrations rename column original_name to new_name;\\n\\ninsert into test_migrations (new_name) values ('test 2');\\n"
  }
]`
  );
}
