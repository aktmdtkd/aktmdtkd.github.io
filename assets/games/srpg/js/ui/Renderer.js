import { TERRAIN_DATA } from '../data/constants.js';

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 40;
        
        this.camera = { x: 0, y: 0 };
        this.images = {}; 
        
        // 애니메이션 타이머
        this.frameCount = 0;
        this.spriteCycle = 0; 
        this.spriteFrame = 1;

        this.loadImages();
    }

    loadImages() {
        const imageList = [
            { key: 'enemy', file: 'bg_rm_jbb.png' }, // 보내주신 병사 이미지
            { key: 'caocao', file: 'bg_rm_jbb.png' }, // 조조도 일단 병사로 (테스트용)
        ];
        
        imageList.forEach(data => {
            const img = new Image();
            img.src = `./assets/images/units/${data.file}`; // 경로 확인
            
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
        
        // 걷기 애니메이션
        this.frameCount++;
        if (this.frameCount > 15) { 
            this.frameCount = 0;
            const cycle = [1, 0, 1, 2]; // 차렷 -> 왼발 -> 차렷 -> 오른발
            this.spriteCycle = (this.spriteCycle + 1) % 4;
            this.spriteFrame = cycle[this.spriteCycle];
        }
    }

    // [수정됨] "대각선 버그" 해결을 위해 전체 맵을 순회하는 방식으로 변경
    drawMap(gridMap) {
        if (!gridMap || !gridMap.terrain) return;

        // startCol, endCol 계산을 없애고 맵 전체를 돕니다.
        const rows = gridMap.rows;
        const cols = gridMap.cols;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // 1. 화면에 그릴 위치 계산
                const px = Math.floor(x * this.tileSize - this.camera.x);
                const py = Math.floor(y * this.tileSize - this.camera.y);

                // 2. 화면 밖으로 완전히 나간 타일은 그리지 않음 (성능 최적화)
                if (px < -this.tileSize || py < -this.tileSize || 
                    px > this.canvas.width || py > this.canvas.height) {
                    continue;
                }

                // 3. 유효한 타일이면 그리기
                if (gridMap.isValid(x, y)) {
                    const terrain = gridMap.getTerrain(x, y);

                    // 지형 색상
                    if (terrain === 1) this.ctx.fillStyle = '#8B4513'; // 산
                    else if (terrain === 2) this.ctx.fillStyle = '#4169E1'; // 강
                    else this.ctx.fillStyle = '#228B22'; // 평지
                    
                    this.ctx.fillRect(px, px + this.tileSize, this.tileSize, this.tileSize);
                    
                    // 격자(테두리)
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

            // 이미지 매핑
            let img = null;
            if (unit.name === '조조') img = this.images['caocao'];
            else if (unit.team === 'red') img = this.images['enemy'];
            else img = this.images['caocao']; 

            if (img && img.complete && img.naturalWidth > 0) {
                this.drawSprite(this.ctx, img, unit, px, py);
            } else {
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