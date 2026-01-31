import { TERRAIN_DATA } from '../data/constants.js';

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 40;
        
        this.camera = { x: 0, y: 0 };
        this.images = {}; 
        
        // 애니메이션 프레임
        this.frameCount = 0;
        this.spriteCycle = 0; 
        this.spriteFrame = 1;

        this.loadImages();
    }

    loadImages() {
        // 이미지는 ./image/ 폴더에서 불러옵니다.
        const imageList = [
            { key: 'enemy', file: 'bg_rm_jbb.png' }, 
            { key: 'caocao', file: 'bg_rm_jbb.png' },
        ];
        
        imageList.forEach(data => {
            const img = new Image();
            img.src = `./image/${data.file}`;
            
            img.onload = () => {
                this.images[data.key] = img;
            };
        });
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.imageSmoothingEnabled = false; 
    }

    setTileSize(size) {
        this.tileSize = size;
    }

    updateCamera(targetX, targetY, mapCols, mapRows) {
        const viewW = this.canvas.width;
        const viewH = this.canvas.height;
        
        if (!mapCols || !mapRows) return;

        const maxX = (mapCols * this.tileSize) - viewW;
        const maxY = (mapRows * this.tileSize) - viewH;

        let camX = targetX; 
        let camY = targetY;

        if (maxX > 0) camX = Math.max(0, Math.min(camX, maxX));
        else camX = -(viewW - (mapCols * this.tileSize)) / 2;

        if (maxY > 0) camY = Math.max(0, Math.min(camY, maxY));
        else camY = -(viewH - (mapRows * this.tileSize)) / 2;

        this.camera.x = Math.floor(camX);
        this.camera.y = Math.floor(camY);
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.frameCount++;
        if (this.frameCount > 15) { 
            this.frameCount = 0;
            const cycle = [1, 0, 1, 2];
            this.spriteCycle = (this.spriteCycle + 1) % 4;
            this.spriteFrame = cycle[this.spriteCycle];
        }
    }

    // [핵심 수정] 복잡한 계산식 제거 -> 0부터 끝까지 다 그리기 (가장 안전함)
    drawMap(gridMap) {
        // 맵 데이터가 없으면 아무것도 안 함
        if (!gridMap || !gridMap.cols || !gridMap.rows) return;

        const rows = gridMap.rows;
        const cols = gridMap.cols;

        // 이중 반복문으로 맵 전체 순회
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                
                // 1. 카메라 좌표 반영
                const px = Math.floor(x * this.tileSize - this.camera.x);
                const py = Math.floor(y * this.tileSize - this.camera.y);

                // 2. (최적화) 화면 밖으로 너무 멀리 나간 것만 그리지 않음
                if (px < -this.tileSize || py < -this.tileSize || 
                    px > this.canvas.width || py > this.canvas.height) {
                    continue;
                }

                // 3. 타일 그리기 (네모 박스)
                if (gridMap.isValid(x, y)) {
                    const terrain = gridMap.getTerrain(x, y);

                    // 지형 색상
                    if (terrain === 1) this.ctx.fillStyle = '#8B4513'; // 산 (갈색)
                    else if (terrain === 2) this.ctx.fillStyle = '#4169E1'; // 강 (파란색)
                    else this.ctx.fillStyle = '#228B22'; // 평지 (녹색)
                    
                    // 타일 채우기
                    this.ctx.fillRect(px, px + this.tileSize, this.tileSize, this.tileSize);
                    
                    // 타일 테두리
                    this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
                }
            }
        }
    }

    drawHighlights(tiles, type) {
        this.ctx.fillStyle = type === 'move' ? 'rgba(0, 0, 255, 0.3)' : 'rgba(255, 0, 0, 0.4)';
        tiles.forEach(t => {
            const px = Math.floor(t.x * this.tileSize - this.camera.x);
            const py = Math.floor(t.y * this.tileSize - this.camera.y);
            this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
        });
    }

    drawCursor(unit) {
        if (!unit) return;
        const px = Math.floor(unit.x * this.tileSize - this.camera.x);
        const py = Math.floor(unit.y * this.tileSize - this.camera.y);
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
    }

    drawUnits(units) {
        const sortedUnits = [...units].sort((a, b) => a.pixelY - b.pixelY);

        sortedUnits.forEach(unit => {
            if(unit.isDead()) return;

            const px = Math.floor(unit.pixelX + unit.offsetX - this.camera.x);
            const py = Math.floor(unit.pixelY + unit.offsetY - this.camera.y);

            // 이미지 찾기
            let img = null;
            if (unit.name === '조조') img = this.images['caocao'];
            else if (unit.team === 'red') img = this.images['enemy'];
            else img = this.images['caocao'];

            // 이미지가 있으면 스프라이트 그리기
            if (img && img.complete && img.naturalWidth > 0) {
                this.drawSprite(this.ctx, img, unit, px, py);
            } else {
                // 없으면 네모 박스
                this.drawFallbackUnit(this.ctx, unit, px, py);
            }

            this.drawHpBar(this.ctx, unit, px, py);
        });
    }

    drawFallbackUnit(ctx, unit, x, y) {
        ctx.fillStyle = unit.team === 'blue' ? '#4444ff' : '#ff4444';
        if (unit.isActionDone) ctx.fillStyle = '#555555';
        
        ctx.beginPath();
        ctx.arc(x + this.tileSize/2, y + this.tileSize/2, this.tileSize/2 - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawHpBar(ctx, unit, x, y) {
        const hpPct = unit.currentHp / unit.maxHp;
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 2, y - 6, this.tileSize - 4, 4);
        ctx.fillStyle = hpPct > 0.5 ? '#0f0' : '#f00';
        ctx.fillRect(x + 2, y - 6, (this.tileSize - 4) * hpPct, 4);
    }

    drawSprite(ctx, img, unit, x, y) {
        const cols = 4;
        const rows = 4; 
        const frameW = img.width / cols;
        const frameH = img.height / rows;

        let dir = unit.direction !== undefined ? unit.direction : 0;
        
        let colIndex = 1; 
        if (unit.isMoving) {
            colIndex = this.spriteFrame; 
        }

        const drawW = this.tileSize * 1.3; 
        const scale = drawW / frameW;
        const drawH = frameH * scale;

        const drawX = x + (this.tileSize - drawW) / 2;
        const drawY = y + (this.tileSize - drawH) - 4; 

        try {
            ctx.drawImage(
                img,
                colIndex * frameW, dir * frameH, frameW, frameH, 
                drawX, drawY, drawW, drawH 
            );
        } catch (e) { }
    }

    drawEffects(effectManager) {
        effectManager.effects.forEach(eff => {
            const px = Math.floor(eff.x * this.tileSize - this.camera.x + this.tileSize/2);
            const py = Math.floor(eff.y * this.tileSize - this.camera.y);
            this.ctx.fillStyle = eff.color;
            this.ctx.font = 'bold 16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(eff.text, px, py - eff.life);
        });
    }

    drawGameOver(result) {
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = result === 'WIN' ? '#00ff00' : '#ff0000';
        this.ctx.font = 'bold 40px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(result === 'WIN' ? "VICTORY" : "DEFEAT", this.canvas.width/2, this.canvas.height/2);
    }
}