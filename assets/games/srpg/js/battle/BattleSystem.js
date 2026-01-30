// 스킬 데이터 정의 (나중엔 JSON으로 분리 가능)
export const SKILLS = {
    "fire": { 
        name: "화계", 
        cost: 10, 
        range: 3, 
        power: 1.5, // 지력의 1.5배
        type: "damage", 
        aoe: "cross" // 십자 범위
    },
    "heal": { 
        name: "구원", 
        cost: 15, 
        range: 2, 
        power: 2.0, 
        type: "heal", 
        aoe: "single" 
    }
};

export class BattleSystem {
    constructor() {
    }

    // 물리 데미지 계산
    calculateDamage(attacker, defender) {
        let damage = attacker.atk - defender.def;
        if (damage <= 0) damage = 1;
        const variance = (Math.random() * 0.2) + 0.9;
        return Math.floor(damage * variance);
    }

    // 마법 데미지/힐량 계산
    calculateMagicPower(attacker, defender, skill) {
        // 기본 위력: (공격자 지력 * 스킬 계수)
        let basePower = attacker.int * skill.power;
        
        if (skill.type === 'damage') {
            // 마법 방어: 방어자 지력의 50%만큼 경감
            let damage = basePower - (defender.int * 0.5);
            if (damage <= 1) damage = 1;
            return Math.floor(damage);
        } else if (skill.type === 'heal') {
            return Math.floor(basePower);
        }
        return 0;
    }

    // [기존] 일반 공격
    async executeAttack(attacker, defender, effectManager) {
        attacker.attackBump(defender.x, defender.y);
        await new Promise(resolve => setTimeout(resolve, 200));

        const damage = this.calculateDamage(attacker, defender);
        defender.takeDamage(damage);
        
        const isCritical = Math.random() < 0.2;
        effectManager.addDamageText(defender.x, defender.y, damage, isCritical ? '#ff0000' : '#ffffff');
        console.log(`Battle: Attack -> ${damage} dmg`);

        await new Promise(resolve => setTimeout(resolve, 300));
        return damage;
    }

    // [신규] 책략 실행
    async executeSkill(attacker, targetX, targetY, skillId, allUnits, effectManager) {
        const skill = SKILLS[skillId];
        
        // MP 소모
        attacker.useMp(skill.cost);
        effectManager.addDamageText(attacker.x, attacker.y, `MP -${skill.cost}`, '#5555ff'); // 파란 텍스트

        // 시전 모션 (제자리 점프 느낌)
        attacker.offsetY = -10;
        await new Promise(resolve => setTimeout(resolve, 200));

        // 타겟 찾기 (AoE 로직)
        let targets = [];
        
        // 1. 클릭한 위치에 있는 유닛 확인
        const mainTarget = allUnits.find(u => u.x === targetX && u.y === targetY && !u.isDead());
        if (mainTarget) targets.push(mainTarget);

        // 2. 십자 범위(Cross)라면 주변 유닛도 추가
        if (skill.aoe === 'cross') {
            const offsets = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}];
            offsets.forEach(off => {
                const nx = targetX + off.x;
                const ny = targetY + off.y;
                const subTarget = allUnits.find(u => u.x === nx && u.y === ny && !u.isDead());
                if (subTarget) targets.push(subTarget);
            });
        }

        // 효과 적용
        for (const target of targets) {
            const power = this.calculateMagicPower(attacker, target, skill);

            if (skill.type === 'damage') {
                target.takeDamage(power);
                effectManager.addDamageText(target.x, target.y, power, '#ffaa00'); // 주황색 텍스트
            } else if (skill.type === 'heal') {
                target.heal(power);
                effectManager.addDamageText(target.x, target.y, `+${power}`, '#00ff00'); // 초록색 텍스트
            }
        }

        console.log(`Skill: ${skill.name} used on ${targets.length} targets.`);
        await new Promise(resolve => setTimeout(resolve, 400));
    }
}