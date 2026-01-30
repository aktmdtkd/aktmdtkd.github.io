export class BattleSystem {
    constructor() {
    }

    calculateDamage(attacker, defender) {
        let damage = attacker.atk - defender.def;
        if (damage <= 0) damage = 1;
        const variance = (Math.random() * 0.2) + 0.9;
        return Math.floor(damage * variance);
    }

    // [수정] 비동기 함수로 변경하여 공격 연출 대기
    async executeAttack(attacker, defender, effectManager) {
        // 1. 공격 모션 시작 (Bump)
        attacker.attackBump(defender.x, defender.y);
        
        // 모션이 보일 때까지 살짝 대기
        await new Promise(resolve => setTimeout(resolve, 200));

        // 2. 데미지 계산 및 적용
        const damage = this.calculateDamage(attacker, defender);
        defender.takeDamage(damage);
        
        // [추가] 데미지 텍스트 띄우기
        // 간단한 크리티컬 로직 (20% 확률로 1.5배 데미지 표시 - 실제 데미지엔 미반영된 단순 연출)
        const isCritical = Math.random() < 0.2;
        effectManager.addDamageText(defender.x, defender.y, damage, isCritical);

        console.log(`Battle: ${attacker.name} attacks ${defender.name} for ${damage} damage!`);

        // 3. 타격감 후 딜레이
        await new Promise(resolve => setTimeout(resolve, 300));

        return damage;
    }
}