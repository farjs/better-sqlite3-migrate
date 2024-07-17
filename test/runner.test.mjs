/**
 * @typedef {import("@farjs/better-sqlite3-wrapper").Database} Database
 * @typedef {import("../index.mjs").MigrationBundleItem} MigrationBundleItem
 */
import { URL } from "node:url";
import assert from "node:assert/strict";
import mockFunction from "mock-fn";
import Database from "@farjs/better-sqlite3-wrapper";
import { readBundle, runBundle } from "../index.mjs";

const { describe, it } = await (async () => {
  // @ts-ignore
  const module = process.isBun ? "bun:test" : "node:test";
  // @ts-ignore
  return process.isBun // @ts-ignore
    ? Promise.resolve({ describe: (_, fn) => fn(), it: test })
    : import(module);
})();

const sqliteError = (() => {
  // @ts-ignore
  return process.isBun ? "SQLiteError" : "SqliteError";
})();

const migration1 = {
  file: "V001__test_migration_1.SQL",
  content: /* sql */ `
    -- comment 1
    -- comment 2
    create table test_migrations (
      id              integer primary key, -- inline comment
      original_name   text
    );

    /*
    * multi-line comment
    */

    alter table test_migrations rename column original_name to new_name;

    insert into test_migrations (new_name) values ('test 1'), ('test 2');

  `,
};

const migration2 = {
  file: "V002__test_migration_2.sql",
  content: /* sql */ `insert into test_migrations (new_name) values ('test 3'), ('test 4');`,
};

describe("runner.test.mjs", () => {
  it("should run migrations on new database in correct order", async () => {
    //given
    const db = new Database(":memory:");
    const logs = /** @type {string[]} */ ([]);
    const logMock = mockFunction((msg) => {
      logs.push(msg);
    });
    const savedLog = console.log;
    console.log = logMock;

    //when
    await runBundle(db, [migration2, migration1]);

    //then
    console.log = savedLog;
    assert.deepEqual(logMock.times, 3);
    assert.deepEqual(logs, [
      "DB: migrating to version 1 - test migration 1",
      "DB: migrating to version 2 - test migration 2",
      "DB: 2 migration(s) were applied successfully",
    ]);
    assertDb(db, [
      { id: 1, name: "test 1" },
      { id: 2, name: "test 2" },
      { id: 3, name: "test 3" },
      { id: 4, name: "test 4" },
    ]);
    assertSchema(db, [
      { version: 1, name: "test migration 1" },
      { version: 2, name: "test migration 2" },
    ]);
  });

  it("should run migrations on existing database", async () => {
    //given
    const db = new Database(":memory:");
    const logs = /** @type {string[]} */ ([]);
    const logMock = mockFunction((msg) => {
      logs.push(msg);
    });
    const savedLog = console.log;
    console.log = logMock;

    //when & then
    await runBundle(db, [migration1]);
    assertDb(db, [
      { id: 1, name: "test 1" },
      { id: 2, name: "test 2" },
    ]);
    assertSchema(db, [{ version: 1, name: "test migration 1" }]);

    //when
    await runBundle(db, [migration2, migration1]);

    //then
    console.log = savedLog;
    assert.deepEqual(logMock.times, 4);
    assert.deepEqual(logs, [
      "DB: migrating to version 1 - test migration 1",
      "DB: 1 migration(s) were applied successfully",
      "DB: migrating to version 2 - test migration 2",
      "DB: 1 migration(s) were applied successfully",
    ]);
    assertDb(db, [
      { id: 1, name: "test 1" },
      { id: 2, name: "test 2" },
      { id: 3, name: "test 3" },
      { id: 4, name: "test 4" },
    ]);
    assertSchema(db, [
      { version: 1, name: "test migration 1" },
      { version: 2, name: "test migration 2" },
    ]);
  });

  it("should skip migrations on up to date database", async () => {
    //given
    const db = new Database(":memory:");
    const logs = /** @type {string[]} */ ([]);
    const logMock = mockFunction((msg) => {
      logs.push(msg);
    });
    const savedLog = console.log;
    console.log = logMock;

    //when & then
    await runBundle(db, [migration1]);
    assertDb(db, [
      { id: 1, name: "test 1" },
      { id: 2, name: "test 2" },
    ]);
    assertSchema(db, [{ version: 1, name: "test migration 1" }]);

    //when
    await runBundle(db, [migration1]);

    //then
    console.log = savedLog;
    assert.deepEqual(logMock.times, 3);
    assert.deepEqual(logs, [
      "DB: migrating to version 1 - test migration 1",
      "DB: 1 migration(s) were applied successfully",
      "DB is up to date",
    ]);
    assertDb(db, [
      { id: 1, name: "test 1" },
      { id: 2, name: "test 2" },
    ]);
    assertSchema(db, [{ version: 1, name: "test migration 1" }]);
  });

  it("should fail and rollback changes if migration error", async () => {
    //given
    const db = new Database(":memory:");
    const logs = /** @type {string[]} */ ([]);
    const logMock = mockFunction((msg) => {
      logs.push(msg);
    });
    const savedLog = console.log;
    console.log = logMock;

    //when
    let resError = null;
    try {
      await runBundle(db, [
        migration1,
        {
          ...migration2,
          content: /* sql */ `${migration2.content}; insert into test_migrations (new_name) values ('test 5'), ();`,
        },
        {
          file: "V003__test_migration_3.sql",
          content: /* sql */ `insert into test_migrations (new_name) values ('test 7');`,
        },
      ]);
    } catch (error) {
      resError = error;
    }

    //then
    console.log = savedLog;
    assert.deepEqual(`${resError}`, `${sqliteError}: near ")": syntax error`);
    assert.deepEqual(logMock.times, 3);
    assert.deepEqual(logs, [
      "DB: migrating to version 1 - test migration 1",
      "DB: migrating to version 2 - test migration 2",
      `DB: ${sqliteError}: near ")": syntax error`,
    ]);
    assertDb(db, [
      { id: 1, name: "test 1" },
      { id: 2, name: "test 2" },
    ]);
    assertSchema(db, [{ version: 1, name: "test migration 1" }]);
  });

  it("should re-run migration after fixing the error", async () => {
    //given
    const db = new Database(":memory:");
    const logs = /** @type {string[]} */ ([]);
    const logMock = mockFunction((msg) => {
      logs.push(msg);
    });
    const savedLog = console.log;
    console.log = logMock;

    let resError = null;
    try {
      await runBundle(db, [
        migration1,
        {
          ...migration2,
          content: /* sql */ `${migration2.content}; insert into test_migrations (new_name) values ('test 5'), ();`,
        },
      ]);
    } catch (error) {
      resError = error;
    }
    assert.deepEqual(`${resError}`, `${sqliteError}: near ")": syntax error`);

    //when
    await runBundle(db, [
      migration1,
      {
        ...migration2,
        content: /* sql */ `${migration2.content}; insert into test_migrations (new_name) values ('test 5');`,
      },
    ]);

    //then
    console.log = savedLog;
    assert.deepEqual(logMock.times, 5);
    assert.deepEqual(logs, [
      "DB: migrating to version 1 - test migration 1",
      "DB: migrating to version 2 - test migration 2",
      `DB: ${sqliteError}: near ")": syntax error`,
      "DB: migrating to version 2 - test migration 2",
      "DB: 1 migration(s) were applied successfully",
    ]);
    assertDb(db, [
      { id: 1, name: "test 1" },
      { id: 2, name: "test 2" },
      { id: 3, name: "test 3" },
      { id: 4, name: "test 4" },
      { id: 5, name: "test 5" },
    ]);
    assertSchema(db, [
      { version: 1, name: "test migration 1" },
      { version: 2, name: "test migration 2" },
    ]);
  });

  it("should run non-transactional migration", async () => {
    //given
    const db = new Database(":memory:");
    const logs = /** @type {string[]} */ ([]);
    const logMock = mockFunction((msg) => {
      logs.push(msg);
    });
    const savedLog = console.log;
    console.log = logMock;

    //when
    await runBundle(db, [
      {
        file: "V001__non-transactional_migration.sql",
        content: /* sql */ `
          -- non-transactional
          PRAGMA foreign_keys = ON;
        `,
      },
    ]);

    //then
    console.log = savedLog;
    assert.deepEqual(logMock.times, 2);
    assert.deepEqual(logs, [
      "DB: migrating to version 1 - non-transactional migration",
      "DB: 1 migration(s) were applied successfully",
    ]);
    assertSchema(db, [{ version: 1, name: "non-transactional migration" }]);
  });

  it("should run non-transactional and transactional migrations", async () => {
    //given
    const db = new Database(":memory:");
    const logs = /** @type {string[]} */ ([]);
    const logMock = mockFunction((msg) => {
      logs.push(msg);
    });
    const savedLog = console.log;
    console.log = logMock;

    //when
    let resError = null;
    try {
      await runBundle(db, [
        {
          file: "V001__non-transactional_migration.sql",
          content: /* sql */ `
            -- non-transactional
            PRAGMA foreign_keys = ON;
          
            create table categories (
              id     integer primary key,
              name   text
            );
          
            create table products (
              id     integer primary key,
              cat_id integer not null,
              name   text,
              CONSTRAINT category_fk FOREIGN KEY (cat_id) REFERENCES categories (id)
            );
          `,
        },
        {
          file: "V002__transactional_migration.sql",
          content: /* sql */ `
            insert into categories (name) values ('category 1'), ('category 2');
            insert into products (cat_id, name) values (3, 'product 1')
          `,
        },
      ]);
    } catch (error) {
      resError = error;
    }

    //then
    console.log = savedLog;
    assert.deepEqual(
      `${resError}`,
      `${sqliteError}: FOREIGN KEY constraint failed`
    );
    assert.deepEqual(logMock.times, 3);
    assert.deepEqual(logs, [
      "DB: migrating to version 1 - non-transactional migration",
      "DB: migrating to version 2 - transactional migration",
      `DB: ${sqliteError}: FOREIGN KEY constraint failed`,
    ]);
    assertSchema(db, [{ version: 1, name: "non-transactional migration" }]);
  });

  it("should run migrations from bundle.json", async () => {
    //given
    const db = new Database(":memory:");
    const logs = /** @type {string[]} */ ([]);
    const logMock = mockFunction((msg) => {
      logs.push(msg);
    });
    const savedLog = console.log;
    console.log = logMock;

    //when & then
    const bundleUrl = new URL("./migrations/bundle.json", import.meta.url);
    const bundle = await readBundle(bundleUrl);

    //when
    await runBundle(db, bundle);

    //then
    console.log = savedLog;
    assert.deepEqual(logMock.times, 3);
    assert.deepEqual(logs, [
      "DB: migrating to version 1 - initial db structure",
      "DB: migrating to version 2 - rename db field",
      "DB: 2 migration(s) were applied successfully",
    ]);
    assertDb(db, [
      { id: 1, name: "test 1" },
      { id: 2, name: "test 2" },
    ]);
    assertSchema(db, [
      { version: 1, name: "initial db structure" },
      { version: 2, name: "rename db field" },
    ]);
  });

  it("should fail if cannot parse migration version and name", async () => {
    //given
    const db = new Database(":memory:");
    const fileName = "V01_test.SQL";
    const item = {
      file: fileName,
      content: "some test content",
    };
    let capturedError = "";
    const logMock = mockFunction((msg) => {
      capturedError = msg;
    });
    const savedLog = console.log;
    console.log = logMock;

    //when
    let resError = null;
    try {
      await runBundle(db, [item]);
    } catch (error) {
      resError = error;
    }

    //then
    console.log = savedLog;
    assert.deepEqual(
      resError,
      Error(`Cannot parse migration version and name from: ${fileName}`)
    );
    assert.deepEqual(
      capturedError,
      `DB: Error: Cannot parse migration version and name from: ${fileName}`
    );
    assert.deepEqual(logMock.times, 1);
  });
});

/**
 * @param {Database} db
 * @param {{id: number, name: string}[]} expected
 */
function assertDb(db, expected) {
  const results = db.transaction(() => {
    const query = db.prepare(
      /* sql */ `select * from test_migrations order by id;`
    );
    const rows = query.all();
    return rows.map((r) => {
      return {
        id: /** @type {number} */ (r.id),
        name: /** @type {string} */ (r.new_name),
      };
    });
  })();

  assert.deepEqual(results, expected);
}

/**
 * @param {Database} db
 * @param {{version: number, name: string}[]} expected
 */
function assertSchema(db, expected) {
  const results = db.transaction(() => {
    const query = db.prepare(
      /* sql */ `select * from schema_versions order by version;`
    );
    const rows = query.all();
    return rows.map((r) => {
      return {
        version: /** @type {number} */ (r.version),
        name: /** @type {string} */ (r.name),
      };
    });
  })();

  assert.deepEqual(results, expected);
}
