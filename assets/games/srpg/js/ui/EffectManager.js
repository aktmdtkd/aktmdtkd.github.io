// 둥둥 떠다니는 텍스트 객체
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 60; // 60프레임 (약 1초) 동안 생존
        this.vy = -1; // 위로 올라가는 속도
        this.alpha = 1.0; // 투명도
    }

    update() {
        this.y += this.vy;
        this.life--;
        // 수명이 다해갈수록 투명해짐
        if (this.life < 20) {
            this.alpha = this.life / 20;
        }
    }
}

export class EffectManager {
    constructor() {
        this.effects = [];
    }

    // 데미지 텍스트 추가
    addDamageText(x, y, amount, isCritical = false) {
        const tileSize = 40;
        // 유닛 머리 위 중앙쯤에 표시
        const px = x * tileSize + tileSize / 2;
        const py = y * tileSize;
        const color = isCritical ? '#ff0000' : '#ffffff'; // 크리티컬은 빨강, 일반은 흰색
        const text = isCritical ? `CRIT! ${amount}` : `${amount}`;
        
        this.effects.push(new FloatingText(px, py, text, color));
    }

    update() {
        // 모든 이펙트 업데이트 및 수명 다한 것 제거
        this.effects.forEach(e => e.update());
        this.effects = this.effects.filter(e => e.life > 0);
    }

    draw(ctx) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px Arial';
        
        this.effects.forEach(e => {
            ctx.fillStyle = e.color;
            ctx.globalAlpha = e.alpha;
            // 텍스트 외곽선 (가독성용)
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.strokeText(e.text, e.x, e.y);
            ctx.fillText(e.text, e.x, e.y);
        });
        
        ctx.restore();
    }
}