export class PathFinder {
    constructor() {
        this.directions = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}]; 
    }

    getMovableTiles(unit, gridMap, allUnits) {
        let startNode = { x: unit.x, y: unit.y, dist: 0 };
        let queue = [startNode];
        let visited = new Set();
        let result = [];

        visited.add(`${unit.x},${unit.y}`);

        while (queue.length > 0) {
            let current = queue.shift();

            if (current.dist < unit.moveRange) {
                for (let d of this.directions) {
                    let nx = current.x + d.x;
                    let ny = current.y + d.y;

                    if (nx < 0 || ny < 0 || nx >= gridMap.cols || ny >= gridMap.rows) continue;
                    if (visited.has(`${nx},${ny}`)) continue;
                    if (gridMap.data[ny][nx] !== 0) continue;

                    let occupant = allUnits.find(u => u.x === nx && u.y === ny);
                    
                    if (occupant) {
                        if (occupant.team !== unit.team) continue;
                    }

                    visited.add(`${nx},${ny}`);
                    queue.push({ x: nx, y: ny, dist: current.dist + 1 });

                    if (!occupant || occupant === unit) {
                        result.push({ x: nx, y: ny });
                    }
                }
            }
        }
        
        if (!result.some(p => p.x === unit.x && p.y === unit.y)) {
            result.push({ x: unit.x, y: unit.y });
        }

        return result;
    }

    findPath(unit, targetX, targetY, gridMap, allUnits) {
        if (unit.x === targetX && unit.y === targetY) {
            return [];
        }

        let startNode = { x: unit.x, y: unit.y, parent: null };
        let queue = [startNode];
        let visited = new Set();
        visited.add(`${unit.x},${unit.y}`);

        let finalNode = null;

        while (queue.length > 0) {
            let current = queue.shift();

            if (current.x === targetX && current.y === targetY) {
                finalNode = current;
                break;
            }

            for (let d of this.directions) {
                let nx = current.x + d.x;
                let ny = current.y + d.y;

                if (nx < 0 || ny < 0 || nx >= gridMap.cols || ny >= gridMap.rows) continue;
                if (visited.has(`${nx},${ny}`)) continue;
                if (gridMap.data[ny][nx] !== 0) continue;

                let occupant = allUnits.find(u => u.x === nx && u.y === ny);
                if (occupant && occupant.team !== unit.team) continue;

                visited.add(`${nx},${ny}`);
                queue.push({ x: nx, y: ny, parent: current });
            }
        }

        if (finalNode) {
            let path = [];
            let curr = finalNode;
            while (curr.parent) { 
                path.push({ x: curr.x, y: curr.y });
                curr = curr.parent;
            }
            return path.reverse();
        }
        return [];
    }
}