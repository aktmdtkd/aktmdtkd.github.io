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
        this.spriteFrame = 1; // 실제 보여줄 프레임 인덱스

        this.loadImages();
    }

    loadImages() {
        // 사용할 캐릭터 이미지 파일명 목록
        // assets/images/units/ 폴더에 이 이름의 파일들이 있어야 함
        const charNames = ['caocao', 'enemy', 'guojia']; 
        
        charNames.forEach(name => {
            const img = new Image();
            // jpg여도 상관없음 (코드가 투명화 처리)
            // 확장자는 일단 png로 가정하되, 실제 파일이 jpg라면 아래 .png를 .jpg로 수정하세요.
            img.src = `./assets/images/units/${name}.png`; 
            
            img.onload = () => {
                // [핵심] 로딩 완료 시 배경 투명화 처리 실행
                this.images[name] = this.removeWhiteBackground(img);
            };
        });
    }

    // [신규] 흰색 배경 제거 함수 (누끼 따기)
    removeWhiteBackground(img) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imgData.data;
        
        // 픽셀 순회 (R, G, B, A)
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            
            // 흰색에 가까우면 (RGB가 모두 230 이상이면)
            if (r > 230 && g > 230 && b > 230) {
                data[i+3] = 0; // Alpha(투명도)를 0으로 설정
            }
        }
        
        ctx.putImageData(imgData, 0, 0);
        
        // 처리된 이미지를 새 Image 객체로 반환
        const newImg = new Image();
        newImg.src = tempCanvas.toDataURL();
        return newImg;
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
        
        // 걷기 애니메이션 사이클
        this.frameCount++;
        if (this.frameCount > 12) { // 속도 조절
            this.frameCount = 0;
            const cycle = [0, 1, 2, 1]; // 왼발 - 차렷 - 오른발 - 차렷
            this.spriteCycle = (this.spriteCycle + 1) % 4;
            this.spriteFrame = cycle[this.spriteCycle];
        }
    }

    drawMap(gridMap) {
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

                    if (terrain === 1) this.ctx.fillStyle = '#654321'; 
                    else if (terrain === 2) this.ctx.fillStyle = '#3366cc';
                    else this.ctx.fillStyle = '#339933';
                    
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
        const sortedUnits = [...units].sort((a, b) => a.pixelY - b.pixelY);

        sortedUnits.forEach(unit => {
            if(unit.isDead()) return;

            const px = Math.floor(unit.pixelX + unit.offsetX - this.camera.x);
            const py = Math.floor(unit.pixelY + unit.offsetY - this.camera.y);

            // 이미지 찾기 (이름 매칭)
            let img = null;
            // 1. 유닛 이름이 '조조'면 'caocao' 이미지 사용 (임시 매핑)
            if (unit.name === '조조') img = this.images['caocao'];
            // 2. 적군이면 'enemy'
            else if (unit.team === 'red') img = this.images['enemy'];
            // 3. 없으면 기본
            else img = this.images['caocao']; 

            // 이미지가 로드되었으면 그리기
            if (img && img.complete && img.naturalWidth !== 0) {
                this.drawSprite(this.ctx, img, unit, px, py);
            } else {
                // 대체 박스
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
        // [중요] 이미지가 4열인지 3열인지 자동 감지
        // 보통 가로:세로 비율로 추측하거나, 일단 4열로 가정
        // 아까 보여준 이미지는 4열이었음.
        const cols = 4; // 가져오신 이미지가 4칸짜리라서 4로 설정
        const rows = 4; 

        const frameW = img.width / cols;
        const frameH = img.height / rows;

        // 방향 (0:하, 1:좌, 2:우, 3:상) -> Unit.js에서 direction 가져옴
        // 만약 direction이 없으면 0(정면)
        let dir = unit.direction !== undefined ? unit.direction : 0;
        
        // 애니메이션 프레임 결정
        // 정지 상태면 0번(차렷), 이동 중이면 spriteFrame(0~2)
        // 4열 이미지 구조: [걷기1] [차렷] [걷기2] [차렷] 이라고 가정하면
        // 차렷=1, 걷기=0,2
        
        let colIndex = 1; // 기본 차렷 (2번째 칸)

        if (unit.isMoving) {
            // spriteFrame: 0, 1, 2
            // 이미지 매핑: 0->0열, 1->1열, 2->2열
            colIndex = this.spriteFrame;
            
            // 만약 4열 이미지가 [차렷][걷기][차렷][걷기] 식이 아니라
            // [걷기][차렷][걷기][차렷] 이라면 인덱스 조정 필요.
            // 보통 RPG Maker XP는 [차렷][걷기][걷기][걷기] 가 아니라 [걷기][차렷][걷기][차렷] 등 다양함.
            // 일단 아까 이미지(caocao2) 기준:
            // 1열:차렷? 아니면 걷기? 육안상 2열이 차렷 같았음.
            // 안전하게: 0(걷기), 1(차렷), 2(걷기) 로 매핑
        }

        const drawW = this.tileSize * 1.2; 
        const scale = drawW / frameW;
        const drawH = frameH * scale;

        const drawX = x + (this.tileSize - drawW) / 2;
        const drawY = y + (this.tileSize - drawH) - 4; // 위치 미세 조정

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