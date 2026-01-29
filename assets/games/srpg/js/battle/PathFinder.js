export class PathFinder {
    constructor() {
        this.directions = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}];
    }

    // [기존] 이동 가능한 타일 목록 반환
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
                    if (gridMap.data[ny][nx] !== 0) continue; // 장애물 체크

                    // 유닛 충돌 체크
                    let occupant = allUnits.find(u => u.x === nx && u.y === ny);
                    
                    visited.add(`${nx},${ny}`);
                    queue.push({ x: nx, y: ny, dist: current.dist + 1 });

                    if (!occupant) {
                        result.push({ x: nx, y: ny });
                    }
                }
            }
        }
        return result;
    }

    // [신규] 특정 위치까지의 경로(Path) 반환 (BFS 활용)
    findPath(unit, targetX, targetY, gridMap, allUnits) {
        let startNode = { x: unit.x, y: unit.y, parent: null };
        let queue = [startNode];
        let visited = new Set();
        visited.add(`${unit.x},${unit.y}`);

        let finalNode = null;

        while (queue.length > 0) {
            let current = queue.shift();

            // 목표 도달 시 종료
            if (current.x === targetX && current.y === targetY) {
                finalNode = current;
                break;
            }

            for (let d of this.directions) {
                let nx = current.x + d.x;
                let ny = current.y + d.y;

                if (nx < 0 || ny < 0 || nx >= gridMap.cols || ny >= gridMap.rows) continue;
                if (visited.has(`${nx},${ny}`)) continue;
                if (gridMap.data[ny][nx] !== 0) continue; // 장애물 통과 불가

                // 가는 길에 다른 유닛이 있으면 막힘 (단, 도착지는 이미 비어있음을 GameManager에서 확인했으므로 제외)
                let occupant = allUnits.find(u => u.x === nx && u.y === ny);
                if (occupant && (nx !== targetX || ny !== targetY)) continue;

                visited.add(`${nx},${ny}`);
                // parent를 기록해서 경로 역추적
                queue.push({ x: nx, y: ny, parent: current });
            }
        }

        // 경로 역추적 (Backtracking)
        if (finalNode) {
            let path = [];
            let curr = finalNode;
            while (curr.parent) { // 시작점(parent==null)은 제외
                path.push({ x: curr.x, y: curr.y });
                curr = curr.parent;
            }
            return path.reverse(); // 역순이므로 뒤집기
        }
        return [];
    }
}