export const SKILLS = {
    "fire": { 
        name: "화계", cost: 10, range: 3, power: 1.5, 
        type: "magic_damage", aoe: "cross" 
    },
    "heal": { 
        name: "구원", cost: 15, range: 2, power: 2.0, 
        type: "heal", aoe: "single" 
    },
    "smash": { 
        name: "강타", cost: 8, range: 1, power: 1.3, 
        type: "phys_damage", aoe: "single" 
    }
};

export class BattleSystem {
    constructor() {}

    calculateDamage(attacker, defender) {
        let damage = attacker.atk - defender.def;
        if (damage <= 0) damage = 1;
        const variance = (Math.random() * 0.2) + 0.9; // 0.9 ~ 1.1 배율
        return Math.floor(damage * variance);
    }

    calculateSkillPower(attacker, defender, skill) {
        let basePower = 0;
        let finalValue = 0;

        if (skill.type === 'magic_damage') {
            basePower = attacker.int * skill.power;
            finalValue = basePower - (defender.int * 0.5);
        } else if (skill.type === 'heal') {
            basePower = attacker.int * skill.power;
            finalValue = basePower;
        } else if (skill.type === 'phys_damage') {
            basePower = attacker.atk * skill.power;
            finalValue = basePower - defender.def;
        }

        if (finalValue <= 1) finalValue = 1;
        return Math.floor(finalValue);
    }

    // [핵심 수정] 일반 공격 및 반격 로직
    async executeAttack(attacker, defender, effectManager) {
        // --- 1. 공격자(Attacker)의 선제 공격 ---
        console.log(`Battle: ${attacker.name} attacks ${defender.name}`);
        
        attacker.attackBump(defender.x, defender.y);
        await new Promise(resolve => setTimeout(resolve, 200));

        const damage = this.calculateDamage(attacker, defender);
        defender.takeDamage(damage);
        
        const isCritical = Math.random() < 0.2;
        effectManager.addDamageText(defender.x, defender.y, damage, isCritical ? '#ff0000' : '#ffffff');

        // 타격 연출 대기
        await new Promise(resolve => setTimeout(resolve, 300));

        // --- 2. 반격(Counterattack) 체크 ---
        // 조건 1: 방어자가 살아있어야 함
        // 조건 2: 공격자가 방어자의 사거리(Attack Range) 안에 있어야 함
        if (!defender.isDead()) {
            const dist = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
            
            if (dist <= defender.attackRange) {
                console.log(`Battle: ${defender.name} counters!`);
                
                // 반격 전 살짝 뜸들이기 (긴장감)
                await new Promise(resolve => setTimeout(resolve, 200));

                // 방어자의 반격 모션
                defender.attackBump(attacker.x, attacker.y);
                await new Promise(resolve => setTimeout(resolve, 200));

                // 반격 데미지 계산 (보통 반격은 데미지가 같거나 패널티를 줄 수 있음. 여기선 100% 적용)
                const counterDamage = this.calculateDamage(defender, attacker);
                attacker.takeDamage(counterDamage);

                // 반격 텍스트 (주황색 계열로 표시하여 구분)
                effectManager.addDamageText(attacker.x, attacker.y, counterDamage, '#ff8844');

                // 반격 후 딜레이
                await new Promise(resolve => setTimeout(resolve, 300));
            } else {
                console.log(`Battle: Target is out of range (${dist} > ${defender.attackRange}), cannot counter.`);
            }
        }

        return damage;
    }

    // 스킬 공격 (반격 없음)
    async executeSkill(attacker, targetX, targetY, skillId, allUnits, effectManager) {
        const skill = SKILLS[skillId];
        
        attacker.useMp(skill.cost);
        effectManager.addDamageText(attacker.x, attacker.y, `MP -${skill.cost}`, '#5555ff');

        attacker.offsetY = -10;
        await new Promise(resolve => setTimeout(resolve, 200));

        let targets = [];
        const mainTarget = allUnits.find(u => u.x === targetX && u.y === targetY && !u.isDead());
        if (mainTarget) targets.push(mainTarget);

        if (skill.aoe === 'cross') {
            const offsets = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}];
            offsets.forEach(off => {
                const nx = targetX + off.x;
                const ny = targetY + off.y;
                const subTarget = allUnits.find(u => u.x === nx && u.y === ny && !u.isDead());
                if (subTarget) targets.push(subTarget);
            });
        }

        for (const target of targets) {
            const power = this.calculateSkillPower(attacker, target, skill);

            if (skill.type === 'magic_damage' || skill.type === 'phys_damage') {
                target.takeDamage(power);
                effectManager.addDamageText(target.x, target.y, power, '#ffaa00');
            } else if (skill.type === 'heal') {
                target.heal(power);
                effectManager.addDamageText(target.x, target.y, `+${power}`, '#00ff00');
            }
        }

        // 스킬은 반격 로직이 없음 (그대로 종료)
        console.log(`Skill: ${skill.name} used.`);
        await new Promise(resolve => setTimeout(resolve, 400));
    }
}