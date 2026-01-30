class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 60;
        this.vy = -1;
        this.alpha = 1.0;
    }

    update() {
        this.y += this.vy;
        this.life--;
        if (this.life < 20) {
            this.alpha = this.life / 20;
        }
    }
}

export class EffectManager {
    constructor() {
        this.effects = [];
    }

    addDamageText(x, y, amount, color='#ffffff') {
        const tileSize = 40;
        const px = x * tileSize + tileSize / 2;
        const py = y * tileSize;
        const text = String(amount);
        
        this.effects.push(new FloatingText(px, py, text, color));
    }

    update() {
        this.effects.forEach(e => e.update());
        this.effects = this.effects.filter(e => e.life > 0);
    }

    draw(ctx, camera = {x:0, y:0}) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px Arial';
        
        this.effects.forEach(e => {
            const screenX = e.x - camera.x;
            const screenY = e.y - camera.y;

            ctx.fillStyle = e.color;
            ctx.globalAlpha = e.alpha;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            
            ctx.strokeText(e.text, screenX, screenY);
            ctx.fillText(e.text, screenX, screenY);
        });
        
        ctx.restore();
    }
}