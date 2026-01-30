export class Unit {
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
        this.moveSpeed = 4; // 이동 속도

        // [신규] 바라보는 방향 (0:하, 1:좌, 2:우, 3:상)
        this.direction = 0;

        this.className = classInfo.name;
        this.moveRange = classInfo.moveRange;
        this.attackRange = classInfo.attackRange;
        
        // 스탯 계산
        const iStats = itemInfo ? itemInfo.stats : {};
        this.maxHp = classInfo.hp + (iStats.hp || 0);
        this.currentHp = this.maxHp;
        this.maxMp = (classInfo.mp || 0) + (iStats.mp || 0);
        this.currentMp = this.maxMp;
        this.atk = classInfo.atk + (iStats.atk || 0);
        this.def = classInfo.def + (iStats.def || 0);
        this.int = (classInfo.int || 10) + (iStats.int || 0);
        
        this.skills = classInfo.skills || [];
        this.equippedItemName = itemInfo ? itemInfo.name : null; 
        this.isActionDone = false;
    }

    attackBump(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        
        // 공격할 때도 방향 전환
        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? 2 : 1; // 우 or 좌
        } else {
            this.direction = dy > 0 ? 0 : 3; // 하 or 상
        }

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
            
            // [신규] 다음 타일로 이동할 때 방향 계산
            const dx = nextTile.x - this.x;
            const dy = nextTile.y - this.y;

            if (dx > 0) this.direction = 2; // 우
            else if (dx < 0) this.direction = 1; // 좌
            else if (dy > 0) this.direction = 0; // 하
            else if (dy < 0) this.direction = 3; // 상

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