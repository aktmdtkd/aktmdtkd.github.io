import { SKILLS } from '../data/constants.js';

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
            
            if (target) {
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
            }

            await this.performBestAction(enemy, gameManager);
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
            if (dist < minInfo) { minInfo = dist; nearest = t; }
        }
        return nearest;
    }

    async performBestAction(actor, gm) {
        const allUnits = gm.units;
        const effectManager = gm.effectManager;
        const battleSystem = gm.battleSystem;

        let bestAction = null;
        let maxScore = -1;

        const attackTargets = this.findTargetsInRange(actor, actor.attackRange, allUnits);
        for (const target of attackTargets) {
            if (target.team === actor.team) continue;
            
            const damage = battleSystem.calculateDamage(actor, target);
            let score = damage;
            if (damage >= target.currentHp) score += 50;

            if (score > maxScore) {
                maxScore = score;
                bestAction = { type: 'attack', target: target };
            }
        }

        const skills = actor.skills || [];
        for (const skillId of skills) {
            const skill = SKILLS[skillId];
            if (!skill) continue;
            if (actor.currentMp < skill.cost) continue;

            const skillTargets = this.findTargetsInRange(actor, skill.range, allUnits);

            for (const target of skillTargets) {
                if (skill.type === 'heal') {
                    if (target.team !== actor.team) continue;
                    if (target.currentHp >= target.maxHp) continue;

                    const healAmount = battleSystem.calculateSkillPower(actor, target, skill);
                    const actualHeal = Math.min(healAmount, target.maxHp - target.currentHp);
                    let score = actualHeal * 1.5; 
                    if (target.currentHp < target.maxHp * 0.3) score += 40;

                    if (score > maxScore) {
                        maxScore = score;
                        bestAction = { type: 'skill', skillId: skillId, target: target };
                    }

                } else {
                    if (target.team === actor.team) continue;
                    const damage = battleSystem.calculateSkillPower(actor, target, skill);
                    let score = damage * 1.1;
                    if (damage >= target.currentHp) score += 50;

                    if (score > maxScore) {
                        maxScore = score;
                        bestAction = { type: 'skill', skillId: skillId, target: target };
                    }
                }
            }
        }

        if (bestAction) {
            await new Promise(resolve => setTimeout(resolve, 200));
            if (bestAction.type === 'attack') {
                await battleSystem.executeAttack(actor, bestAction.target, effectManager);
            } else if (bestAction.type === 'skill') {
                await battleSystem.executeSkill(actor, bestAction.target.x, bestAction.target.y, bestAction.skillId, allUnits, effectManager);
            }
        }
    }

    findTargetsInRange(actor, range, allUnits) {
        const targets = [];
        for (const u of allUnits) {
            if (u.isDead()) continue;
            const dist = Math.abs(actor.x - u.x) + Math.abs(actor.y - u.y);
            if (dist <= range) targets.push(u);
        }
        return targets;
    }

    getDistance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
}