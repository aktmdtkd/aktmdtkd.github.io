export class Unit {
    constructor(config, classInfo) {
        this.id = config.id;
        this.name = config.name;
        this.team = config.team;
        this.x = config.x;
        this.y = config.y;
        
        // [추가] 시각적 애니메이션을 위한 변수
        this.tileSize = 40; // 렌더러와 동일해야 함
        this.pixelX = this.x * this.tileSize;
        this.pixelY = this.y * this.tileSize;
        this.targetPixelX = this.pixelX;
        this.targetPixelY = this.pixelY;
        this.isMoving = false;
        this.moveSpeed = 8; // 이동 속도 (클수록 빠름)

        // 스탯
        this.className = classInfo.name;
        this.moveRange = classInfo.moveRange;
        this.attackRange = classInfo.attackRange;
        this.maxHp = classInfo.hp;
        this.currentHp = classInfo.hp;
        this.atk = classInfo.atk;
        this.def = classInfo.def;

        this.isActionDone = false;
    }

    // [수정] 이동 명령: 목표 픽셀 좌표 설정
    moveTo(x, y) {
        // 논리적 좌표는 즉시 반영
        this.x = x;
        this.y = y;

        // 시각적 목표 지점 설정
        this.targetPixelX = x * this.tileSize;
        this.targetPixelY = y * this.tileSize;
        this.isMoving = true;
    }

    // [추가] 매 프레임 실행될 업데이트 함수 (애니메이션 담당)
    update() {
        if (!this.isMoving) return false; // 움직임 없으면 종료

        // X축 이동
        if (this.pixelX < this.targetPixelX) {
            this.pixelX = Math.min(this.pixelX + this.moveSpeed, this.targetPixelX);
        } else if (this.pixelX > this.targetPixelX) {
            this.pixelX = Math.max(this.pixelX - this.moveSpeed, this.targetPixelX);
        }

        // Y축 이동
        if (this.pixelY < this.targetPixelY) {
            this.pixelY = Math.min(this.pixelY + this.moveSpeed, this.targetPixelY);
        } else if (this.pixelY > this.targetPixelY) {
            this.pixelY = Math.max(this.pixelY - this.moveSpeed, this.targetPixelY);
        }

        // 도착 체크
        if (this.pixelX === this.targetPixelX && this.pixelY === this.targetPixelY) {
            this.isMoving = false;
            return true; // "방금 도착했다"는 신호 리턴
        }

        return false; // 아직 이동 중
    }

    takeDamage(amount) {
        this.currentHp -= amount;
        if (this.currentHp < 0) this.currentHp = 0;
    }

    isDead() {
        return this.currentHp <= 0;
    }

    resetTurn() {
        this.isActionDone = false;
    }

    endAction() {
        this.isActionDone = true;
    }
}