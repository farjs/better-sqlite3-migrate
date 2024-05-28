import Database from "@farjs/better-sqlite3-wrapper";

export interface MigrationBundleItem {
  readonly file: string;
  readonly content: string;
}

export type MigrationBundle = MigrationBundleItem[];

export function runBundle(db: Database, bundle: MigrationBundle): Promise<void>;
