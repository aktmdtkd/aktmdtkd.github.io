export class AI {
    constructor() {
        this.delay = 500;
    }

    async runTurn(gameManager) {
        const enemies = gameManager.units.filter(u => u.team === 'red' && !u.isDead());

        if (enemies.length === 0) {
            gameManager.startPlayerTurn();
            return;
        }

        for (const enemy of enemies) {
            if(enemy.isDead()) continue;
            if(gameManager.gameOver) break;

            await new Promise(resolve => setTimeout(resolve, this.delay));

            const target = this.findNearestTarget(enemy, gameManager.units);
            if (!target) continue;

            const movableTiles = gameManager.pathFinder.getMovableTiles(enemy, gameManager.gridMap, gameManager.units);
            let bestTile = { x: enemy.x, y: enemy.y };
            let minDist = this.getDistance(enemy, target);

            if (movableTiles.length > 0) {
                for (const tile of movableTiles) {
                    const dist = this.getDistance(tile, target);
                    if (dist < minDist && dist > 0) {
                        minDist = dist;
                        bestTile = tile;
                    }
                }
            }

            if (bestTile.x !== enemy.x || bestTile.y !== enemy.y) {
                const path = gameManager.pathFinder.findPath(
                    enemy, bestTile.x, bestTile.y, gameManager.gridMap, gameManager.units
                );
                if (path.length > 0) {
                    enemy.moveAlong(path);
                    while (enemy.isMoving) {
                        await new Promise(resolve => setTimeout(resolve, 16));
                    }
                }
            }

            const distAfterMove = this.getDistance(enemy, target);
            if (distAfterMove <= enemy.attackRange) {
                await new Promise(resolve => setTimeout(resolve, 200));
                await gameManager.battleSystem.executeAttack(enemy, target, gameManager.effectManager);
            }

            enemy.endAction();
            gameManager.checkDeadUnits(); 
        }

        if (!gameManager.gameOver) {
            gameManager.startPlayerTurn();
        }
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