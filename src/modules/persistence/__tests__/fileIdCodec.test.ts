import { fromStorageFileName, toStorageFileName } from '../fileIdCodec';

describe('fileIdCodec', () => {
    it('encodes and decodes id with spaces once', () => {
        const id = 'Start company';
        const fileName = toStorageFileName(id);

        expect(fileName).toBe('Start%20company.json');
        expect(fileName).not.toContain('%2520');
        expect(fromStorageFileName(fileName)).toBe(id);
    });

    it('preserves unicode ids', () => {
        const id = 'Тест карта';
        const fileName = toStorageFileName(id);

        expect(fromStorageFileName(fileName)).toBe(id);
    });

    it('normalizes accidentally pre-encoded ids without double encoding', () => {
        const id = 'Start%20company';
        const fileName = toStorageFileName(id);

        expect(fileName).toBe('Start%20company.json');
        expect(fileName).not.toContain('%2520');
        expect(fromStorageFileName(fileName)).toBe('Start company');
    });
});
