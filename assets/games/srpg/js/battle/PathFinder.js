export class PathFinder {
    constructor() {
        this.directions = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}]; // 상하좌우
    }

    // 이동 가능한 좌표 목록 반환
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

                    // 1. 맵 밖으로 나갔나?
                    if (nx < 0 || ny < 0 || nx >= gridMap.cols || ny >= gridMap.rows) continue;
                    
                    // 2. 이미 방문했나?
                    if (visited.has(`${nx},${ny}`)) continue;

                    // 3. 장애물(산, 물)인가? (여기선 0:평지 빼고 다 못간다고 가정)
                    // * 나중엔 병종별 이동비용 테이블(TerrainTable)을 참조해야 함
                    if (gridMap.data[ny][nx] !== 0) continue;

                    // 4. 다른 유닛이 길을 막고 있나? (아군은 통과, 적군은 차단 등)
                    // 일단 간단하게 '누가 있으면 못 감'으로 처리 (목적지 기준)
                    let occupant = allUnits.find(u => u.x === nx && u.y === ny);
                    
                    // (조조전 룰: 이동 경로는 뚫려 있어도, 최종 도착지에 누가 있으면 못 멈춤)
                    // 여기서는 BFS 탐색 중에는 통과 가능하다고 치고, 결과 담을 때 체크
                    
                    visited.add(`${nx},${ny}`);
                    queue.push({ x: nx, y: ny, dist: current.dist + 1 });

                    // 결과에는 '빈 땅'만 추가
                    if (!occupant) {
                        result.push({ x: nx, y: ny });
                    }
                }
            }
        }
        return result;
    }
}