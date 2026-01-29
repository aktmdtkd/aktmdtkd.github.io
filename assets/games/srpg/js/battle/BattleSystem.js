export class BattleSystem {
    constructor() {
    }

    // 데미지 계산 공식
    calculateDamage(attacker, defender) {
        // 기본: 공격력 - 방어력
        let damage = attacker.atk - defender.def;

        // 최소 데미지 보정 (방어력이 높아도 1은 달게)
        if (damage <= 0) damage = 1;

        // 랜덤 변수 (0.9 ~ 1.1배) - 게임의 맛
        const variance = (Math.random() * 0.2) + 0.9;
        return Math.floor(damage * variance);
    }

    // 공격 실행
    executeAttack(attacker, defender) {
        const damage = this.calculateDamage(attacker, defender);
        defender.takeDamage(damage);
        
        console.log(`Battle: ${attacker.name} attacks ${defender.name} for ${damage} damage!`);
        console.log(`${defender.name} HP: ${defender.currentHp}/${defender.maxHp}`);

        return damage;
    }
}