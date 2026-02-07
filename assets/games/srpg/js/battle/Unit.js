export class Unit {
    constructor(config, classInfo, itemInfo = null) {
        this.id = config.id;
        this.name = config.name;
        this.team = config.team; // 'blue': 아군, 'red': 적군
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
        this.moveSpeed = 4;

        this.className = classInfo.name; // 한글 이름 (보병, 기병 등)
        this.classType = config.class;   // 영문 키 (infantry, cavalry 등)
        
        this.moveRange = classInfo.moveRange;
        this.attackRange = classInfo.attackRange;
        
        // --- 스탯 설정 ---
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

        // --- 애니메이션 속성 ---
        this.direction = 0;   
        this.frame = 0;       
        this.frameTimer = 0;

        // [신규] 유닛에 맞는 이미지 파일명 결정
        this.spriteName = this.getSpriteName();
    }

getSpriteName() {
        // [수정됨] 조조: 반드시 'raw.githubusercontent.com' 주소를 써야 합니다!
        if (this.name === '조조') {
            return "https://raw.githubusercontent.com/aktmdtkd/game_assets/main/caocao_srpg_assets/caocao_ngb.png";
        }

        // --- 기존 로직 ---
        let prefix = (this.team === 'blue') ? "red_" : "blue_";
        let suffix = "nbb.png"; 
        
        if (this.classType === 'infantry') suffix = "https://raw.githubusercontent.com/aktmdtkd/game_assets/main/caocao_srpg_assets/"+prefix+"_nbb.png"; 
        else if (this.classType === 'archer') suffix = "https://raw.githubusercontent.com/aktmdtkd/game_assets/main/caocao_srpg_assets/"+prefix+"_nbow.png"; 
        else if (this.classType === 'cavalry') suffix = "https://raw.githubusercontent.com/aktmdtkd/game_assets/main/caocao_srpg_assets/"+prefix+"_ngb.png"; 
        else if (this.classType === 'mage') suffix = "https://raw.githubusercontent.com/aktmdtkd/game_assets/main/caocao_srpg_assets/"+prefix+"_nbb.png"; 
        
        return prefix + suffix;
    }

    attackBump(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        if (Math.abs(dx) > Math.abs(dy)) this.direction = dx > 0 ? 2 : 1;
        else this.direction = dy > 0 ? 0 : 3;

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
            if (nextTile.x > this.x) this.direction = 2;
            else if (nextTile.x < this.x) this.direction = 1;
            else if (nextTile.y > this.y) this.direction = 0;
            else if (nextTile.y < this.y) this.direction = 3;

            this.targetPixelX = nextTile.x * this.tileSize;
            this.targetPixelY = nextTile.y * this.tileSize;
        } else {
            this.isMoving = false;
        }
    }

    update() {
        this.frameTimer++;
        if (this.frameTimer > 12) {
            this.frameTimer = 0;
            this.frame = (this.frame + 1) % 4;
        }

        if (this.offsetX !== 0 || this.offsetY !== 0) {
            this.offsetX *= 0.8;
            this.offsetY *= 0.8;
            if (Math.abs(this.offsetX) < 0.5) { this.offsetX = 0; this.offsetY = 0; }
        }

        if (!this.isMoving) return false;

        let arrivedX = false;
        let arrivedY = false;

        if (this.pixelX < this.targetPixelX) this.pixelX = Math.min(this.pixelX + this.moveSpeed, this.targetPixelX);
        else if (this.pixelX > this.targetPixelX) this.pixelX = Math.max(this.pixelX - this.moveSpeed, this.targetPixelX);
        else arrivedX = true;

        if (this.pixelY < this.targetPixelY) this.pixelY = Math.min(this.pixelY + this.moveSpeed, this.targetPixelY);
        else if (this.pixelY > this.targetPixelY) this.pixelY = Math.max(this.pixelY - this.moveSpeed, this.targetPixelY);
        else arrivedY = true;

        if (arrivedX && arrivedY) {
            const arrivedTile = this.pathQueue.shift();
            this.x = arrivedTile.x;
            this.y = arrivedTile.y;
            if (this.pathQueue.length > 0) { this.setNextStep(); return false; }
            else { this.isMoving = false; return true; }
        }
        return false;
    }
    
    takeDamage(amount) { this.currentHp -= amount; if (this.currentHp < 0) this.currentHp = 0; }
    heal(amount) { this.currentHp += amount; if (this.currentHp > this.maxHp) this.currentHp = this.maxHp; }
    useMp(amount) { if (this.currentMp >= amount) { this.currentMp -= amount; return true; } return false; }
    isDead() { return this.currentHp <= 0; }
    resetTurn() { this.isActionDone = false; }
    endAction() { this.isActionDone = true; }
}