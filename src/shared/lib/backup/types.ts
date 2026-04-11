export type BackupJobKind = 'create' | 'restore';

export type BackupJobState =
  | 'queued'
  | 'running'
  | 'canceling'
  | 'canceled'
  | 'completed'
  | 'failed';

export type BackupJobPhase =
  | 'preparing'
  | 'database'
  | 'archive'
  | 'upload'
  | 'shadow'
  | 'cleanup'
  | 'restore'
  | 'done';

export type BackupArchiveKind = 'manual' | 'shadow';

export type BackupBlobStore = 'public' | 'private';

export interface BackupJobEvent {
  id: string;
  createdAt: string;
  phase: BackupJobPhase;
  message: string;
  progress: number;
}

export interface BackupJobSnapshot {
  id: string;
  kind: BackupJobKind;
  state: BackupJobState;
  phase: BackupJobPhase;
  progress: number;
  currentStep: string;
  workflowRunId?: string;
  cancelRequestedAt?: string;
  cancelledAt?: string;
  databaseArchivePathname?: string;
  databaseArchiveFileName?: string;
  databaseArchiveDownloadUrl?: string;
  shadowDatabaseArchivePathname?: string;
  shadowDatabaseArchiveFileName?: string;
  sourceDatabaseUploadPathname?: string;
  sourceDatabaseUploadFileName?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  events: BackupJobEvent[];
}

export interface BackupArchiveTableColumn {
  name: string;
  dataType: string;
  udtName: string;
  isNullable: boolean;
  ordinalPosition: number;
}

export interface BackupArchiveTableRecord {
  name: string;
  order: number;
  rowCount: number;
  primaryKey: string[];
  dependsOn: string[];
  columns: BackupArchiveTableColumn[];
}

interface BaseBackupArchiveManifest {
  version: number;
  createdAt: string;
  archiveKind: BackupArchiveKind;
  artifact: 'database';
}

export interface DatabaseBackupArchiveManifest extends BaseBackupArchiveManifest {
  artifact: 'database';
  database: {
    tableCount: number;
    tables: BackupArchiveTableRecord[];
  };
}

export type BackupArchiveManifest = DatabaseBackupArchiveManifest;

export interface BackupProgressInput {
  phase: BackupJobPhase;
  message: string;
  progress: number;
}

export type BackupProgressReporter = (input: BackupProgressInput) => Promise<void>;

export interface BackupArchiveResult<
  TManifest extends BackupArchiveManifest = BackupArchiveManifest
> {
  artifact: 'database';
  manifest: TManifest;
  pathname: string;
  fileName: string;
  url: string;
}

export interface RestoreSiteBackupInput {
  databaseArchivePathname: string;
  databaseArchiveFileName?: string;
}

export interface DatabaseTableRowsDocument {
  table: string;
  rows: Array<Record<string, unknown>>;
}
