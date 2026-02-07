import { SKILLS, TERRAIN_DATA } from '../data/constants.js';

export { SKILLS }; 

export class BattleSystem {
    constructor() {
        this.gridMap = null; 
    }

    setMap(gridMap) {
        this.gridMap = gridMap;
    }

    getRawDamage(attacker, defender) {
        let defense = defender.def;
        
        if (this.gridMap) {
            const terrainType = this.gridMap.getTerrain(defender.x, defender.y);
            const tData = TERRAIN_DATA[terrainType];
            if (tData && tData.defBonus !== 0) {
                defense += Math.floor(defense * tData.defBonus);
            }
        }

        let damage = attacker.atk - defense;
        if (damage <= 0) damage = 1;
        return damage;
    }

    getRawSkillPower(attacker, defender, skill) {
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
            let defense = defender.def;
            if (this.gridMap) {
                const tType = this.gridMap.getTerrain(defender.x, defender.y);
                const tData = TERRAIN_DATA[tType];
                if (tData) defense += Math.floor(defense * tData.defBonus);
            }
            finalValue = basePower - defense;
        }

        if (finalValue <= 1) finalValue = 1;
        return Math.floor(finalValue);
    }

    predictDamage(attacker, defender, action) {
        if (action.type === 'attack') {
            const rawDmg = this.getRawDamage(attacker, defender);
            return { min: Math.floor(rawDmg * 0.9), max: Math.ceil(rawDmg * 1.1), type: 'damage' };
        } 
        else if (action.type === 'skill') {
            const skill = SKILLS[action.id];
            const rawPower = this.getRawSkillPower(attacker, defender, skill);
            
            if (skill.type === 'heal') {
                return { val: rawPower, type: 'heal' };
            } else {
                return { val: rawPower, type: 'damage' }; 
            }
        }
        return null;
    }

    calculateDamage(attacker, defender) {
        const baseDmg = this.getRawDamage(attacker, defender);
        const variance = (Math.random() * 0.2) + 0.9;
        return Math.floor(baseDmg * variance);
    }

    calculateSkillPower(attacker, defender, skill) {
        return this.getRawSkillPower(attacker, defender, skill);
    }

    async executeAttack(attacker, defender, effectManager) {
        // [수정됨] 모션 실행
        attacker.attackBump(defender.x, defender.y);
        
        // 찌르는 타이밍(약 6프레임 ~ 0.1초) 이후에 타격감 발생을 위해 300ms 대기
        await new Promise(resolve => setTimeout(resolve, 300));

        const damage = this.calculateDamage(attacker, defender);
        defender.takeDamage(damage);
        
        const isCritical = Math.random() < 0.2;
        effectManager.addDamageText(defender.x, defender.y, damage, isCritical ? '#ff0000' : '#ffffff');

        // 후딜레이 (복귀 모션 볼 시간)
        await new Promise(resolve => setTimeout(resolve, 300));

        if (!defender.isDead()) {
            const dist = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
            if (dist <= defender.attackRange) {
                await this.performCounterAttack(defender, attacker, effectManager);
            }
        }
        return damage;
    }

    async executeSkill(attacker, targetX, targetY, skillId, allUnits, effectManager) {
        const skill = SKILLS[skillId];
        attacker.useMp(skill.cost);
        effectManager.addDamageText(attacker.x, attacker.y, `MP -${skill.cost}`, '#5555ff');

        // 스킬 시전 시 살짝 위로 뜸
        attacker.offsetY = -10;
        await new Promise(resolve => setTimeout(resolve, 200));
        attacker.offsetY = 0; // 복귀

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

        await new Promise(resolve => setTimeout(resolve, 400));

        if (skill.type === 'phys_damage' && mainTarget && !mainTarget.isDead() && mainTarget.team !== attacker.team) {
            const dist = Math.abs(attacker.x - mainTarget.x) + Math.abs(attacker.y - mainTarget.y);
            if (dist <= mainTarget.attackRange) {
                await this.performCounterAttack(mainTarget, attacker, effectManager);
            }
        }
    }

    async performCounterAttack(defender, attacker, effectManager) {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // [수정됨] 반격 모션도 동일하게 적용
        defender.attackBump(attacker.x, attacker.y);
        await new Promise(resolve => setTimeout(resolve, 300));

        const counterDamage = this.calculateDamage(defender, attacker);
        attacker.takeDamage(counterDamage);
        effectManager.addDamageText(attacker.x, attacker.y, counterDamage, '#ff8844');

        await new Promise(resolve => setTimeout(resolve, 300));
    }
}