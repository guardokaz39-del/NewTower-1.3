/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['__tests__/**/*.test.ts'],
        setupFiles: ['__tests__/setup.ts'],
    },
});
