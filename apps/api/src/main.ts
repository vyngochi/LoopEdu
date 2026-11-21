import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

// Local/staging read the monorepo-root .env; production injects real env vars instead.
try {
  process.loadEnvFile(resolve(import.meta.dirname, '../../../.env'));
} catch {
  // No .env file: rely on the environment.
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(process.env.API_PORT ?? process.env.PORT ?? 4000);
}
await bootstrap();
