import { defineConfig } from '@playwright/test';
import chromium from '@sparticuz/chromium';
const bundled = process.env.USE_BUNDLED_CHROMIUM === '1';
export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: 'http://localhost:3200',
    headless: true,
    launchOptions: bundled
      ? {
          executablePath: process.env.BROWSER_EXECUTABLE || (await chromium.executablePath()),
          args: [
            '--disable-dev-shm-usage',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
          ],
        }
      : {},
  },
  webServer: {
    command: 'node tests/browser-server.js',
    url: 'http://localhost:3200/api/health',
    reuseExistingServer: false,
    timeout: 30000,
  },
  reporter: 'list',
});
