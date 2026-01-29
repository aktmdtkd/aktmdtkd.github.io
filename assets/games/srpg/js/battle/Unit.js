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
        
        // [수정] 경로 이동을 위한 큐
        this.pathQueue = []; 
        this.targetPixelX = this.pixelX;
        this.targetPixelY = this.pixelY;
        this.isMoving = false;
        this.moveSpeed = 8; // 속도 (8px/frame)

        this.className = classInfo.name;
        this.moveRange = classInfo.moveRange;
        this.attackRange = classInfo.attackRange;
        this.maxHp = classInfo.hp;
        this.currentHp = classInfo.hp;
        this.atk = classInfo.atk;
        this.def = classInfo.def;

        this.isActionDone = false;
    }

    // [수정] 경로(Path)를 받아서 이동 시작
    moveAlong(path) {
        if (!path || path.length === 0) return;
        
        // 이동할 경로 저장
        this.pathQueue = path;
        
        // 첫 번째 목표 설정
        this.setNextStep();
        this.isMoving = true;
    }

    // [신규] 다음 칸으로 목표 설정
    setNextStep() {
        if (this.pathQueue.length > 0) {
            const nextTile = this.pathQueue[0]; // 큐의 맨 앞 확인
            this.targetPixelX = nextTile.x * this.tileSize;
            this.targetPixelY = nextTile.y * this.tileSize;
        } else {
            this.isMoving = false;
        }
    }

    // [수정] 업데이트 로직 (한 칸씩 이동)
    update() {
        if (!this.isMoving) return false;

        let arrivedX = false;
        let arrivedY = false;

        // X축 이동
        if (this.pixelX < this.targetPixelX) {
            this.pixelX = Math.min(this.pixelX + this.moveSpeed, this.targetPixelX);
        } else if (this.pixelX > this.targetPixelX) {
            this.pixelX = Math.max(this.pixelX - this.moveSpeed, this.targetPixelX);
        } else {
            arrivedX = true;
        }

        // Y축 이동
        if (this.pixelY < this.targetPixelY) {
            this.pixelY = Math.min(this.pixelY + this.moveSpeed, this.targetPixelY);
        } else if (this.pixelY > this.targetPixelY) {
            this.pixelY = Math.max(this.pixelY - this.moveSpeed, this.targetPixelY);
        } else {
            arrivedY = true;
        }

        // 한 칸 도착 체크
        if (arrivedX && arrivedY) {
            // 방금 도착한 타일 정보 업데이트
            const arrivedTile = this.pathQueue.shift(); // 큐에서 제거
            this.x = arrivedTile.x;
            this.y = arrivedTile.y;

            if (this.pathQueue.length > 0) {
                // 아직 갈 길이 남았으면 다음 칸 설정
                this.setNextStep();
                return false; // 아직 최종 도착 아님
            } else {
                // 최종 도착
                this.isMoving = false;
                return true; // 도착 신호 보냄
            }
        }

        return false;
    }

    // (기존 메서드 유지)
    moveTo(x, y) { this.x = x; this.y = y; this.pixelX = x*40; this.pixelY = y*40; } // 순간이동용(AI등)
    takeDamage(amount) { this.currentHp -= amount; if (this.currentHp < 0) this.currentHp = 0; }
    isDead() { return this.currentHp <= 0; }
    resetTurn() { this.isActionDone = false; }
    endAction() { this.isActionDone = true; }
}