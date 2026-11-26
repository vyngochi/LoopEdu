import { Module } from '@nestjs/common';
import { ContentAdminController } from './content-admin.controller.js';
import { ContentAdminRepository } from './content-admin.repository.js';
import { ContentAdminService } from './content-admin.service.js';

@Module({
  controllers: [ContentAdminController],
  providers: [ContentAdminService, ContentAdminRepository],
  exports: [ContentAdminService],
})
export class ContentAdminModule {}
