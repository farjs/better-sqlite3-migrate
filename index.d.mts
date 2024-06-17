import { URL } from "node:url";
import Database from "@farjs/better-sqlite3-wrapper";

export interface MigrationBundleItem {
  readonly file: string;
  readonly content: string;
}

export type MigrationBundle = MigrationBundleItem[];

export function readBundle(url: URL): Promise<MigrationBundle>;

export function runBundle(db: Database, bundle: MigrationBundle): Promise<void>;

export function createBundle(args: string[]): Promise<void>;
