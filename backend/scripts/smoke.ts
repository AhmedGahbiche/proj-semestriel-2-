import path from 'node:path';

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { buildApp } from '../src/app';

async function main() {
  const app = await buildApp({ startJobs: false });
  await app.listen({ port: 0, host: '127.0.0.1' });

  const address = app.server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to determine server address');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const health = await fetch(`${baseUrl}/api/health`);
    if (!health.ok) {
      throw new Error(`health failed: ${health.status}`);
    }

    const body = await health.json();
    console.log('health ok:', body);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
