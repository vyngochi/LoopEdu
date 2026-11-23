import { Module } from '@nestjs/common';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './db/schema/index.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    // Async so DATABASE_URL is read after main.ts loads .env. The pool connects on the first query
    // and is closed on shutdown. Inject with `@InjectDrizzle() private readonly db: Database`.
    DrizzleModule.forRootAsync({
      useFactory: () => ({ drizzle, connection: process.env.DATABASE_URL ?? '', schema }),
    }),
    HealthModule,
  ],
})
export class AppModule {}
