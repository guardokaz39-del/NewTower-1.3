export function toStorageFileName(id: string): string {
    return `${encodeURIComponent(id)}.json`;
}

export function fromStorageFileName(fileName: string): string {
    const base = fileName.endsWith('.json') ? fileName.slice(0, -5) : fileName;
    try {
        return decodeURIComponent(base);
    } catch {
        return base;
    }
}
