export class AI {
    constructor() {
        this.delay = 500; // 유닛 간 턴 넘김 딜레이
    }

    async runTurn(gameManager) {
        console.log("AI: --- Enemy Turn Start ---");
        
        const enemies = gameManager.units.filter(u => u.team === 'red' && !u.isDead());

        if (enemies.length === 0) {
            gameManager.startPlayerTurn();
            return;
        }

        for (const enemy of enemies) {
            if(enemy.isDead()) continue;

            // 카메라 연출 등을 위한 약간의 딜레이
            await new Promise(resolve => setTimeout(resolve, this.delay));

            // 1. 타겟 찾기
            const target = this.findNearestTarget(enemy, gameManager.units);
            if (!target) continue;

            // 2. 이동할 위치(Tile) 선정
            const movableTiles = gameManager.pathFinder.getMovableTiles(enemy, gameManager.gridMap, gameManager.units);
            
            let bestTile = { x: enemy.x, y: enemy.y }; // 갈 곳 없으면 제자리
            let minDist = this.getDistance(enemy, target);

            // 이동 가능한 타일 중 타겟과 가장 가까운 곳 찾기
            if (movableTiles.length > 0) {
                for (const tile of movableTiles) {
                    const dist = this.getDistance(tile, target);
                    // 타겟과 겹치지 않으면서(거리 > 0) 가장 가까운 곳
                    if (dist < minDist && dist > 0) {
                        minDist = dist;
                        bestTile = tile;
                    }
                }
            }

            // 3. [핵심 변경] 순간이동 대신 경로를 구해 이동 애니메이션 실행
            // 제자리가 아니라면 이동
            if (bestTile.x !== enemy.x || bestTile.y !== enemy.y) {
                // 경로 계산
                const path = gameManager.pathFinder.findPath(
                    enemy, 
                    bestTile.x, bestTile.y, 
                    gameManager.gridMap, 
                    gameManager.units
                );

                if (path.length > 0) {
                    enemy.moveAlong(path); // "토도도독" 시작

                    // [중요] 이동이 끝날 때까지 기다림 (Polling)
                    while (enemy.isMoving) {
                        // 16ms(약 1프레임)마다 확인
                        await new Promise(resolve => setTimeout(resolve, 16));
                    }
                }
            }

            // 4. 이동 후 공격 시도
            const distAfterMove = this.getDistance(enemy, target);
            if (distAfterMove <= enemy.attackRange) {
                await new Promise(resolve => setTimeout(resolve, 200)); // 공격 전 뜸들이기
                gameManager.battleSystem.executeAttack(enemy, target);
            }

            // 행동 종료 및 사망 처리 확인
            enemy.endAction();
            gameManager.checkDeadUnits();
        }

        console.log("AI: --- Enemy Turn End ---");
        gameManager.startPlayerTurn();
    }

    findNearestTarget(me, allUnits) {
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

    getDistance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
}