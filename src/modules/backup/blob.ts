import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import {
  del,
  get,
  head,
  list,
  type ListBlobResultBlob,
  put,
  type PutBlobResult
} from '@vercel/blob';
import { BACKUP_JOB_STATUS_CACHE_SECONDS } from '@/lib/config/backup';
import type { BackupBlobStore } from './types';

type BlobStoreConfig = {
  access: BackupBlobStore;
  token: string;
};

/**
 * Возвращает конфигурацию публичного или приватного blob store.
 * @param store - тип хранилища.
 * @returns Access + токен для SDK.
 */
const getBlobStoreConfig = (store: BackupBlobStore): BlobStoreConfig => {
  if (store === 'private') {
    const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;

    if (!token) {
      throw new Error('Не задан PRIVATE_BLOB_READ_WRITE_TOKEN для резервного копирования.');
    }

    return {
      access: 'private',
      token
    };
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error('Не задан BLOB_READ_WRITE_TOKEN для резервного копирования.');
  }

  return {
    access: 'public',
    token
  };
};

/**
 * Возвращает все blob-объекты выбранного store с постраничной выборкой.
 * @param store - публичное или приватное хранилище.
 * @returns Полный список blob-файлов.
 */
export const listAllBackupBlobs = async (store: BackupBlobStore): Promise<ListBlobResultBlob[]> => {
  const { token } = getBlobStoreConfig(store);
  const blobs: ListBlobResultBlob[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await list({
      token,
      cursor,
      limit: 1_000
    });

    blobs.push(...response.blobs);
    hasMore = response.hasMore;
    cursor = response.cursor;
  }

  return blobs;
};

/**
 * Загружает blob как Node.js поток вместе с метаданными.
 * @param store - тип хранилища.
 * @param pathname - pathname объекта.
 * @returns Поток содержимого и минимальные метаданные.
 */
export const getBackupBlobStream = async (
  store: BackupBlobStore,
  pathname: string
): Promise<{
  stream: NodeJS.ReadableStream;
  size: number;
  contentType: string;
  url: string;
}> => {
  const config = getBlobStoreConfig(store);
  const result = await get(pathname, {
    access: config.access,
    token: config.token,
    useCache: false
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`Blob не найден: ${pathname}`);
  }

  return {
    stream: Readable.fromWeb(result.stream as unknown as NodeReadableStream),
    size: result.blob.size,
    contentType: result.blob.contentType,
    url: result.blob.url
  };
};

/**
 * Загружает метаданные blob без чтения содержимого.
 * @param store - тип хранилища.
 * @param pathname - pathname объекта.
 * @returns Контент-тип и URL blob.
 */
export const headBackupBlob = async (
  store: BackupBlobStore,
  pathname: string
): Promise<{
  contentType: string;
  url: string;
}> => {
  const { token } = getBlobStoreConfig(store);
  const result = await head(pathname, { token });

  return {
    contentType: result.contentType,
    url: result.url
  };
};

/**
 * Загружает поток в blob store с поддержкой больших файлов.
 * @param store - тип хранилища.
 * @param pathname - целевой pathname.
 * @param body - входной поток.
 * @param contentType - MIME-тип.
 * @returns Результат записи blob.
 */
export const putBackupBlobStream = async (
  store: BackupBlobStore,
  pathname: string,
  body: NodeJS.ReadableStream,
  contentType: string
): Promise<PutBlobResult> => {
  const config = getBlobStoreConfig(store);

  return put(pathname, body, {
    access: config.access,
    token: config.token,
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    multipart: true
  });
};

/**
 * Сохраняет JSON-файл статуса или manifest в private blob.
 * @param pathname - целевой pathname.
 * @param value - сериализуемое значение.
 * @returns Результат записи.
 */
export const putPrivateJsonBlob = async <T>(pathname: string, value: T): Promise<PutBlobResult> => {
  const { token } = getBlobStoreConfig('private');

  return put(pathname, Buffer.from(JSON.stringify(value, null, 2), 'utf8'), {
    access: 'private',
    token,
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: BACKUP_JOB_STATUS_CACHE_SECONDS
  });
};

/**
 * Загружает небольшой JSON-файл из private blob.
 * @param pathname - путь до JSON-файла.
 * @returns Десериализованное содержимое либо `null`.
 */
export const getPrivateJsonBlob = async <T>(pathname: string): Promise<T | null> => {
  const { token } = getBlobStoreConfig('private');
  const result = await get(pathname, {
    access: 'private',
    token,
    useCache: false
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return null;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of Readable.fromWeb(result.stream as unknown as NodeReadableStream)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
};

/**
 * Удаляет набор blob-файлов из выбранного хранилища.
 * @param store - тип хранилища.
 * @param pathnames - список pathname.
 */
export const deleteBackupBlobs = async (
  store: BackupBlobStore,
  pathnames: string[]
): Promise<void> => {
  if (pathnames.length === 0) {
    return;
  }

  const { token } = getBlobStoreConfig(store);
  await del(pathnames, { token });
};
