export interface MigrationBundleItem {
  readonly file: string;
  readonly content: string;
}

export type WebSqlMigrationBundle = MigrationBundleItem[];

export function runBundle(bundle: WebSqlMigrationBundle): Promise<void>;
