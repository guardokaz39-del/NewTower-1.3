import { Cell } from './Map';

export class Pathfinder {
    // Находит путь от start до end, используя только тайлы типа 1 (Path)
    // Возвращает массив координат {x, y} или пустой массив, если пути нет
    public static findPath(grid: Cell[][], start: {x: number, y: number}, end: {x: number, y: number}): {x: number, y: number}[] {
        const rows = grid.length;
        const cols = grid[0].length;
        
        // Очередь для BFS: [ {x, y}, [path_so_far] ]
        const queue: {pos: {x: number, y: number}, path: {x: number, y: number}[]}[] = [];
        queue.push({ pos: start, path: [start] });

        const visited = new Set<string>();
        visited.add(`${start.x},${start.y}`);

        const directions = [
            {dx: 0, dy: -1}, // Up
            {dx: 1, dy: 0},  // Right
            {dx: 0, dy: 1},  // Down
            {dx: -1, dy: 0}  // Left
        ];

        while (queue.length > 0) {
            const { pos, path } = queue.shift()!;

            if (pos.x === end.x && pos.y === end.y) {
                return path;
            }

            for (const dir of directions) {
                const nx = pos.x + dir.dx;
                const ny = pos.y + dir.dy;
                const key = `${nx},${ny}`;

                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited.has(key)) {
                    // Проверяем, что это дорога (type === 1) ИЛИ это конечная точка (даже если мы её случайно закрасили травой, хотя по логике она должна быть на дороге)
                    // Но лучше строго: ходить можно только по дороге.
                    const cell = grid[ny][nx];
                    if (cell.type === 1) {
                        visited.add(key);
                        queue.push({ pos: {x: nx, y: ny}, path: [...path, {x: nx, y: ny}] });
                    }
                }
            }
        }

        return [];
    }
}
