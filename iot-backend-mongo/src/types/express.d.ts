import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    auth?:
      | { type: 'admin' }
      | { type: 'device'; deviceId: string; deviceObjectId: string };
  }
}
