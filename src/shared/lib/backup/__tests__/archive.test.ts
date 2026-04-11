import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import {
  addBufferArchiveEntry,
  addStreamArchiveEntry,
  createTarGzArchive,
  extractTarGzArchive,
  finalizeTarArchive
} from '../archive';
import { readNodeStreamToBuffer } from '../utils';

describe('backup archive helpers', () => {
  it('архив сохраняет буферные и потоковые entry без потери данных', async () => {
    // Arrange
    const { pack, stream } = createTarGzArchive();
    const archiveBufferPromise = readNodeStreamToBuffer(stream);
    const extractedEntries = new Map<string, string>();

    await addBufferArchiveEntry(pack, 'manifest.json', Buffer.from('{"ok":true}', 'utf8'));
    await addStreamArchiveEntry(
      pack,
      'blobs/public/000001.bin',
      Buffer.byteLength('stream-data'),
      Readable.from(Buffer.from('stream-data', 'utf8'))
    );
    finalizeTarArchive(pack);
    const archiveBuffer = await archiveBufferPromise;

    // Act
    await extractTarGzArchive(Readable.from(archiveBuffer), async entry => {
      const buffer = await readNodeStreamToBuffer(entry.stream);
      extractedEntries.set(entry.name, buffer.toString('utf8'));
    });

    // Assert
    expect(extractedEntries.get('manifest.json')).toBe('{"ok":true}');
    expect(extractedEntries.get('blobs/public/000001.bin')).toBe('stream-data');
  });
});
