[![CI](https://github.com/farjs/better-sqlite3-migrate/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/farjs/better-sqlite3-migrate/actions/workflows/ci.yml?query=workflow%3Aci+branch%3Amain)
[![Coverage Status](https://coveralls.io/repos/github/farjs/better-sqlite3-migrate/badge.svg?branch=main)](https://coveralls.io/github/farjs/better-sqlite3-migrate?branch=main)
[![npm version](https://img.shields.io/npm/v/@farjs/better-sqlite3-migrate)](https://www.npmjs.com/package/@farjs/better-sqlite3-migrate)

## @farjs/better-sqlite3-migrate

Automates Sqlite DB schema versioning.

Uses [wrapper](https://github.com/farjs/better-sqlite3-wrapper)
around [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
and [bun:sqlite](https://bun.sh/docs/api/sqlite)
to allow cross- runtime/engine usage.

### SQL Migrations Scripts

Add your `SQL` migrations scripts, for example:

- [V001\_\_initial_db_structure.sql](test/migrations/V001__initial_db_structure.sql)
- [V002\_\_rename_db_field.sql](test/migrations/V002__rename_db_field.sql)
