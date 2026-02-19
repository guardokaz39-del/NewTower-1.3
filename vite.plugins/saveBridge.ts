import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';
import { fromStorageFileName, toStorageFileName } from '../src/modules/persistence/fileIdCodec';

const SAVE_ROOT = path.resolve(process.cwd(), 'saves');

function isSafeSegment(value: string): boolean {
    if (!value || value.trim().length === 0) return false;
    const lower = value.toLowerCase();
    return !(
        value.includes('/') ||
        value.includes('\\') ||
        value.includes('..') ||
        lower.includes('%2e')
    );
}

function decodeUrlSegment(value: string): string | null {
    try {
        return decodeURIComponent(value);
    } catch {
        return null;
    }
}

function readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        req.on('error', reject);
    });
}

async function writeJsonAtomic(targetFile: string, payload: unknown): Promise<void> {
    const dir = path.dirname(targetFile);
    await fs.mkdir(dir, { recursive: true });
    const tempFile = `${targetFile}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(payload, null, 2), 'utf-8');
    await fs.rename(tempFile, targetFile);
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
}

function parseRoute(urlPath: string): { namespace?: string; id?: string } {
    const parts = urlPath.split('/').filter(Boolean);

    const namespace = parts[2] ? decodeUrlSegment(parts[2]) : undefined;
    const id = parts[3] ? decodeUrlSegment(parts[3]) : undefined;

    return {
        namespace: namespace ?? undefined,
        id: id ?? undefined,
    };
}

async function createStorageMiddleware(req: IncomingMessage, res: ServerResponse, server: ViteDevServer): Promise<boolean> {
    if (!req.url) return false;

    const [pathname] = req.url.split('?');

    if (pathname === '/api/status' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, mode: 'file' });
        return true;
    }

    if (!pathname.startsWith('/api/storage/')) return false;

    const { namespace, id } = parseRoute(pathname);
    if (!namespace || !isSafeSegment(namespace)) {
        sendJson(res, 400, { error: 'Invalid namespace' });
        return true;
    }

    if (req.method === 'GET' && !id) {
        const nsDir = path.join(SAVE_ROOT, namespace);
        await fs.mkdir(nsDir, { recursive: true });
        const files = await fs.readdir(nsDir);
        const items = await Promise.all(files.filter((file) => file.endsWith('.json')).map(async (file) => {
            const filePath = path.join(nsDir, file);
            const stat = await fs.stat(filePath);
            const raw = JSON.parse(await fs.readFile(filePath, 'utf-8'));
            return {
                id: fromStorageFileName(file),
                namespace,
                updatedAt: raw.updatedAt ?? stat.mtime.toISOString(),
                schemaVersion: raw.schemaVersion ?? 1,
            };
        }));
        items.sort((a, b) => a.id.localeCompare(b.id));
        sendJson(res, 200, items);
        return true;
    }

    if (!id || !isSafeSegment(id)) {
        sendJson(res, 400, { error: 'Invalid id' });
        return true;
    }

    const filePath = path.join(SAVE_ROOT, namespace, toStorageFileName(id));

    if (req.method === 'GET') {
        try {
            const raw = await fs.readFile(filePath, 'utf-8');
            sendJson(res, 200, JSON.parse(raw));
        } catch {
            sendJson(res, 404, { error: 'Not found' });
        }
        return true;
    }

    if (req.method === 'PUT') {
        const body = await readRequestBody(req);
        const json = JSON.parse(body || '{}');
        await writeJsonAtomic(filePath, json);
        server.ws.send({ type: 'custom', event: 'saves:changed', data: { ns: namespace, id } });
        sendJson(res, 200, { ok: true });
        return true;
    }

    if (req.method === 'DELETE') {
        try {
            await fs.unlink(filePath);
        } catch {
            // ignore missing
        }
        server.ws.send({ type: 'custom', event: 'saves:changed', data: { ns: namespace, id } });
        sendJson(res, 200, { ok: true });
        return true;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
    return true;
}

export function saveBridgePlugin(): Plugin {
    return {
        name: 'save-bridge-plugin',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                try {
                    const handled = await createStorageMiddleware(req, res, server);
                    if (handled) return;
                } catch (error) {
                    sendJson(res, 500, { error: 'Storage bridge failure', details: String(error) });
                    return;
                }
                next();
            });

            server.watcher.add(path.join(SAVE_ROOT, '**/*.json'));
            server.watcher.on('change', (changedPath) => {
                const rel = path.relative(SAVE_ROOT, changedPath);
                const parts = rel.split(path.sep);
                if (parts.length < 2) return;
                const ns = parts[0];
                const id = fromStorageFileName(parts[1]);
                server.ws.send({ type: 'custom', event: 'saves:changed', data: { ns, id } });
            });
        },
    };
}
