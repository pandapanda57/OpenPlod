import { existsSync } from 'node:fs';
import { open } from 'node:fs/promises';

export async function openPlaudCheckpoint(path: string, prefixLength: number) {
  // Not 'a+': Windows refuses to truncate a file opened for append (EPERM ftruncate).
  const file = await open(path, existsSync(path) ? 'r+' : 'w+', 0o600);
  let written = prefixLength;
  try { await file.truncate(written); } catch (error) { await file.close(); throw error; }
  return {
    async save(bytes: Uint8Array) {
      if (bytes.length < written) throw new Error('Plaud checkpoint cannot shrink');
      while (written < bytes.length) {
        const rest = bytes.subarray(written);
        const result = await file.write(rest, 0, rest.length, written);
        if (!result.bytesWritten) throw new Error('Plaud checkpoint write made no progress');
        written += result.bytesWritten;
      }
      await file.sync();
    },
    close: () => file.close(),
  };
}
