import http from 'http';
import { buildApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import { initSocket } from './services/socket';

async function main() {
  await connectDb();

  const app = buildApp();
  const server = http.createServer(app);

  initSocket(server);

  server.listen(env.port, () => {
    console.log(`IoT backend listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
