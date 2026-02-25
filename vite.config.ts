import { defineConfig, Plugin } from 'vite';
import checker from 'vite-plugin-checker';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Vite plugin: автогенерация public/maps/_index.json
 * Сканирует public/maps/ при старте и при изменении файлов в dev-режиме.
 */
function mapsIndexPlugin(): Plugin {
    const mapsDir = path.resolve(__dirname, 'public/maps');

    function regenerateIndex() {
        if (!fs.existsSync(mapsDir)) {
            fs.mkdirSync(mapsDir, { recursive: true });
        }
        const files = fs.readdirSync(mapsDir)
            .filter(f => f.endsWith('.json') && !f.startsWith('_'));
        const index = files.map(f => f.replace('.json', ''));
        const indexPath = path.join(mapsDir, '_index.json');
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
        console.log(`[maps-index] Generated _index.json: [${index.join(', ')}]`);
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    return {
        name: 'maps-index',
        buildStart() {
            regenerateIndex();
        },
        configureServer(server) {
            // Watch public/maps/ for added/removed JSON files → regenerate + full-reload
            const handleChange = (filePath: string) => {
                if (!filePath.includes(path.normalize('public/maps'))) return;
                if (!filePath.endsWith('.json') || path.basename(filePath).startsWith('_')) return;

                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    regenerateIndex();
                    server.ws.send({ type: 'full-reload' });
                }, 300);
            };

            server.watcher.on('add', handleChange);
            server.watcher.on('unlink', handleChange);
        },
    };
}

export default defineConfig({
    root: './',
    base: './', // Use relative paths for assets
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
    },
    plugins: [
        mapsIndexPlugin(),
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
