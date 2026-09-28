declare module 'multer' {
  import { Request, Response } from 'express';

  interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }

  interface MulterError extends Error {
    code: string;
    field?: string;
  }

  interface StorageEngine {
    _handleFile(req: Request, file: File, callback: (error?: any, info?: Partial<File>) => void): void;
    _removeFile(req: Request, file: File, callback: (error?: any) => void): void;
  }

  interface DiskStorageOptions {
    destination?: string | ((req: Request, file: File, cb: (error: any, destination: string) => void) => void);
    filename?: (req: Request, file: File, cb: (error: any, filename: string) => void) => void;
  }

  interface Options {
    storage?: StorageEngine;
    dest?: string;
    limits?: { fileSize?: number; files?: number; fields?: number; fieldSize?: number; fieldNameSize?: number; parts?: number; headerPairs?: number };
    preservePath?: boolean;
    fileFilter?: (req: Request, file: File, callback: (error: any, acceptFile: boolean) => void) => void;
  }

  function diskStorage(options: DiskStorageOptions): StorageEngine;
  function memoryStorage(): StorageEngine;

  export { diskStorage, memoryStorage, File, MulterError, Options, DiskStorageOptions, StorageEngine };
}

declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
    }
  }
}
