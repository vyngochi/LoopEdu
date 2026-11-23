import { expect, test } from '@playwright/test';
import { HealthResponseSchema } from '@loopedu/shared';

const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

test('API health matches the shared contract', async ({ request }) => {
  const res = await request.get(`${apiUrl}/api/v1/health`);
  expect(res.ok()).toBe(true);
  expect(HealthResponseSchema.safeParse(await res.json()).success).toBe(true);
});

test('landing page renders its headline', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Luyện nói tiếng Anh');
});
