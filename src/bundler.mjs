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
  let lastModifiedMs = 0;
  let sqlFiles = /** @type {string[]} */ ([]);
  allFiles
    .sort((a, b) => a.localeCompare(b))
    .forEach((f) => {
      if (f.endsWith(".sql") || f.endsWith(".SQL")) {
        const stats = fs.lstatSync(path.join(migrationsDir, f));
        if (lastModifiedMs < stats.mtimeMs) {
          lastModifiedMs = stats.mtimeMs;
        }
        sqlFiles.push(f);
      }
    });

  const migrationsBundle = path.join(migrationsDir, bundleFileName);
  const bundleStats = getFileStats(migrationsBundle);
  const lastModifiedSeconds = lastModifiedMs / 1000;
  if (
    !bundleStats ||
    Math.trunc(bundleStats.mtimeMs / 1000) !== Math.trunc(lastModifiedSeconds)
  ) {
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
    fs.utimesSync(migrationsBundle, lastModifiedSeconds, lastModifiedSeconds);
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
