export class Unit {
    constructor(config, classInfo) {
        this.id = config.id;
        this.name = config.name;
        this.team = config.team;
        this.x = config.x;
        this.y = config.y;
        
        this.tileSize = 40;
        this.pixelX = this.x * this.tileSize;
        this.pixelY = this.y * this.tileSize;
        
        // [추가] 공격 모션용 오프셋 (흔들림 효과)
        this.offsetX = 0;
        this.offsetY = 0;
        
        this.pathQueue = []; 
        this.targetPixelX = this.pixelX;
        this.targetPixelY = this.pixelY;
        this.isMoving = false;
        this.moveSpeed = 8;

        this.className = classInfo.name;
        this.moveRange = classInfo.moveRange;
        this.attackRange = classInfo.attackRange;
        this.maxHp = classInfo.hp;
        this.currentHp = classInfo.hp;
        this.atk = classInfo.atk;
        this.def = classInfo.def;

        this.isActionDone = false;
    }

    // [추가] 공격 모션 시작 (대상 방향으로 살짝 튕김)
    attackBump(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        // 방향 벡터 정규화 및 반동 크기 설정 (20px)
        const distance = Math.sqrt(dx*dx + dy*dy);
        this.offsetX = (dx / distance) * 20;
        this.offsetY = (dy / distance) * 20;
    }

    moveAlong(path) {
        if (!path || path.length === 0) return;
        this.pathQueue = path;
        this.setNextStep();
        this.isMoving = true;
    }

    setNextStep() {
        if (this.pathQueue.length > 0) {
            const nextTile = this.pathQueue[0];
            this.targetPixelX = nextTile.x * this.tileSize;
            this.targetPixelY = nextTile.y * this.tileSize;
        } else {
            this.isMoving = false;
        }
    }

    update() {
        // [추가] 공격 모션 복귀 (오프셋을 서서히 0으로)
        if (this.offsetX !== 0 || this.offsetY !== 0) {
            this.offsetX *= 0.8; // 매 프레임 20%씩 감소
            this.offsetY *= 0.8;
            if (Math.abs(this.offsetX) < 0.5) this.offsetX = 0;
            if (Math.abs(this.offsetY) < 0.5) this.offsetY = 0;
        }

        if (!this.isMoving) return false;

        let arrivedX = false;
        let arrivedY = false;

        if (this.pixelX < this.targetPixelX) {
            this.pixelX = Math.min(this.pixelX + this.moveSpeed, this.targetPixelX);
        } else if (this.pixelX > this.targetPixelX) {
            this.pixelX = Math.max(this.pixelX - this.moveSpeed, this.targetPixelX);
        } else {
            arrivedX = true;
        }

        if (this.pixelY < this.targetPixelY) {
            this.pixelY = Math.min(this.pixelY + this.moveSpeed, this.targetPixelY);
        } else if (this.pixelY > this.targetPixelY) {
            this.pixelY = Math.max(this.pixelY - this.moveSpeed, this.targetPixelY);
        } else {
            arrivedY = true;
        }

        if (arrivedX && arrivedY) {
            const arrivedTile = this.pathQueue.shift();
            this.x = arrivedTile.x;
            this.y = arrivedTile.y;

            if (this.pathQueue.length > 0) {
                this.setNextStep();
                return false;
            } else {
                this.isMoving = false;
                return true;
            }
        }
        return false;
    }

    moveTo(x, y) { this.x = x; this.y = y; this.pixelX = x*40; this.pixelY = y*40; }
    takeDamage(amount) { this.currentHp -= amount; if (this.currentHp < 0) this.currentHp = 0; }
    isDead() { return this.currentHp <= 0; }
    resetTurn() { this.isActionDone = false; }
    endAction() { this.isActionDone = true; }
}