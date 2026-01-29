export class PathFinder {
    constructor() {
        this.directions = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}]; // 상하좌우
    }

    // [수정됨] 이동 가능한 타일 목록 반환 (아군 통과 가능)
    getMovableTiles(unit, gridMap, allUnits) {
        let startNode = { x: unit.x, y: unit.y, dist: 0 };
        let queue = [startNode];
        let visited = new Set();
        let result = [];

        visited.add(`${unit.x},${unit.y}`);

        while (queue.length > 0) {
            let current = queue.shift();

            // 이동력이 남아있다면 확장
            if (current.dist < unit.moveRange) {
                for (let d of this.directions) {
                    let nx = current.x + d.x;
                    let ny = current.y + d.y;

                    // 1. 맵 밖 체크
                    if (nx < 0 || ny < 0 || nx >= gridMap.cols || ny >= gridMap.rows) continue;
                    
                    // 2. 방문 체크
                    if (visited.has(`${nx},${ny}`)) continue;

                    // 3. 지형 체크 (0:평지 가 아니면 못감 - 나중에 비용 계산 추가 가능)
                    if (gridMap.data[ny][nx] !== 0) continue;

                    // 4. 유닛 충돌 체크 [핵심 수정]
                    let occupant = allUnits.find(u => u.x === nx && u.y === ny);
                    
                    if (occupant) {
                        // 적군이면: 이동 불가 (길막)
                        if (occupant.team !== unit.team) continue;
                        
                        // 아군이면: 통과는 가능하지만, 멈출 수는 없음.
                        // 따라서 queue에는 넣어서 더 먼 곳을 탐색하게 해주되,
                        // result(도착지)에는 넣지 않음.
                    }

                    // 탐색 계속
                    visited.add(`${nx},${ny}`);
                    queue.push({ x: nx, y: ny, dist: current.dist + 1 });

                    // 빈 땅일 경우에만 '최종 도착지'로 인정
                    if (!occupant) {
                        result.push({ x: nx, y: ny });
                    }
                }
            }
        }
        return result;
    }

    // [수정됨] 경로 찾기 (아군 통과 가능)
    findPath(unit, targetX, targetY, gridMap, allUnits) {
        let startNode = { x: unit.x, y: unit.y, parent: null };
        let queue = [startNode];
        let visited = new Set();
        visited.add(`${unit.x},${unit.y}`);

        let finalNode = null;

        while (queue.length > 0) {
            let current = queue.shift();

            // 목표 도달
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

                // 유닛 체크
                let occupant = allUnits.find(u => u.x === nx && u.y === ny);
                
                // 적군이면 막힘
                if (occupant && occupant.team !== unit.team) continue;

                // 아군이면 통과 가능 (queue에 추가)
                
                visited.add(`${nx},${ny}`);
                queue.push({ x: nx, y: ny, parent: current });
            }
        }

        // 경로 역추적
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