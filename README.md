[![CI](https://github.com/farjs/better-sqlite3-migrate/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/farjs/better-sqlite3-migrate/actions/workflows/ci.yml?query=workflow%3Aci+branch%3Amain)
[![Coverage Status](https://coveralls.io/repos/github/farjs/better-sqlite3-migrate/badge.svg?branch=main)](https://coveralls.io/github/farjs/better-sqlite3-migrate?branch=main)
[![npm version](https://img.shields.io/npm/v/@farjs/better-sqlite3-migrate)](https://www.npmjs.com/package/@farjs/better-sqlite3-migrate)

## @farjs/better-sqlite3-migrate

Automates Sqlite DB schema versioning.

Uses [wrapper](https://github.com/farjs/better-sqlite3-wrapper)
around [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
and [bun:sqlite](https://bun.sh/docs/api/sqlite)
to allow cross- runtime/engine usage.

### How to use it

#### 1. Add SQL Migrations Scripts

Add your `SQL` migrations scripts under dedicated project sub-folder, for ex. `./migrations`.

See example SQL migrations scripts:

- [V001\_\_initial_db_structure.sql](test/migrations/V001__initial_db_structure.sql)
- [V002\_\_rename_db_field.sql](test/migrations/V002__rename_db_field.sql)

#### 2. Generate `bundle.json` migrations file

To generate singe migrations bundle file you can use `sql-bundle` script and run it as part of build process.

For example, in your `package.json`:

```json
"scripts": {
  "sql-bundle": "npx sql-bundle ./migrations"
}
```

Then run it as follows:

```bash
npm run sql-bundle
```

`bundle.json` file will be (re)generated in the same `./migrations` folder.

#### 3. Exclude `bundle.json` file from `git`

Since it can be easily generated from the input `SQL` migrations files there is no need to commit this file.

You can exclude it by adding the following line to your
`.gitignore` file:

```bash
migrations/bundle.json
```

#### 4. Load and run migrations bundle

The final setup is to actually load and apply migrations on your `Sqlite` DB during app startup:

```javascript
import Database from "@farjs/better-sqlite3-wrapper";
import { readBundle, runBundle } from "@farjs/better-sqlite3-migrate";

// connect to your DB
const db = new Database(":memory:");

const bundleUrl = new URL("./migrations/bundle.json", import.meta.url);

// load migrations bundle
const bundle = await readBundle(bundleUrl);

// apply it
await runBundle(db, bundle);
```

This will create (or update existing) `schema_versions` DB table with the all SQL migrations that were applied.

So, next time it will only apply new SQL migrations, that were not applied before (not exist in `schema_versions` table yet).
