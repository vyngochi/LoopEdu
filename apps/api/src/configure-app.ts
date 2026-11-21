import type { INestApplication } from '@nestjs/common';

/** Settings shared by main.ts and the e2e tests, so tests hit the same URLs as production. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map((o) => o.trim()),
    credentials: true,
  });
  app.enableShutdownHooks();
}
