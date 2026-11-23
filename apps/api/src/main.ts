import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
  // OpenAPI UI at /api/docs, never exposed in production.
  if (process.env.APP_ENV !== 'production') {
    const config = new DocumentBuilder().setTitle('LoopEdu API').setVersion('1').build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
  await app.listen(process.env.API_PORT ?? process.env.PORT ?? 4000);
}
await bootstrap();
