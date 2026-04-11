declare module 'tar-stream' {
  import type { Readable, Writable } from 'node:stream';

  export interface Headers {
    name: string;
    size?: number;
    mode?: number;
    type?: 'file' | 'directory';
  }

  export interface Pack extends Readable {
    entry(header: Headers, callback?: (error?: Error | null) => void): Writable;
    entry(
      header: Headers,
      data: Buffer | string,
      callback?: (error?: Error | null) => void
    ): Writable;
    finalize(): void;
  }

  export interface Extract extends Writable {
    on(
      event: 'entry',
      listener: (header: Headers, stream: Readable, next: (error?: Error | null) => void) => void
    ): this;
    on(event: 'finish', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    destroy(error?: Error): this;
  }

  export function pack(): Pack;
  export function extract(): Extract;

  const tarStream: {
    pack: typeof pack;
    extract: typeof extract;
  };

  export default tarStream;
}
