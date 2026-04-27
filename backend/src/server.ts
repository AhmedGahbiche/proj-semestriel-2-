import path from 'node:path';

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { buildApp } from './app';

const port = Number(process.env.PORT ?? 4000);

async function main() {
  const app = await buildApp({ startJobs: true });

  await app.listen({ port, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
