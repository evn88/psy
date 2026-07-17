import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Копирует обязательные runtime-ресурсы в standalone bundle.
 * @param {string} sourcePath - исходная директория.
 * @param {string} targetPath - директория внутри standalone bundle.
 */
const copyRuntimeDirectory = async (sourcePath, targetPath) => {
  await stat(sourcePath);
  await rm(targetPath, { force: true, recursive: true });
  await mkdir(dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, { recursive: true });
};

await copyRuntimeDirectory(
  join(projectRoot, 'public'),
  join(projectRoot, '.next', 'standalone', 'public')
);
await copyRuntimeDirectory(
  join(projectRoot, '.next', 'static'),
  join(projectRoot, '.next', 'standalone', '.next', 'static')
);
