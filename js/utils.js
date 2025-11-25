export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export class ObjectPool {
    constructor(createFn) {
        this.createFn = createFn;
        this.pool = [];
    }

    obtain() {
        return this.pool.length > 0 ? this.pool.pop() : this.createFn();
    }

    free(obj) {
        if (obj.reset) obj.reset();
        this.pool.push(obj);
    }
}