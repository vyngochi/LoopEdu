import { defineConfig } from '@playwright/test';

const webUrl = process.env.APP_URL ?? 'http://localhost:3000';
const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

// Locally, reuse `pnpm dev`; in CI start the built apps (run `pnpm build` first).
export default defineConfig({
  testDir: './tests',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: webUrl,
    trace: 'on-first-retry',
    // Local runs use the installed Chrome; CI installs Chromium (`playwright install --with-deps chromium`).
    channel: process.env.CI ? undefined : 'chrome',
  },
  webServer: [
    { command: 'pnpm --filter @loopedu/api start:prod', url: `${apiUrl}/api/v1/health`, reuseExistingServer: !process.env.CI },
    { command: 'pnpm --filter @loopedu/web start', url: webUrl, reuseExistingServer: !process.env.CI },
  ],
});
