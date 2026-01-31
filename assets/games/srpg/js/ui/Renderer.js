import { TERRAIN_DATA } from '../data/constants.js';

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 40;
        
        this.camera = { x: 0, y: 0 };
        this.images = {}; 
        
        // 애니메이션 프레임 관리
        this.frameCount = 0;
        this.spriteCycle = 0; 
        this.spriteFrame = 1; // 1:차렷 자세

        this.loadImages();
    }

    loadImages() {
        // [중요] 여기에 사용할 이미지 파일 목록을 정의합니다.
        // key: 코드에서 부를 이름 / file: 실제 파일명
        const imageList = [
            { key: 'enemy', file: 'bg_rm_jbb.png' }, // 보내주신 병사 이미지
            { key: 'caocao', file: 'bg_rm_jbb.png' }, // 조조 이미지가 없으면 일단 병사로 대체 (테스트용)
            // { key: 'caocao', file: 'caocao.png' } // 나중에 조조 이미지를 넣으면 주석 해제하세요
        ];
        
        imageList.forEach(data => {
            const img = new Image();
            // 요청하신 경로: ./image/파일명
            img.src = `./image/${data.file}`;
            
            img.onload = () => {
                this.images[data.key] = img;
                console.log(`✅ 이미지 로드 성공: ${data.file}`);
            };
            img.onerror = () => {
                console.warn(`⚠️ 이미지 로드 실패: ${data.file} (경로를 확인하세요)`);
            };
        });
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.imageSmoothingEnabled = false; // 도트(픽셀)를 선명하게 유지
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
        
        // 걷기 애니메이션 사이클 (약 15프레임마다 발을 바꿈)
        this.frameCount++;
        if (this.frameCount > 15) { 
            this.frameCount = 0;
            // 4열 이미지용 걷기 패턴: [차렷 -> 왼발 -> 차렷 -> 오른발]
            // 이미지 인덱스: 1 -> 0 -> 1 -> 2
            const cycle = [1, 0, 1, 2];
            this.spriteCycle = (this.spriteCycle + 1) % 4;
            this.spriteFrame = cycle[this.spriteCycle];
        }
    }

    drawMap(gridMap) {
        if (!gridMap) return;
        const rows = gridMap.rows || 20;
        const cols = gridMap.cols || 20;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // 화면 밖이면 그리지 않음 (최적화)
                const px = Math.floor(x * this.tileSize - this.camera.x);
                const py = Math.floor(y * this.tileSize - this.camera.y);

                if (px < -this.tileSize || py < -this.tileSize || 
                    px > this.canvas.width || py > this.canvas.height) {
                    continue;
                }

                if (gridMap.isValid(x, y)) {
                    const terrain = gridMap.getTerrain(x, y);

                    // 지형 색상
                    if (terrain === 1) this.ctx.fillStyle = '#8B4513'; // 산
                    else if (terrain === 2) this.ctx.fillStyle = '#4169E1'; // 강
                    else this.ctx.fillStyle = '#228B22'; // 평지
                    
                    this.ctx.fillRect(px, px + this.tileSize, this.tileSize, this.tileSize);
                    
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
        // Y좌표 정렬 (원근감)
        const sortedUnits = [...units].sort((a, b) => a.pixelY - b.pixelY);

        sortedUnits.forEach(unit => {
            if(unit.isDead()) return;

            const px = Math.floor(unit.pixelX + unit.offsetX - this.camera.x);
            const py = Math.floor(unit.pixelY + unit.offsetY - this.camera.y);

            // 이미지 매핑
            let img = null;
            if (unit.name === '조조') img = this.images['caocao'];
            else if (unit.team === 'red') img = this.images['enemy'];
            else img = this.images['caocao']; // 기본값

            // 이미지가 로드되었으면 스프라이트 그리기
            if (img && img.complete && img.naturalWidth > 0) {
                this.drawSprite(this.ctx, img, unit, px, py);
            } else {
                // 로딩 안 됐으면 네모 박스 (Fallback)
                this.drawFallbackUnit(this.ctx, unit, px, py);
            }

            // 체력바
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
        // 이미지는 4열(가로) x 4행(세로) 구조입니다.
        const cols = 4;
        const rows = 4; 

        const frameW = img.width / cols;
        const frameH = img.height / rows;

        // 방향 (Unit.js의 direction 속성: 0=하, 1=좌, 2=우, 3=상)
        // 만약 direction이 없으면 0(정면)
        let dir = unit.direction !== undefined ? unit.direction : 0;
        
        // 애니메이션 프레임 (움직일 때만)
        let colIndex = 1; // 1번이 '차렷' 자세라고 가정
        if (unit.isMoving) {
            colIndex = this.spriteFrame; // 0, 1, 2 중 하나로 계속 변함
        }

        // 화면에 그릴 크기 (타일보다 30% 정도 크게 그려야 머리가 위로 올라와서 자연스러움)
        const drawW = this.tileSize * 1.3; 
        const scale = drawW / frameW;
        const drawH = frameH * scale;

        // 발 위치 보정 (타일의 중앙 하단에 발이 오도록)
        const drawX = x + (this.tileSize - drawW) / 2;
        const drawY = y + (this.tileSize - drawH) - 4; // -4는 약간의 여백 보정

        try {
            ctx.drawImage(
                img,
                colIndex * frameW, dir * frameH, frameW, frameH, // 원본에서 자를 위치
                drawX, drawY, drawW, drawH // 화면에 그릴 위치
            );
        } catch (e) {
            // 그리기 에러 시 무시
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