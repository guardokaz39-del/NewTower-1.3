export class SafeJson {
    /**
     * Safely serializes an object to JSON, handling circular references and limiting depth.
     * @param data The object to serialize
     * @param maxDepth Maximum recursion depth (default 3)
     * @param pretty Whether to separate lines (default false)
     */
    public static stringify(data: any, maxDepth: number = 3, pretty: boolean = false): string {
        const seen = new WeakSet();

        const replacer = (key: string, value: any) => {
            // Handle primitives
            if (value === null || typeof value !== 'object') {
                return value;
            }

            // Handle circular references
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);

            // Handle DOM elements (too heavy to serialize)
            if (value instanceof HTMLElement) {
                return `[HTMLElement: ${value.tagName}]`;
            }

            // Handle depth manually if needed, but WeakSet handles recursion loops.
            // For true depth limiting, we'd need a recursive custom serializer, 
            // but JSON.stringify compliant replacer is harder to limit by depth directly.
            // So we rely on a custom recursive function instead of standard JSON.stringify if we want strict depth.

            return value;
        };

        // For strict depth control and safety, we implement a custom walker instead of just JSON.stringify
        const sanitized = SafeJson.sanitize(data, maxDepth, new WeakSet());
        return JSON.stringify(sanitized, null, pretty ? 2 : 0);
    }

    private static sanitize(obj: any, depth: number, visited: WeakSet<any>): any {
        // Base cases
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        // Check loops
        if (visited.has(obj)) {
            return '[Circular]';
        }

        // Check depth
        if (depth < 0) {
            return '[MaxDepth]';
        }

        // Special types
        if (obj instanceof HTMLElement) return `[HTMLElement: ${obj.tagName}]`;
        if (obj instanceof Function) return `[Function: ${obj.name || 'anonymous'}]`;
        if (obj instanceof Error) return { message: obj.message, stack: obj.stack };

        // Add to visited
        visited.add(obj);

        // Arrays
        if (Array.isArray(obj)) {
            return obj.map(item => SafeJson.sanitize(item, depth - 1, visited));
        }

        // Objects
        const res: any = {};
        for (const key in obj) {
            // Skip large numeric keys usually found in huge lookup tables or large arrays treated as objects
            // Also skip private keys like _private
            if (key.startsWith('_')) continue;

            try {
                res[key] = SafeJson.sanitize(obj[key], depth - 1, visited);
            } catch (e) {
                res[key] = '[Error accessing property]';
            }
        }
        return res;
    }
}
