import { SKILLS } from './BattleSystem.js';

export class AI {
    constructor() {
        this.delay = 500; // 행동 사이 딜레이
    }

    async runTurn(gameManager) {
        // 살아있는 적군(Red)만 필터링
        const enemies = gameManager.units.filter(u => u.team === 'red' && !u.isDead());

        if (enemies.length === 0) {
            gameManager.startPlayerTurn();
            return;
        }

        for (const enemy of enemies) {
            if(enemy.isDead()) continue;
            if(gameManager.gameOver) break;

            // 1. 약간의 딜레이 (연출용)
            await new Promise(resolve => setTimeout(resolve, this.delay));

            // 2. 타겟 탐색 및 이동
            const target = this.findNearestTarget(enemy, gameManager.units);
            
            if (target) {
                // 이동 가능한 위치 중 타겟과 가장 가까운 곳 찾기
                const movableTiles = gameManager.pathFinder.getMovableTiles(enemy, gameManager.gridMap, gameManager.units);
                let bestTile = { x: enemy.x, y: enemy.y };
                let minDist = this.getDistance(enemy, target);

                if (movableTiles.length > 0) {
                    for (const tile of movableTiles) {
                        const dist = this.getDistance(tile, target);
                        // 무조건 가까이 붙기보다, 갈 수 있는 곳 중 가장 가까운 곳 선택
                        if (dist < minDist && dist > 0) {
                            minDist = dist;
                            bestTile = tile;
                        }
                    }
                }

                // 이동 실행
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

            // 3. [핵심] 최적의 행동 결정 (공격 vs 스킬 vs 힐)
            await this.performBestAction(enemy, gameManager);

            enemy.endAction();
            gameManager.checkDeadUnits();
        }

        if (!gameManager.gameOver) {
            gameManager.startPlayerTurn();
        }
    }

    // 가장 가까운 아군(Blue) 찾기
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

    // 스마트한 행동 결정 로직
    async performBestAction(actor, gm) {
        const allUnits = gm.units;
        const effectManager = gm.effectManager;
        const battleSystem = gm.battleSystem;

        let bestAction = null;
        let maxScore = -1; // 행동의 가치 점수 (높을수록 좋음)

        // --- 후보 1: 일반 공격 ---
        const attackTargets = this.findTargetsInRange(actor, actor.attackRange, allUnits);
        for (const target of attackTargets) {
            if (target.team === actor.team) continue; // 아군은 공격 안 함
            
            const damage = battleSystem.calculateDamage(actor, target);
            
            // 점수 계산: 데미지가 클수록 좋음
            let score = damage;
            // 킬각 보너스 (적을 죽일 수 있다면 점수 대폭 추가)
            if (damage >= target.currentHp) score += 50;

            if (score > maxScore) {
                maxScore = score;
                bestAction = { type: 'attack', target: target };
            }
        }

        // --- 후보 2: 스킬 사용 (MP 확인) ---
        const skills = actor.skills || [];
        for (const skillId of skills) {
            const skill = SKILLS[skillId];
            if (!skill) continue;
            // MP 부족하면 패스
            if (actor.currentMp < skill.cost) continue;

            // 스킬 범위 내 대상 찾기
            const skillTargets = this.findTargetsInRange(actor, skill.range, allUnits);

            for (const target of skillTargets) {
                // A. 회복 스킬 (힐)
                if (skill.type === 'heal') {
                    // 아군이고, 체력이 깎인 경우에만
                    if (target.team !== actor.team) continue;
                    if (target.currentHp >= target.maxHp) continue;

                    const healAmount = battleSystem.calculateSkillPower(actor, target, skill);
                    // 실제 회복량 (오버힐 제외)
                    const actualHeal = Math.min(healAmount, target.maxHp - target.currentHp);
                    
                    // 점수: 회복량 * 1.5 (공격보다 힐을 조금 더 선호)
                    let score = actualHeal * 1.5; 
                    // 위급 상황 구조 보너스 (HP 30% 미만이면 우선순위 급상승)
                    if (target.currentHp < target.maxHp * 0.3) score += 40;

                    if (score > maxScore) {
                        maxScore = score;
                        bestAction = { type: 'skill', skillId: skillId, target: target };
                    }

                } 
                // B. 공격 스킬 (화계, 강타 등)
                else {
                    // 적군만 대상
                    if (target.team === actor.team) continue;

                    const damage = battleSystem.calculateSkillPower(actor, target, skill);
                    
                    // 점수: 스킬 데미지 * 1.1 (평타보다 스킬을 선호)
                    let score = damage * 1.1;
                    // 킬각 보너스
                    if (damage >= target.currentHp) score += 50;

                    if (score > maxScore) {
                        maxScore = score;
                        bestAction = { type: 'skill', skillId: skillId, target: target };
                    }
                }
            }
        }

        // 결정된 '최고의 행동' 실행
        if (bestAction) {
            await new Promise(resolve => setTimeout(resolve, 200)); // 행동 전 뜸들이기
            
            if (bestAction.type === 'attack') {
                await battleSystem.executeAttack(actor, bestAction.target, effectManager);
            } else if (bestAction.type === 'skill') {
                // 스킬 실행 (타겟 좌표로 발사)
                await battleSystem.executeSkill(
                    actor, 
                    bestAction.target.x, bestAction.target.y, 
                    bestAction.skillId, 
                    allUnits, 
                    effectManager
                );
            }
        }
    }

    // 범위 내에 있는 유닛 찾기 유틸리티
    findTargetsInRange(actor, range, allUnits) {
        const targets = [];
        for (const u of allUnits) {
            if (u.isDead()) continue;
            const dist = Math.abs(actor.x - u.x) + Math.abs(actor.y - u.y);
            if (dist <= range) {
                targets.push(u);
            }
        }
        return targets;
    }

    getDistance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
}