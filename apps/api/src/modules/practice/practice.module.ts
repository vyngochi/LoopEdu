import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { ReviewModule } from '../review/review.module.js';
import { PracticeController } from './practice.controller.js';
import { PracticeRepository } from './practice.repository.js';
import { PracticeService } from './practice.service.js';

@Module({
  imports: [CatalogModule, ReviewModule],
  controllers: [PracticeController],
  providers: [PracticeService, PracticeRepository],
  exports: [PracticeService],
})
export class PracticeModule {}
