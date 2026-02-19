function decodeRecursively(value: string): string {
    let current = value;
    for (let i = 0; i < 3; i++) {
        try {
            const decoded = decodeURIComponent(current);
            if (decoded === current) break;
            current = decoded;
        } catch {
            break;
        }
    }
    return current;
}

export function toStorageFileName(id: string): string {
    return `${encodeURIComponent(decodeRecursively(id))}.json`;
}

export function fromStorageFileName(fileName: string): string {
    const base = fileName.endsWith('.json') ? fileName.slice(0, -5) : fileName;
    return decodeRecursively(base);
}
