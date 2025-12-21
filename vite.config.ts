import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig({
    root: './',
    base: './', // Use relative paths for assets
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
    },
    plugins: [
        checker({ typescript: true }), // Type check on build/dev
    ],
    server: {
        open: true, // Open browser on start
        port: 8080,
    },
    preview: {
        port: 8080,
    },
});
