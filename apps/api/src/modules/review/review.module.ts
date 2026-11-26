import { Module } from '@nestjs/common';
import { ReviewRepository } from './review.repository.js';
import { ReviewService } from './review.service.js';

@Module({
  providers: [ReviewService, ReviewRepository],
  exports: [ReviewService],
})
export class ReviewModule {}
