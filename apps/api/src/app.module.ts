import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { JwtAuthGuard } from './common/jwt-auth.guard.js';
import { RolesGuard } from './common/roles.guard.js';
import * as schema from './db/schema/index.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { ReviewModule } from './modules/review/review.module.js';
import { PracticeModule } from './modules/practice/practice.module.js';
import { ContentAdminModule } from './modules/content-admin/content-admin.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    // Async so DATABASE_URL is read after main.ts loads .env. The pool connects on the first query
    // and is closed on shutdown. Inject with `@InjectDrizzle() private readonly db: Database`.
    DrizzleModule.forRootAsync({
      useFactory: () => ({ drizzle, connection: process.env.DATABASE_URL ?? '', schema }),
    }),
    AuthModule,
    CatalogModule,
    ContentAdminModule,
    PracticeModule,
    ReviewModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    // Order matters: authenticate first, then check roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
