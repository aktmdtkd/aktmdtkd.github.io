export class AI {
    constructor() {
        this.delay = 800; // 0.8초 딜레이 (너무 빠르면 안 보임)
    }

    async runTurn(gameManager) {
        console.log("Turn: Enemy Phase Start");
        
        // 1. 적군(Red) 유닛만 필터링
        const enemies = gameManager.units.filter(u => u.team === 'red' && !u.isDead());

        for (const enemy of enemies) {
            // 죽은 놈은 건너뜀
            if(enemy.isDead()) continue;

            // 시각적 효과를 위해 0.8초 대기
            await new Promise(resolve => setTimeout(resolve, this.delay));

            // [AI 1단계] 가장 가까운 아군(Target) 찾기
            const target = this.findNearestTarget(enemy, gameManager.units);
            
            if (!target) {
                console.log(`${enemy.name}: No target found.`);
                continue;
            }

            // [AI 2단계] 이동 (PathFinder 활용)
            // 적군은 현재 위치에서 이동 가능한 모든 타일을 가져옴
            const movableTiles = gameManager.pathFinder.getMovableTiles(enemy, gameManager.gridMap, gameManager.units);
            
            // 이동 가능한 타일 중 타겟과 거리가 가장 가까운 곳 선정
            let bestTile = { x: enemy.x, y: enemy.y };
            let minDist = this.getDistance(enemy, target);

            for (const tile of movableTiles) {
                const dist = this.getDistance(tile, target);
                // 더 가까운 곳이 있으면 그곳을 목표로 설정
                // 단, 타겟과 겹치면 안됨 (거리가 0이면 안됨)
                if (dist < minDist && dist > 0) {
                    minDist = dist;
                    bestTile = tile;
                }
            }

            // 이동 실행
            enemy.moveTo(bestTile.x, bestTile.y);
            gameManager.renderer.drawUnits(gameManager.units); // 화면 갱신

            // [AI 3단계] 공격 (사거리 내에 타겟이 있으면)
            const distAfterMove = this.getDistance(enemy, target);
            if (distAfterMove <= enemy.attackRange) {
                await new Promise(resolve => setTimeout(resolve, 300)); // 공격 전 살짝 뜸들이기
                gameManager.battleSystem.executeAttack(enemy, target);
            }

            // 행동 종료 처리
            enemy.endAction();
            
            // 죽은 유닛 정리 (아군이 죽었을 수 있으니)
            gameManager.checkDeadUnits();
            gameManager.loop(); // 화면 강제 갱신
        }

        console.log("Turn: Enemy Phase End -> Player Phase");
        gameManager.startPlayerTurn();
    }

    findNearestTarget(me, allUnits) {
        // 살아있는 아군(Blue) 찾기
        const targets = allUnits.filter(u => u.team === 'blue' && !u.isDead());
        if (targets.length === 0) return null;

        let nearest = null;
        let minInfo = 9999;

        for (const t of targets) {
            const dist = this.getDistance(me, t);
            if (dist < minInfo) {
                minInfo = dist;
                nearest = t;
            }
        }
        return nearest;
    }

    // 맨해튼 거리 계산 (격자 거리)
    getDistance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
}