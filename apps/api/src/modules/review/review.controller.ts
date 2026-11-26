import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  CompleteReviewRequestSchema,
  IdParamSchema,
  ListReviewsQuerySchema,
  ReviewSessionQuerySchema,
  type CompleteReviewRequest,
  type ListReviewsQuery,
  type ReviewList,
  type ReviewSession,
  type ReviewSessionQuery,
} from '@loopedu/shared';
import { CurrentUser, type AuthUser } from '../../common/current-user.js';
import { ReviewService } from './review.service.js';

@Controller()
export class ReviewController {
  constructor(private readonly reviews: ReviewService) {}

  @Get('reviews')
  list(@CurrentUser() user: AuthUser, @Query({ schema: ListReviewsQuerySchema }) q: ListReviewsQuery): Promise<ReviewList> {
    return this.reviews.listDue(user.id, q.limit, q.offset);
  }

  @Get('review-tasks/:id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: IdParamSchema }) id: string,
    @Query({ schema: ReviewSessionQuerySchema }) q: ReviewSessionQuery,
  ): Promise<ReviewSession> {
    return this.reviews.getSession(user.id, id, q.supportLevel);
  }

  @Post('review-tasks/:id/complete')
  @HttpCode(200)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: IdParamSchema }) id: string,
    @Body({ schema: CompleteReviewRequestSchema }) body: CompleteReviewRequest,
  ): Promise<ReviewSession> {
    return this.reviews.complete(user.id, id, body);
  }
}
