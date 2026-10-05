import 'dotenv/config';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Xóa và dựng lại database trước khi chạy bất kỳ test nào.
    globalSetup: ['tests/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      // Test luôn dùng database riêng, không bao giờ chạm database phát triển.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
    },
    // Các test dùng chung một database nên chạy tuần tự, không song song.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
