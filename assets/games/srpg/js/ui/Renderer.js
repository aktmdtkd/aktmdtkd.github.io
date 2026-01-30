import { TERRAIN_DATA } from '../data/constants.js';

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 40;
        
        this.camera = { x: 0, y: 0 };
        this.images = {}; // 이미지 저장소
        
        // 애니메이션 프레임
        this.frameCount = 0;
        this.spriteCycle = 0; 
        this.spriteFrame = 1; // 1:차렷

        this.loadImages();
    }

    loadImages() {
        // [중요] 여기에 사용할 이미지 파일명들을 적어주세요.
        // 확장자가 jpg면 .jpg로, png면 .png로 정확히 적어야 합니다.
        const charNames = ['caocao', 'enemy', 'guojia']; 
        
        charNames.forEach(name => {
            const img = new Image();
            // 경로 주의: assets/images/units/파일명.png
            // 만약 jpg를 쓰신다면 아래 .png를 .jpg로 고치세요.
            img.src = `./assets/images/units/${name}.png`;
            
            img.onload = () => {
                this.images[name] = img;
                console.log(`✅ Image loaded: ${name}`);
            };
            img.onerror = () => {
                console.warn(`⚠️ Failed to load image: ${name} (using fallback box)`);
            };
        });
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.imageSmoothingEnabled = false; // 도트 픽셀 유지
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
        
        // 걷기 애니메이션 속도 조절
        this.frameCount++;
        if (this.frameCount > 15) { 
            this.frameCount = 0;
            // 0(왼발) -> 1(차렷) -> 2(오른발) -> 1(차렷) 순환
            const cycle = [0, 1, 2, 1];
            this.spriteCycle = (this.spriteCycle + 1) % 4;
            this.spriteFrame = cycle[this.spriteCycle];
        }
    }

    drawMap(gridMap) {
        // 맵 데이터가 없으면 중단
        if (!gridMap || !gridMap.terrain) return;

        const startCol = Math.floor(this.camera.x / this.tileSize);
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const endCol = startCol + (this.canvas.width / this.tileSize) + 1;
        const endRow = startRow + (this.canvas.height / this.tileSize) + 1;

        for (let y = startRow; y <= endRow; y++) {
            for (let x = startCol; x <= endCol; x++) {
                if (gridMap.isValid(x, y)) {
                    const terrain = gridMap.getTerrain(x, y);
                    const px = Math.floor(x * this.tileSize - this.camera.x);
                    const py = Math.floor(y * this.tileSize - this.camera.y);

                    // 지형 색상 (안전하게 하드코딩)
                    if (terrain === 1) this.ctx.fillStyle = '#8B4513'; // 산
                    else if (terrain === 2) this.ctx.fillStyle = '#4169E1'; // 강
                    else this.ctx.fillStyle = '#228B22'; // 평지
                    
                    this.ctx.fillRect(px, px + this.tileSize, this.tileSize, this.tileSize);
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
        // Y축 정렬 (아래 유닛이 위에 오도록)
        const sortedUnits = [...units].sort((a, b) => a.pixelY - b.pixelY);

        sortedUnits.forEach(unit => {
            if(unit.isDead()) return;

            const px = Math.floor(unit.pixelX + unit.offsetX - this.camera.x);
            const py = Math.floor(unit.pixelY + unit.offsetY - this.camera.y);

            // 이미지 로드 여부 확인
            let img = null;
            // 이름 매핑 (조조 -> caocao.png)
            if (unit.name === '조조') img = this.images['caocao'];
            else if (unit.team === 'red') img = this.images['enemy'];
            else img = this.images['caocao']; // 기본값

            // 이미지가 로드완료(complete) 상태이고 크기가 있어야 그린다
            if (img && img.complete && img.naturalWidth > 0) {
                this.drawSprite(this.ctx, img, unit, px, py);
            } else {
                // 이미지가 없으면 네모 박스로 대체 (Fallback)
                this.drawFallbackUnit(this.ctx, unit, px, py);
            }

            // 체력바 그리기
            this.drawHpBar(this.ctx, unit, px, py);
        });
    }

    // 이미지가 없을 때 그리는 네모
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

    // 실제 스프라이트 자르기
    drawSprite(ctx, img, unit, x, y) {
        // [중요] 이미지가 가로 몇 칸인지 자동 감지
        // 보통 가로가 세로보다 길거나 비슷하면 4칸, 좁으면 3칸
        const ratio = img.width / img.height;
        let cols = 3;
        
        // 보여주신 이미지는 가로가 길어서(4열) 비율이 높을 겁니다.
        // 안전하게 4열로 가정합니다. (3열 이미지를 넣으면 약간 밀릴 수 있음)
        if (ratio >= 0.9) cols = 4; 
        else cols = 3;

        const rows = 4; // 4방향 (하, 좌, 우, 상)
        const frameW = img.width / cols;
        const frameH = img.height / rows;

        // 방향 (Unit.js의 direction 속성 사용)
        let dir = unit.direction !== undefined ? unit.direction : 0;
        
        // 걷기 애니메이션 (움직일 때만)
        let colIndex = 1; // 기본 차렷
        if (unit.isMoving) {
            colIndex = this.spriteFrame; // 0, 1, 2 중 하나
        }

        // 4열 이미지일 경우, 0,1,2번 인덱스는 유효하므로 그대로 씁니다.
        // 만약 3열 이미지인데 colIndex가 3이 되면 안되므로 방어 코드
        if (colIndex >= cols) colIndex = 1;

        // 화면에 그릴 크기 (타일보다 약간 크게)
        const drawW = this.tileSize * 1.4; 
        const scale = drawW / frameW;
        const drawH = frameH * scale;

        // 발 위치 보정
        const drawX = x + (this.tileSize - drawW) / 2;
        const drawY = y + (this.tileSize - drawH) - 5; // 위로 살짝 올림

        try {
            ctx.drawImage(
                img,
                colIndex * frameW, dir * frameH, frameW, frameH, 
                drawX, drawY, drawW, drawH
            );
        } catch (e) {
            // 그리기 실패 시 무시 (깜빡임 방지)
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