import { exec } from 'child_process';
import path from 'path';

export interface BackupResult {
  success: boolean;
  message: string;
  filePath?: string;
  error?: string;
}

export function backupDatabase(databaseUrl: string, outputDir: string): Promise<BackupResult> {
  return new Promise((resolve) => {
    if (!databaseUrl) {
      return resolve({ success: false, message: 'Backup failed', error: 'DATABASE_URL is not set' });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(outputDir, `cargoledger-backup-${timestamp}.dump`);
    exec(`pg_dump -F c "${databaseUrl}" -f "${filePath}"`, (err, _stdout, stderr) => {
      if (err) return resolve({ success: false, message: 'Backup failed', error: stderr });
      resolve({ success: true, message: 'Backup completed', filePath });
    });
  });
}

export function restoreDatabase(databaseUrl: string, filePath: string): Promise<BackupResult> {
  return new Promise((resolve) => {
    if (!databaseUrl) {
      return resolve({ success: false, message: 'Restore failed', error: 'DATABASE_URL is not set' });
    }
    exec(`pg_restore --clean -d "${databaseUrl}" "${filePath}"`, (err, _stdout, stderr) => {
      if (err) return resolve({ success: false, message: 'Restore failed', error: stderr });
      resolve({ success: true, message: 'Restore completed' });
    });
  });
}
