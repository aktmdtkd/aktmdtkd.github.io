export class Unit {
    // [수정] itemInfo 인자 추가
    constructor(config, classInfo, itemInfo = null) {
        this.id = config.id;
        this.name = config.name;
        this.team = config.team;
        this.x = config.x;
        this.y = config.y;
        
        this.tileSize = 40;
        this.pixelX = this.x * this.tileSize;
        this.pixelY = this.y * this.tileSize;
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
        
        // --- 스탯 계산 (기본 + 아이템) ---
        // 아이템 스탯 추출
        const iStats = itemInfo ? itemInfo.stats : {};

        // 1. HP
        this.maxHp = classInfo.hp + (iStats.hp || 0);
        this.currentHp = this.maxHp;
        
        // 2. MP
        this.maxMp = (classInfo.mp || 0) + (iStats.mp || 0);
        this.currentMp = this.maxMp;
        
        // 3. 공격력 / 방어력 / 정신력
        this.atk = classInfo.atk + (iStats.atk || 0);
        this.def = classInfo.def + (iStats.def || 0);
        this.int = (classInfo.int || 10) + (iStats.int || 0);
        
        this.skills = classInfo.skills || [];
        this.equippedItemName = itemInfo ? itemInfo.name : null; // 디버깅용

        this.isActionDone = false;
    }

    attackBump(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        if(distance > 0) {
            this.offsetX = (dx / distance) * 20;
            this.offsetY = (dy / distance) * 20;
        }
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
        if (this.offsetX !== 0 || this.offsetY !== 0) {
            this.offsetX *= 0.8;
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
    heal(amount) { this.currentHp += amount; if (this.currentHp > this.maxHp) this.currentHp = this.maxHp; }
    useMp(amount) { if (this.currentMp >= amount) { this.currentMp -= amount; return true; } return false; }
    isDead() { return this.currentHp <= 0; }
    resetTurn() { this.isActionDone = false; }
    endAction() { this.isActionDone = true; }
}