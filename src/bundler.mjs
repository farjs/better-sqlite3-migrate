/**
 * @typedef {import("../index.mjs").MigrationBundle} MigrationBundle
 */
import fs from "fs";
import path from "path";

const bundleFileName = "bundle.json";

/**
 * @param {string[]} args
 * @returns {Promise<void>}
 */
export async function createBundle(args) {
  if (args.length === 0) {
    console.error("Error: Migrations folder path expected as first argument");
    return;
  }

  const migrationsDir = args[0];
  const dirStats = getFileStats(migrationsDir);
  if (!dirStats) {
    console.error(`Error: Migrations folder "${migrationsDir}" doesn't exist`);
    return;
  }
  if (!dirStats.isDirectory()) {
    console.error(`Error: "${migrationsDir}" is not a directory`);
    return;
  }

  const allFiles = fs.readdirSync(migrationsDir);
  let lastModified = 0;
  let sqlFiles = /** @type {string[]} */ ([]);
  allFiles
    .sort((a, b) => a.localeCompare(b))
    .forEach((f) => {
      if (f.endsWith(".sql") || f.endsWith(".SQL")) {
        const stats = fs.lstatSync(path.join(migrationsDir, f));
        if (lastModified < stats.mtimeMs) {
          lastModified = stats.mtimeMs;
        }
        sqlFiles.push(f);
      }
    });

  const migrationsBundle = path.join(migrationsDir, bundleFileName);
  const bundleStats = getFileStats(migrationsBundle);
  if (!bundleStats || bundleStats.mtimeMs !== lastModified) {
    /** @type {MigrationBundle} */
    const bundleObj = sqlFiles.map((file) => {
      return {
        file,
        content: fs.readFileSync(path.join(migrationsDir, file)).toString(),
      };
    });

    fs.writeFileSync(
      migrationsBundle,
      JSON.stringify(bundleObj, undefined, 2),
      { encoding: "utf8" }
    );
    fs.utimesSync(
      migrationsBundle,
      fs.lstatSync(migrationsBundle).atimeMs / 1000,
      lastModified / 1000
    );
    console.log(`Generated SQL bundle file: ${migrationsBundle}`);
    return;
  }

  console.log("Nothing to generate, SQL bundle is up to date!");
}

/**
 * @param {string} file
 * @returns {fs.Stats | undefined}
 */
function getFileStats(file) {
  try {
    return fs.lstatSync(file);
  } catch (_) {
    return undefined;
  }
}
