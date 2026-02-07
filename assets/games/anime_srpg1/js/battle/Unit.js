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
        
        // 공격 모션용 오프셋 변수
        this.offsetX = 0;
        this.offsetY = 0;
        
        // [신규] 공격 애니메이션 상태 변수
        this.isBumping = false;
        this.bumpTimer = 0;
        this.bumpTargetX = 0;
        this.bumpTargetY = 0;

        this.pathQueue = []; 
        this.targetPixelX = this.pixelX;
        this.targetPixelY = this.pixelY;
        this.isMoving = false;
        this.moveSpeed = 4;

        this.className = classInfo.name;
        this.classType = config.class;
        
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

        this.spriteName = this.getSpriteName();
    }

    getSpriteName() {
        const nameToSprite = {
            "아카리": "https://raw.githubusercontent.com/aktmdtkd/game_assets/refs/heads/main/anime_srpg_assets/yuruyuri/akari.png",
            "쿄코": "https://raw.githubusercontent.com/aktmdtkd/game_assets/refs/heads/main/anime_srpg_assets/yuruyuri/kyoko_warior.png",
            "유이": "https://raw.githubusercontent.com/aktmdtkd/game_assets/refs/heads/main/anime_srpg_assets/yuruyuri/yui_stold.png",
            "치나츠": "https://raw.githubusercontent.com/aktmdtkd/game_assets/refs/heads/main/anime_srpg_assets/yuruyuri/chinachu_tanker.png"
        };
        if (nameToSprite[this.name]) return nameToSprite[this.name];
        if (this.team === 'red') {
            if (this.classType === 'cavalry') return "https://raw.githubusercontent.com/aktmdtkd/game_assets/main/caocao_srpg_assets/red_jgb.png";
            else return "https://raw.githubusercontent.com/aktmdtkd/game_assets/main/caocao_srpg_assets/red_jbb.png";
        }
        return "https://raw.githubusercontent.com/aktmdtkd/game_assets/main/caocao_srpg_assets/red_nbb.png";
    }

    // [수정됨] 공격 모션 시작 (목표 설정 및 타이머 초기화)
    attackBump(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        
        // 방향 전환
        if (Math.abs(dx) > Math.abs(dy)) this.direction = dx > 0 ? 2 : 1;
        else this.direction = dy > 0 ? 0 : 3;

        const distance = Math.sqrt(dx*dx + dy*dy);
        if(distance > 0) {
            // 타일의 60% 지점까지 전진 (24px)
            const bumpDist = 24; 
            this.bumpTargetX = (dx / distance) * bumpDist;
            this.bumpTargetY = (dy / distance) * bumpDist;
            
            // 애니메이션 시작
            this.isBumping = true;
            this.bumpTimer = 0;
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

        // [신규] 공격 모션 프레임 처리 (전진 -> 복귀)
        if (this.isBumping) {
            this.bumpTimer++;
            const maxFrame = 16; // 전체 애니메이션 길이 (약 0.26초)
            const peakFrame = 6; // 타격 지점 도달 시간

            if (this.bumpTimer <= peakFrame) {
                // 전진 단계 (빠르게)
                const ratio = this.bumpTimer / peakFrame;
                this.offsetX = this.bumpTargetX * ratio;
                this.offsetY = this.bumpTargetY * ratio;
            } else if (this.bumpTimer <= maxFrame) {
                // 후퇴 단계 (부드럽게)
                const ratio = 1 - ((this.bumpTimer - peakFrame) / (maxFrame - peakFrame));
                this.offsetX = this.bumpTargetX * ratio;
                this.offsetY = this.bumpTargetY * ratio;
            } else {
                // 종료
                this.isBumping = false;
                this.offsetX = 0;
                this.offsetY = 0;
            }
        } else {
            // 혹시 남은 오프셋 제거 (안전장치)
            if (this.offsetX !== 0 || this.offsetY !== 0) {
                this.offsetX = 0;
                this.offsetY = 0;
            }
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