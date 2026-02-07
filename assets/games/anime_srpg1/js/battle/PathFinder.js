import { TERRAIN_DATA } from '../data/constants.js';

export class PathFinder {
    constructor() {
        this.directions = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}]; 
    }

    // [수정] 이동 비용(Cost) 고려한 이동 가능 타일 계산
    getMovableTiles(unit, gridMap, allUnits) {
        // { x, y, cost }
        let startNode = { x: unit.x, y: unit.y, cost: 0 };
        let queue = [startNode];
        
        // 방문 기록: 좌표 문자열 -> 최소 비용
        let visited = new Map();
        visited.set(`${unit.x},${unit.y}`, 0);

        let result = [];

        while (queue.length > 0) {
            // 비용이 낮은 순서대로 처리 (간이 다익스트라)
            queue.sort((a, b) => a.cost - b.cost);
            let current = queue.shift();

            // 현재까지 비용이 유닛 이동력보다 크면 패스 (이미 큐에 넣을때 체크하지만 안전장치)
            if (current.cost > unit.moveRange) continue;

            for (let d of this.directions) {
                let nx = current.x + d.x;
                let ny = current.y + d.y;

                if (!gridMap.isValid(nx, ny)) continue;

                // 지형 비용 가져오기
                const terrainType = gridMap.getTerrain(nx, ny);
                const terrainInfo = TERRAIN_DATA[terrainType] || TERRAIN_DATA[0];
                const moveCost = terrainInfo.cost;

                // 이동 불가능 지형(비용 999 등) 체크
                if (moveCost > 99) continue;

                // 유닛 충돌 체크
                let occupant = allUnits.find(u => u.x === nx && u.y === ny && !u.isDead());
                if (occupant) {
                    if (occupant.team !== unit.team) continue; // 적은 통과 불가
                }

                const newCost = current.cost + moveCost;

                // 이동력 초과하면 갈 수 없음
                if (newCost > unit.moveRange) continue;

                // 더 적은 비용으로 방문한 적이 있으면 패스
                const key = `${nx},${ny}`;
                if (visited.has(key) && visited.get(key) <= newCost) continue;

                visited.set(key, newCost);
                queue.push({ x: nx, y: ny, cost: newCost });

                // 결과 목록에 추가 (유닛이 없는 곳만 최종 목적지가 될 수 있음, 자신 제외)
                if (!occupant || occupant === unit) {
                    // 중복 제거하며 추가
                    if (!result.some(p => p.x === nx && p.y === ny)) {
                        result.push({ x: nx, y: ny });
                    }
                }
            }
        }
        
        // 제자리도 포함
        if (!result.some(p => p.x === unit.x && p.y === unit.y)) {
            result.push({ x: unit.x, y: unit.y });
        }

        return result;
    }

    // [수정] 이동 비용 고려한 길찾기 (A* 또는 다익스트라)
    findPath(unit, targetX, targetY, gridMap, allUnits) {
        if (unit.x === targetX && unit.y === targetY) return [];

        let startNode = { x: unit.x, y: unit.y, cost: 0, parent: null };
        let queue = [startNode];
        let visited = new Map();
        visited.set(`${unit.x},${unit.y}`, 0);

        let finalNode = null;

        while (queue.length > 0) {
            queue.sort((a, b) => a.cost - b.cost);
            let current = queue.shift();

            if (current.x === targetX && current.y === targetY) {
                finalNode = current;
                break;
            }

            for (let d of this.directions) {
                let nx = current.x + d.x;
                let ny = current.y + d.y;

                if (!gridMap.isValid(nx, ny)) continue;

                const terrainType = gridMap.getTerrain(nx, ny);
                const terrainInfo = TERRAIN_DATA[terrainType] || TERRAIN_DATA[0];
                const moveCost = terrainInfo.cost;

                if (moveCost > 99) continue;

                // 목적지가 아니고 유닛이 있으면 통과 불가 (적군일 경우)
                let occupant = allUnits.find(u => u.x === nx && u.y === ny && !u.isDead());
                // 목적지라면 아군은 겹쳐도 경로 계산은 가능하게(실제 이동은 나중에 막히더라도)
                // 여기서는 적군만 피하는걸로
                if (occupant && occupant.team !== unit.team && (nx !== targetX || ny !== targetY)) continue;

                const newCost = current.cost + moveCost;
                const key = `${nx},${ny}`;

                if (visited.has(key) && visited.get(key) <= newCost) continue;

                visited.set(key, newCost);
                queue.push({ x: nx, y: ny, cost: newCost, parent: current });
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