import type { PrismaClient } from '@prisma/client';
import type { ApiKeyScope } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    auth: {
      requireApiKey: (
        scope: ApiKeyScope,
      ) => (
        request: import('fastify').FastifyRequest,
        reply: import('fastify').FastifyReply,
      ) => Promise<void>;
    };
  }

  interface FastifyRequest {
    apiKey?: {
      id: string;
      scope: ApiKeyScope;
    };
  }
}
