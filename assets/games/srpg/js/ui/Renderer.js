import { TERRAIN_DATA } from '../data/constants.js';

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 40;
        
        this.camera = { x: 0, y: 0 };
        this.images = {}; 
        
        // 애니메이션 변수
        this.frameCount = 0;
        this.spriteCycle = 0; 
        this.spriteFrame = 1;

        this.loadImages();
    }

    loadImages() {
        // [이미지 로딩] 파일명은 정확해야 합니다 (대소문자 구별)
        const charNames = ['caocao', 'enemy', 'guojia']; 
        
        charNames.forEach(name => {
            const img = new Image();
            img.src = `./assets/images/units/${name}.png`; // png가 아니면 .jpg로 수정
            
            img.onload = () => {
                this.images[name] = img;
            };
            // 에러가 나도 게임이 멈추지 않도록 처리
            img.onerror = () => {
                console.warn(`이미지 로드 실패: ${name} (기본 도형으로 표시됨)`);
            };
        });
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.imageSmoothingEnabled = false; // 도트 깨짐 방지
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
        
        this.frameCount++;
        if (this.frameCount > 15) { 
            this.frameCount = 0;
            const cycle = [0, 1, 2, 1];
            this.spriteCycle = (this.spriteCycle + 1) % 4;
            this.spriteFrame = cycle[this.spriteCycle];
        }
    }

    // [수정] 복잡한 계산을 빼고, 전체 맵을 순회하며 그리는 안전한 방식
    drawMap(gridMap) {
        if (!gridMap) return;

        // gridMap.rows나 cols가 없으면 기본값 처리
        const rows = gridMap.rows || 20;
        const cols = gridMap.cols || 20;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // 화면 밖이면 그리지 않음 (간단한 최적화)
                const px = Math.floor(x * this.tileSize - this.camera.x);
                const py = Math.floor(y * this.tileSize - this.camera.y);

                if (px < -this.tileSize || py < -this.tileSize || 
                    px > this.canvas.width || py > this.canvas.height) {
                    continue;
                }

                if (gridMap.isValid(x, y)) {
                    const terrain = gridMap.getTerrain(x, y);

                    // 지형 색상 (하드코딩으로 안전하게)
                    if (terrain === 1) this.ctx.fillStyle = '#8B4513'; // 산 (갈색)
                    else if (terrain === 2) this.ctx.fillStyle = '#4169E1'; // 강 (파란색)
                    else this.ctx.fillStyle = '#228B22'; // 평지 (초록색)
                    
                    this.ctx.fillRect(px, px + this.tileSize, this.tileSize, this.tileSize);
                    
                    // 격자(테두리) 그리기
                    this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
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

            if (img && img.complete && img.naturalWidth > 0) {
                this.drawSprite(this.ctx, img, unit, px, py);
            } else {
                // 이미지가 없으면 동그라미 그리기
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
        // 이미지 비율로 칸 수 추측 (4열 or 3열)
        const ratio = img.width / img.height;
        let cols = 3;
        if (ratio >= 0.9) cols = 4; // 4칸짜리 이미지로 추정

        const rows = 4; 
        const frameW = img.width / cols;
        const frameH = img.height / rows;

        let dir = unit.direction !== undefined ? unit.direction : 0;
        let colIndex = 1; // 차렷

        if (unit.isMoving) {
            colIndex = this.spriteFrame;
        }
        
        // 4칸짜리 이미지인데 인덱스가 범위 넘지 않도록 방어
        if (colIndex >= cols) colIndex = 1;

        const drawW = this.tileSize * 1.4; 
        const scale = drawW / frameW;
        const drawH = frameH * scale;

        const drawX = x + (this.tileSize - drawW) / 2;
        const drawY = y + (this.tileSize - drawH) - 5;

        try {
            ctx.drawImage(
                img,
                colIndex * frameW, dir * frameH, frameW, frameH, 
                drawX, drawY, drawW, drawH
            );
        } catch (e) {
            // 그리기 오류 무시
        }
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