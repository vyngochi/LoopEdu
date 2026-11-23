import { Test } from '@nestjs/testing';
import { HealthResponseSchema } from '@loopedu/shared';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('returns a response that matches the shared contract', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    const body = moduleRef.get(HealthController).check();

    expect(HealthResponseSchema.safeParse(body).success).toBe(true);
  });
});
