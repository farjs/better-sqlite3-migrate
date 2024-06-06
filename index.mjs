/**
 * @typedef {import("@farjs/better-sqlite3-wrapper").Database} Database
 * @typedef {import("./index.mjs").MigrationBundle} MigrationBundle
 */

/**
 * @param {Database} db
 * @param {MigrationBundle} bundle
 * @returns {Promise<void>}
 */
export async function runBundle(db, bundle) {
  const { runBundle } = await import("./src/runner.mjs");
  return runBundle(db, bundle);
}

/**
 * @param {string[]} args
 * @returns {Promise<void>}
 */
export async function createBundle(args) {
  const { createBundle } = await import("./src/bundler.mjs");
  return createBundle(args);
}
