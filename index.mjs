/**
 * @typedef {import("./index.mjs").WebSqlMigrationBundle} WebSqlMigrationBundle
 */

const versionAndNameRegex = /V(\d+)__(.+).sql/;

/**
 * @param {WebSqlMigrationBundle} bundle
 * @returns {Promise<void>}
 */
export function runBundle(bundle) {
  return Promise.resolve();
}
