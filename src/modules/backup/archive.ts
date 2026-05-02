import { createGunzip, createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import tarStream, { type Pack } from 'tar-stream';

type ArchiveEntryHandler = (entry: {
  name: string;
  size: number;
  stream: NodeJS.ReadableStream;
}) => Promise<void>;

/**
 * Создаёт tar.gz поток для последующей загрузки в blob.
 * @returns tar pack и gzip stream.
 */
export const createTarGzArchive = (): {
  pack: Pack;
  stream: NodeJS.ReadableStream;
} => {
  const pack = tarStream.pack();
  const gzip = createGzip();

  return {
    pack,
    stream: pack.pipe(gzip)
  };
};

/**
 * Добавляет буфер в tar-архив как отдельный файл.
 * @param pack - tar pack.
 * @param name - имя entry внутри архива.
 * @param buffer - содержимое файла.
 */
export const addBufferArchiveEntry = async (
  pack: Pack,
  name: string,
  buffer: Buffer
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    pack.entry(
      {
        name,
        size: buffer.length,
        mode: 0o644,
        type: 'file'
      },
      buffer,
      error => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      }
    );
  });
};

/**
 * Добавляет поток в tar-архив как отдельный файл.
 * @param pack - tar pack.
 * @param name - имя entry внутри архива.
 * @param size - ожидаемый размер файла.
 * @param stream - поток содержимого.
 */
export const addStreamArchiveEntry = async (
  pack: Pack,
  name: string,
  size: number,
  stream: NodeJS.ReadableStream
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const entry = pack.entry(
      {
        name,
        size,
        mode: 0o644,
        type: 'file'
      },
      error => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      }
    );

    entry.on('error', reject);
    stream.on('error', reject);
    stream.pipe(entry);
  });
};

/**
 * Финализирует tar pack после записи всех entry.
 * @param pack - tar pack.
 */
export const finalizeTarArchive = (pack: Pack): void => {
  pack.finalize();
};

/**
 * Последовательно извлекает tar.gz архив, отдавая каждый entry в callback.
 * @param source - gzip-поток архива.
 * @param onEntry - обработчик entry.
 */
export const extractTarGzArchive = async (
  source: NodeJS.ReadableStream,
  onEntry: ArchiveEntryHandler
): Promise<void> => {
  const extract = tarStream.extract();

  const finished = new Promise<void>((resolve, reject) => {
    extract.on('entry', (header, stream, next) => {
      const nodeStream = stream as NodeJS.ReadableStream;

      void (async () => {
        try {
          await onEntry({
            name: header.name,
            size: Number(header.size ?? 0),
            stream: nodeStream
          });
          next();
        } catch (error) {
          nodeStream.resume();
          extract.destroy(error instanceof Error ? error : new Error(String(error)));
          reject(error);
        }
      })();
    });

    extract.on('finish', resolve);
    extract.on('error', reject);
  });

  await pipeline(source, createGunzip(), extract);
  await finished;
};

/**
 * Преобразует web stream из Blob SDK в Node.js поток.
 * @param stream - web-поток.
 * @returns Node.js поток.
 */
export const toNodeReadableStream = (stream: ReadableStream<Uint8Array>): NodeJS.ReadableStream => {
  return Readable.fromWeb(stream as unknown as NodeReadableStream);
};
