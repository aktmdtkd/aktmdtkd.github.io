export const SKILLS = {
    "fire": { 
        name: "화계", cost: 10, range: 3, power: 1.5, 
        type: "magic_damage", aoe: "cross" 
    },
    "heal": { 
        name: "구원", cost: 15, range: 2, power: 2.0, 
        type: "heal", aoe: "single" 
    },
    // [신규] 물리 스킬
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
            finalValue = basePower - (defender.int * 0.5); // 마법 방어 적용

        } else if (skill.type === 'heal') {
            basePower = attacker.int * skill.power;
            finalValue = basePower;

        } else if (skill.type === 'phys_damage') {
            basePower = attacker.atk * skill.power;
            finalValue = basePower - defender.def; // 물리 방어 적용
        }

        if (finalValue <= 1) finalValue = 1;
        return Math.floor(finalValue);
    }

    async executeAttack(attacker, defender, effectManager) {
        attacker.attackBump(defender.x, defender.y);
        await new Promise(resolve => setTimeout(resolve, 200));

        const damage = this.calculateDamage(attacker, defender);
        defender.takeDamage(damage);
        
        const isCritical = Math.random() < 0.2;
        effectManager.addDamageText(defender.x, defender.y, damage, isCritical ? '#ff0000' : '#ffffff');

        await new Promise(resolve => setTimeout(resolve, 300));
        return damage;
    }

    async executeSkill(attacker, targetX, targetY, skillId, allUnits, effectManager) {
        const skill = SKILLS[skillId];
        
        // MP 소모
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

        console.log(`Skill: ${skill.name} used.`);
        await new Promise(resolve => setTimeout(resolve, 400));
    }
}