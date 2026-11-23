import { StandardSchemaValidationPipe, type INestApplication } from '@nestjs/common';

/** Settings shared by main.ts and the e2e tests, so tests hit the same URLs as production. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map((o) => o.trim()),
    credentials: true,
  });
  // Validates every @Body/@Query/@Param that declares a Zod schema; the filter maps failures to VALIDATION_FAILED.
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  // Behind a proxy (Cloudflare Tunnel) req.ip would be the proxy, so the per-IP limit would hit everyone at once.
  if (process.env.TRUST_PROXY) {
    app.getHttpAdapter().getInstance().set('trust proxy', Number(process.env.TRUST_PROXY));
  }
  app.enableShutdownHooks();
}
