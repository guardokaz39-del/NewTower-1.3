export type SafeParseResult<T> =
    | { success: true; data: T }
    | { success: false; error: { flatten: () => { fieldErrors: Record<string, string[]> } } };

export interface Schema<T> {
    parse(input: unknown, path?: string): T;
    safeParse(input: unknown): SafeParseResult<T>;
    optional(): Schema<T | undefined>;
}

class BaseSchema<T> implements Schema<T> {
    constructor(private readonly parser: (input: unknown, path: string) => T) {}

    parse(input: unknown, path = 'root'): T {
        return this.parser(input, path);
    }

    safeParse(input: unknown): SafeParseResult<T> {
        try {
            return { success: true, data: this.parse(input) };
        } catch (error) {
            return {
                success: false,
                error: { flatten: () => ({ fieldErrors: { root: [String(error)] } }) },
            };
        }
    }

    optional(): Schema<T | undefined> {
        return new BaseSchema<T | undefined>((input, path) => {
            if (input === undefined) return undefined;
            return this.parse(input, path);
        });
    }
}

const zString = () => {
    const schema = new BaseSchema<string>((input, path) => {
        if (typeof input !== 'string') throw new Error(`${path} must be string`);
        return input;
    });
    return Object.assign(schema, {
        min(size: number) {
            return new BaseSchema<string>((input, path) => {
                const parsed = schema.parse(input, path);
                if (parsed.length < size) throw new Error(`${path} length must be >= ${size}`);
                return parsed;
            });
        },
    });
};

export const z = {
    object<T extends Record<string, Schema<any>>>(shape: T): Schema<{ [K in keyof T]: T[K] extends Schema<infer V> ? V : never }> {
        return new BaseSchema((input: unknown, path: string) => {
            if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(`${path} must be object`);
            const out: Record<string, unknown> = {};
            for (const [key, schema] of Object.entries(shape)) {
                out[key] = (schema as Schema<unknown>).parse((input as Record<string, unknown>)[key], `${path}.${key}`);
            }
            return out as any;
        });
    },
    array<T>(item: Schema<T>): Schema<T[]> {
        return new BaseSchema((input, path) => {
            if (!Array.isArray(input)) throw new Error(`${path} must be array`);
            return input.map((value, index) => item.parse(value, `${path}[${index}]`));
        });
    },
    number(): Schema<number> {
        return new BaseSchema((input, path) => {
            if (typeof input !== 'number') throw new Error(`${path} must be number`);
            return input;
        });
    },
    string: zString,
    boolean(): Schema<boolean> {
        return new BaseSchema((input, path) => {
            if (typeof input !== 'boolean') throw new Error(`${path} must be boolean`);
            return input;
        });
    },
    unknown(): Schema<unknown> {
        return new BaseSchema((input) => input);
    },
    record(_key: Schema<string>, value: Schema<unknown>): Schema<Record<string, unknown>> {
        return new BaseSchema((input, path) => {
            if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(`${path} must be record`);
            const out: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
                out[k] = value.parse(v, `${path}.${k}`);
            }
            return out;
        });
    },
    enum<T extends readonly [string, ...string[]]>(values: T): Schema<T[number]> {
        return new BaseSchema((input, path) => {
            if (typeof input !== 'string' || !values.includes(input)) throw new Error(`${path} invalid enum`);
            return input as T[number];
        });
    },
};
