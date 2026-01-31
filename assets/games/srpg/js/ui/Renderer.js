export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 40; 
        this.camera = { x: 0, y: 0 };

        // [신규] 유닛 스프라이트 이미지 로드
        this.unitSprite = new Image();
        // index.html과 같은 위치에 이미지가 있다고 가정합니다.
        this.unitSprite.src = './image_e9fed6.png'; 
        this.isSpriteLoaded = false;
        
        this.unitSprite.onload = () => {
            this.isSpriteLoaded = true;
            console.log("Sprite Loaded");
        };
    }

    // [신규] 캔버스 해상도 리사이징
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    setTileSize(newSize) {
        this.tileSize = newSize;
    }

    updateCamera(x, y, mapCols, mapRows) {
        const viewW = this.canvas.width;
        const viewH = this.canvas.height;
        const mapW = mapCols * this.tileSize;
        const mapH = mapRows * this.tileSize;

        this.camera.x = x;
        this.camera.y = y;

        if (this.camera.x < 0) this.camera.x = 0;
        if (this.camera.y < 0) this.camera.y = 0;
        
        if (mapW > viewW) {
            if (this.camera.x > mapW - viewW) this.camera.x = mapW - viewW;
        } else {
            this.camera.x = 0;
        }

        if (mapH > viewH) {
            if (this.camera.y > mapH - viewH) this.camera.y = mapH - viewH;
        } else {
            this.camera.y = 0;
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawMap(gridMap) {
        if (!gridMap.data) return;
        
        for (let y = 0; y < gridMap.rows; y++) {
            for (let x = 0; x < gridMap.cols; x++) {
                const px = x * this.tileSize - this.camera.x;
                const py = y * this.tileSize - this.camera.y;

                if (px < -this.tileSize || py < -this.tileSize || 
                    px > this.canvas.width || py > this.canvas.height) continue;

                const type = gridMap.data[y][x];
                if (type === 0) this.ctx.fillStyle = '#4ea24e';
                else if (type === 1) this.ctx.fillStyle = '#8b4513';
                else if (type === 2) this.ctx.fillStyle = '#4444ff';

                this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
            }
        }
    }

    drawHighlights(tiles, colorType = 'move') {
        if(colorType === 'move') {
            this.ctx.fillStyle = 'rgba(0, 0, 255, 0.4)';
            this.ctx.strokeStyle = 'rgba(0, 0, 255, 0.8)';
        } else if(colorType === 'attack') {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        }

        tiles.forEach(tile => {
            const px = tile.x * this.tileSize - this.camera.x;
            const py = tile.y * this.tileSize - this.camera.y;
            this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
            this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
        });
    }

    drawCursor(unit) {
        if(!unit) return;
        const px = unit.x * this.tileSize - this.camera.x;
        const py = unit.y * this.tileSize - this.camera.y;
        
        this.ctx.strokeStyle = '#FFFF00';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
        this.ctx.lineWidth = 1;
    }

    drawUnits(units) {
        units.forEach(unit => {
            const px = unit.pixelX + unit.offsetX - this.camera.x;
            const py = unit.pixelY + unit.offsetY - this.camera.y;
            
            // 화면 밖 유닛은 그리지 않음
            if (px < -this.tileSize || py < -this.tileSize || px > this.canvas.width || py > this.canvas.height) return;

            const size = this.tileSize;

            // --- [신규] 스프라이트 그리기 ---
            if (this.isSpriteLoaded) {
                // 이미지 4x4 분할 계산
                const spriteW = this.unitSprite.width / 4;
                const spriteH = this.unitSprite.height / 4;

                // 소스 좌표 계산 (frame:열, direction:행)
                const srcX = unit.frame * spriteW;
                const srcY = unit.direction * spriteH;

                this.ctx.save();
                
                // 행동 완료 시 반투명 처리
                if (unit.isActionDone) {
                    this.ctx.globalAlpha = 0.6;
                }

                // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
                this.ctx.drawImage(
                    this.unitSprite,
                    srcX, srcY, spriteW, spriteH, // 원본에서 잘라낼 영역
                    px, py, size, size            // 화면에 그릴 영역
                );
                
                this.ctx.restore();

            } else {
                // 이미지가 아직 로딩되지 않았다면 기존 사각형 방식으로 그림 (에러 방지)
                const padding = size * 0.1;
                this.ctx.fillStyle = unit.team === 'blue' ? '#0000AA' : '#AA0000';
                if (unit.isActionDone) this.ctx.fillStyle = '#888888';
                this.ctx.fillRect(px + padding, py + padding, size - padding*2, size - padding*2);
            }

            // --- 유닛 이름 (그림자 추가로 가독성 확보) ---
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = `bold ${Math.floor(size/4)}px Arial`;
            this.ctx.textAlign = 'center';
            
            // 텍스트 외곽선/그림자
            this.ctx.shadowColor = "black";
            this.ctx.shadowBlur = 4;
            this.ctx.lineWidth = 2;
            
            // 머리 위에 이름 표시
            this.ctx.fillText(unit.name, px + size/2, py);
            this.ctx.shadowBlur = 0; // 그림자 초기화

            // --- 체력바 ---
            const hpRatio = unit.currentHp / unit.maxHp;
            const barHeight = Math.max(3, size * 0.1);

            // 체력바 배경
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(px, py + size - barHeight, size, barHeight);
            
            // 체력바 상태 (초록/노랑/빨강)
            if(hpRatio > 0.5) this.ctx.fillStyle = '#00FF00';
            else if(hpRatio > 0.25) this.ctx.fillStyle = '#FFFF00';
            else this.ctx.fillStyle = '#FF0000';
            
            this.ctx.fillRect(px, py + size - barHeight, size * hpRatio, barHeight);
        });
    }

    drawEffects(effectManager) {
        effectManager.draw(this.ctx, this.camera, this.tileSize);
    }

    drawGameOver(result) {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = result === 'WIN' ? '#00ff00' : '#ff0000';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const text = result === 'WIN' ? "VICTORY!" : "GAME OVER";
        this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.fillText("Click to Restart", this.canvas.width / 2, this.canvas.height / 2 + 50);
        this.ctx.restore();
    }
}