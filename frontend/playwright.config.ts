import { defineConfig, devices } from '@playwright/test';

const BACKEND_PORT = 3100;
const FRONTEND_PORT = 5180;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run start -w @merch/backend',
      cwd: '..',
      url: `http://localhost:${BACKEND_PORT}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: String(BACKEND_PORT),
        PERSISTENCE: 'memory',
        STORAGE_DRIVER: 'local',
        PUBLIC_BASE_URL: `http://localhost:${BACKEND_PORT}`,
        CORS_ORIGIN: `http://localhost:${FRONTEND_PORT}`,
        PAYMENT_RESULT_URL: `http://localhost:${FRONTEND_PORT}/payment-result`,
        LIQPAY_PUBLIC_KEY: '',
        LIQPAY_PRIVATE_KEY: '',
        NOVA_POSHTA_API_KEY: '',
        SMTP_HOST: '',
      },
    },
    {
      command: `npm run dev -- --port ${FRONTEND_PORT}`,
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { BACKEND_URL: `http://localhost:${BACKEND_PORT}` },
    },
  ],
});
