import fs from "fs";

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
  try {
    if (!fs.lstatSync(migrationsDir).isDirectory()) {
      console.error(`"Error: ${migrationsDir}" is not a directory`);
      return;
    }
  } catch (_) {
    console.error(`Error: Migrations folder "${migrationsDir}" doesn't exist`);
    return;
  }

  console.log(`migrationsDir: "${migrationsDir}"`);
}
