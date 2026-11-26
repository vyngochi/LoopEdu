import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { ReviewController } from './review.controller.js';
import { ReviewRepository } from './review.repository.js';
import { ReviewService } from './review.service.js';

@Module({
  imports: [CatalogModule],
  controllers: [ReviewController],
  providers: [ReviewService, ReviewRepository],
  exports: [ReviewService],
})
export class ReviewModule {}
