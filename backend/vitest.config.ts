import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './tests/setup.ts',
    env: { NODE_ENV: 'test', DB_NAME: 'terra_brasa_test', JWT_SECRET: 'terra-brasa-test-secret-local' },
    fileParallelism: false,
    globals: true,
    include: ['tests/**/*.spec.ts'],
    testTimeout: 20000,
    hookTimeout: 30000
  }
});
