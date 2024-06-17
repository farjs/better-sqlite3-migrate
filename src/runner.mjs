/**
 * @typedef {import("node:url").URL} URL
 * @typedef {import("@farjs/better-sqlite3-wrapper").Database} Database
 * @typedef {import("../index.mjs").MigrationBundle} MigrationBundle
 */
import fs from "fs";
import Database from "@farjs/better-sqlite3-wrapper";

/**
 * @typedef {{
 *  readonly version: number;
 *  readonly name: string;
 *  readonly sql: string;
 * }} SqlMigration
 */

const dbTable = "schema_versions";
const versionAndNameRegex = /V(\d+)__(.+).sql/i;
const underscoreRegex = /_/g;

/**
 * @param {URL} url
 * @returns {Promise<MigrationBundle>}
 */
export async function readBundle(url) {
  const json = fs.readFileSync(url, { encoding: "utf8" });

  /** @type {MigrationBundle} */
  const bundle = JSON.parse(json);
  return bundle;
}

/**
 * @param {Database} db
 * @param {MigrationBundle} bundle
 * @returns {Promise<void>}
 */
export async function runBundle(db, bundle) {
  /**
   * @param {string} fileName
   * @returns {{version: number, name: string}}
   */
  function parseVersionAndName(fileName) {
    const groups = fileName.match(versionAndNameRegex);
    if (groups && groups.length === 3) {
      const version = parseInt(groups[1]);
      const name = groups[2];
      return { version, name: name.replace(underscoreRegex, " ") };
    }

    throw new Error(
      `Cannot parse migration version and name from: ${fileName}`
    );
  }

  try {
    run(
      db,
      bundle.map((item) => {
        const { version, name } = parseVersionAndName(item.file);
        return { version, name, sql: item.content };
      })
    );
  } catch (error) {
    console.log(`DB: ${error}`);
    throw error;
  }
}

/**
 * @param {Database} db
 * @param {SqlMigration[]} all
 * @returns {void}
 */
function run(db, all) {
  let count = 0;
  const currVersions = readCurrentVersions(db);
  all
    .filter((m) => !currVersions.has(m.version))
    .sort((m1, m2) => m1.version - m2.version)
    .forEach((m) => {
      const statements = m.sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length !== 0);
      const nonTransactional = statements.filter((s) =>
        s.includes("non-transactional")
      );
      const transactional = statements.filter(
        (s) => !s.includes("non-transactional")
      );

      runNonTransactional(db, nonTransactional);
      const applied = runTransactional(db, m, transactional);
      if (applied) {
        count += 1;
      }
    });

  if (count > 0) {
    console.log(`DB: ${count} migration(s) were applied successfully`);
  } else {
    console.log("DB is up to date");
  }
}

/**
 * @param {Database} db
 * @param {string[]} statements
 * @returns {void}
 */
function runNonTransactional(db, statements) {
  statements.forEach((statement) => {
    db.prepare(statement).run();
  });
}

/**
 * @param {Database} db
 * @param {SqlMigration} m
 * @param {string[]} statements
 * @returns {boolean}
 */
function runTransactional(db, m, statements) {
  return db.transaction(() => {
    let applied = false;

    checkVersion(db, m, () => {
      console.log(`DB: migrating to version ${m.version} - ${m.name}`);

      statements.forEach((statement) => {
        db.prepare(statement).run();
      });

      applied = true;
    });

    return applied;
  })();
}

/**
 * @param {Database} db
 * @param {SqlMigration} m
 * @param {() => void} applyChanges
 * @returns {void}
 */
function checkVersion(db, m, applyChanges) {
  const query = db.prepare(`select version from ${dbTable} where version = ?;`);
  const rows = query.all(m.version);
  if (rows.length === 0) {
    applyChanges();

    const insert = db.prepare(
      `insert into ${dbTable} (version, name) values (?, ?);`
    );
    insert.run(m.version, m.name);
  }
}

/**
 * @param {Database} db
 * @returns {Set<number>}
 */
function readCurrentVersions(db) {
  return db.transaction(() => {
    db.prepare(
      `create table if not exists ${dbTable} (
        version  integer primary key,
        name     text not null
      );`
    ).run();

    const query = db.prepare(`select version from ${dbTable};`);
    const rows = query.all();
    return new Set(rows.map((r) => /** @type {number} */ (r.version)));
  })();
}
