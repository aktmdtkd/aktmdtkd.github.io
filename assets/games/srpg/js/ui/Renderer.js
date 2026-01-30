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
        this.spriteCycle = 0; // 0, 1, 2, 1...
        this.spriteFrame = 1; // 1(차렷)이 기본

        this.loadImages();
    }

    loadImages() {
        // 사용할 캐릭터 이미지 파일명 목록
        // 파일명과 assets/images/units/ 안의 파일명이 정확히 일치해야 합니다. (대소문자 구별)
        const charNames = ['caocao', 'enemy', 'guojia']; 
        
        charNames.forEach(name => {
            const img = new Image();
            // 확장자가 png가 아니라 jpg라면 여기서 .jpg로 고쳐주세요
            img.src = `./assets/images/units/${name}.png`;
            
            // [수정] 복잡한 처리 없이 단순히 로딩만 함 (가장 안전함)
            img.onload = () => {
                this.images[name] = img;
                console.log(`Image loaded: ${name}`);
            };
            img.onerror = () => {
                console.error(`Failed to load image: ${name}`);
            };
        });
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.imageSmoothingEnabled = false; // 도트가 선명하게 보이도록 설정
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

        // 맵이 화면보다 작을 때는 중앙 정렬, 클 때는 클램핑
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
        
        // 걷기 애니메이션 사이클 (약 15프레임마다 갱신)
        this.frameCount++;
        if (this.frameCount > 15) { 
            this.frameCount = 0;
            const cycle = [0, 1, 2, 1]; // 왼발 - 차렷 - 오른발 - 차렷
            this.spriteCycle = (this.spriteCycle + 1) % 4;
            this.spriteFrame = cycle[this.spriteCycle];
        }
    }

    drawMap(gridMap) {
        if (!gridMap || gridMap.cols === 0) return;

        const startCol = Math.floor(this.camera.x / this.tileSize);
        const startRow = Math.floor(this.camera.y / this.tileSize);
        // 화면 밖 여유분(+1~2)까지 그려서 끊김 방지
        const endCol = startCol + (this.canvas.width / this.tileSize) + 1;
        const endRow = startRow + (this.canvas.height / this.tileSize) + 1;

        for (let y = startRow; y <= endRow; y++) {
            for (let x = startCol; x <= endCol; x++) {
                if (gridMap.isValid(x, y)) {
                    const terrain = gridMap.getTerrain(x, y);
                    const px = Math.floor(x * this.tileSize - this.camera.x);
                    const py = Math.floor(y * this.tileSize - this.camera.y);

                    // 지형 색상 (상수는 constants.js 참조하지만 여기선 하드코딩으로 안전하게)
                    if (terrain === 1) this.ctx.fillStyle = '#8B4513'; // 산 (갈색)
                    else if (terrain === 2) this.ctx.fillStyle = '#4169E1'; // 강 (파란색)
                    else this.ctx.fillStyle = '#228B22'; // 평지 (녹색)
                    
                    this.ctx.fillRect(px, px + this.tileSize, this.tileSize, this.tileSize); // 약간 겹치게 그려서 틈새 방지
                    this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
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
        // Y좌표 순서로 정렬 (아래 있는 유닛이 위에 그려지도록)
        const sortedUnits = [...units].sort((a, b) => a.pixelY - b.pixelY);

        sortedUnits.forEach(unit => {
            if(unit.isDead()) return;

            const px = Math.floor(unit.pixelX + unit.offsetX - this.camera.x);
            const py = Math.floor(unit.pixelY + unit.offsetY - this.camera.y);

            // 이미지 찾기
            let img = null;
            if (unit.name === '조조') img = this.images['caocao'];
            else if (unit.team === 'red') img = this.images['enemy'];
            else img = this.images['caocao']; // 기본값

            // 이미지가 로드되었고 유효하다면 그리기
            if (img && img.complete && img.naturalWidth !== 0) {
                this.drawSprite(this.ctx, img, unit, px, py);
            } else {
                // 이미지가 없으면 네모/동그라미 그리기 (Fallback)
                this.ctx.fillStyle = unit.team === 'blue' ? '#4444ff' : '#ff4444';
                if (unit.isActionDone) this.ctx.fillStyle = '#555555';
                
                this.ctx.beginPath();
                this.ctx.arc(px + this.tileSize/2, py + this.tileSize/2, this.tileSize/2 - 4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }

            // 체력바
            const hpPct = unit.currentHp / unit.maxHp;
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(px + 2, py - 6, this.tileSize - 4, 4);
            this.ctx.fillStyle = hpPct > 0.5 ? '#0f0' : '#f00';
            this.ctx.fillRect(px + 2, py - 6, (this.tileSize - 4) * hpPct, 4);
        });
    }

    drawSprite(ctx, img, unit, x, y) {
        // 이미지가 가로 3칸인지 4칸인지 확인
        // 보통 가로:세로 비율로 추측 가능 (3:4 또는 4:4)
        const ratio = img.width / img.height;
        let cols = 3;
        
        // 가로가 세로보다 비슷하거나 길면 4열일 확률이 높음 (가져오신 이미지는 4열이었음)
        // 하지만 잘라오신 이미지가 3열이면 3으로 동작
        if (ratio >= 1.0) cols = 4; // 가로 4칸짜리면 4로 설정
        else cols = 3; 

        const rows = 4; 
        const frameW = img.width / cols;
        const frameH = img.height / rows;

        // Unit의 방향 (0:하, 1:좌, 2:우, 3:상)
        let dir = unit.direction !== undefined ? unit.direction : 0;
        
        // 애니메이션 프레임 (이동 중일 때만)
        let colIndex = 1; // 차렷
        if (unit.isMoving) {
            colIndex = this.spriteFrame; // 0, 1, 2
        }

        // 화면에 그릴 크기 (타일보다 20% 크게)
        const drawW = this.tileSize * 1.2; 
        const scale = drawW / frameW;
        const drawH = frameH * scale;

        // 위치 보정 (발바닥이 타일 아래에 닿게)
        const drawX = x + (this.tileSize - drawW) / 2;
        const drawY = y + (this.tileSize - drawH) - 4;

        ctx.drawImage(
            img,
            colIndex * frameW, dir * frameH, frameW, frameH, 
            drawX, drawY, drawW, drawH
        );
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