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
        const variance = (Math.random() * 0.2) + 0.9;
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

    // 일반 공격 (쌍방 반격 가능)
    async executeAttack(attacker, defender, effectManager) {
        // 1. 선제 공격
        attacker.attackBump(defender.x, defender.y);
        await new Promise(resolve => setTimeout(resolve, 200));

        const damage = this.calculateDamage(attacker, defender);
        defender.takeDamage(damage);
        
        const isCritical = Math.random() < 0.2;
        effectManager.addDamageText(defender.x, defender.y, damage, isCritical ? '#ff0000' : '#ffffff');

        await new Promise(resolve => setTimeout(resolve, 300));

        // 2. 반격 체크
        if (!defender.isDead()) {
            const dist = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
            if (dist <= defender.attackRange) {
                await this.performCounterAttack(defender, attacker, effectManager);
            }
        }

        return damage;
    }

    // 스킬 실행
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

        // 스킬 효과 적용
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

        await new Promise(resolve => setTimeout(resolve, 400));

        // [신규] 물리 스킬('phys_damage')인 경우, 메인 타겟은 반격 기회를 가짐
        if (skill.type === 'phys_damage' && mainTarget && !mainTarget.isDead() && mainTarget.team !== attacker.team) {
            const dist = Math.abs(attacker.x - mainTarget.x) + Math.abs(attacker.y - mainTarget.y);
            // 사거리 체크
            if (dist <= mainTarget.attackRange) {
                console.log(`Battle: ${mainTarget.name} counters against skill!`);
                await this.performCounterAttack(mainTarget, attacker, effectManager);
            }
        }
    }

    // [공통] 반격 실행 함수 (코드 중복 제거)
    async performCounterAttack(defender, attacker, effectManager) {
        // 반격 전 뜸들이기
        await new Promise(resolve => setTimeout(resolve, 200));

        // 반격 모션
        defender.attackBump(attacker.x, attacker.y);
        await new Promise(resolve => setTimeout(resolve, 200));

        // 반격 데미지
        const counterDamage = this.calculateDamage(defender, attacker);
        attacker.takeDamage(counterDamage);

        // 반격 텍스트 (주황색)
        effectManager.addDamageText(attacker.x, attacker.y, counterDamage, '#ff8844');

        await new Promise(resolve => setTimeout(resolve, 300));
    }
}