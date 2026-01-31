export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 40; 
        this.camera = { x: 0, y: 0 };

        // [신규] 스프라이트 캐시 (이미지를 중복 로드하지 않도록 저장소 생성)
        // 예: { "red_nbb.png": ImageObject, "caocao_ngb.png": ImageObject ... }
        this.spriteCache = {};
    }

    // [신규] 이미지 가져오기 또는 로드하기
    getOrLoadImage(filename) {
        // 이미 로드된 적이 있으면 반환
        if (this.spriteCache[filename]) {
            return this.spriteCache[filename];
        }

        // 처음 보는 파일이면 로드 시작
        const img = new Image();
        // 경로: games/srpg/index.html 기준 -> games/game_assets/image/파일명
        img.src = `../game_assets/image/${filename}`;
        
        this.spriteCache[filename] = img; // 캐시에 저장
        return img;
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }
    setTileSize(newSize) { this.tileSize = newSize; }

    updateCamera(x, y, mapCols, mapRows) {
        const viewW = this.canvas.width;
        const viewH = this.canvas.height;
        const mapW = mapCols * this.tileSize;
        const mapH = mapRows * this.tileSize;
        this.camera.x = Math.max(0, Math.min(x, mapW - viewW > 0 ? mapW - viewW : 0));
        this.camera.y = Math.max(0, Math.min(y, mapH - viewH > 0 ? mapH - viewH : 0));
    }

    clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }

    drawMap(gridMap) {
        if (!gridMap.data) return;
        for (let y = 0; y < gridMap.rows; y++) {
            for (let x = 0; x < gridMap.cols; x++) {
                const px = x * this.tileSize - this.camera.x;
                const py = y * this.tileSize - this.camera.y;
                if (px < -this.tileSize || py < -this.tileSize || px > this.canvas.width || py > this.canvas.height) continue;
                const type = gridMap.data[y][x];
                this.ctx.fillStyle = (type === 0) ? '#4ea24e' : (type === 1) ? '#8b4513' : '#4444ff';
                this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
            }
        }
    }

    drawHighlights(tiles, colorType = 'move') {
        this.ctx.fillStyle = colorType === 'move' ? 'rgba(0, 0, 255, 0.4)' : 'rgba(255, 0, 0, 0.4)';
        this.ctx.strokeStyle = colorType === 'move' ? 'rgba(0, 0, 255, 0.8)' : 'rgba(255, 0, 0, 0.8)';
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
            if (px < -this.tileSize || py < -this.tileSize || px > this.canvas.width || py > this.canvas.height) return;

            const size = this.tileSize;

            // [수정] Unit.js에서 결정한 spriteName을 이용해 이미지 가져오기
            const img = this.getOrLoadImage(unit.spriteName);

            // 이미지가 로딩 완료되었을 때만 그림
            if (img.complete && img.naturalWidth !== 0) {
                const sw = img.width / 4;
                const sh = img.height / 4;
                const srcX = unit.frame * sw;
                const srcY = unit.direction * sh;

                this.ctx.save();
                if (unit.isActionDone) this.ctx.globalAlpha = 0.6;

                this.ctx.drawImage(img, srcX, srcY, sw, sh, px, py, size, size);
                this.ctx.restore();
            } else {
                // 로딩 중이거나 에러 시 사각형으로 대체
                const pad = size * 0.1;
                this.ctx.fillStyle = unit.team === 'blue' ? '#0000AA' : '#AA0000';
                if (unit.isActionDone) this.ctx.fillStyle = '#888888';
                this.ctx.fillRect(px + pad, py + pad, size - pad*2, size - pad*2);
            }

            // 이름 및 체력바
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = `bold ${Math.floor(size/4)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = "black";
            this.ctx.shadowBlur = 4;
            this.ctx.fillText(unit.name, px + size/2, py);
            this.ctx.shadowBlur = 0;

            const hpRatio = unit.currentHp / unit.maxHp;
            const barHeight = Math.max(3, size * 0.1);
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(px, py + size - barHeight, size, barHeight);
            this.ctx.fillStyle = hpRatio > 0.5 ? '#00FF00' : (hpRatio > 0.25 ? '#FFFF00' : '#FF0000');
            this.ctx.fillRect(px, py + size - barHeight, size * hpRatio, barHeight);
        });
    }

    drawEffects(effectManager) {
        effectManager.draw(this.ctx, this.camera, this.tileSize);
    }

    drawGameOver(result) {
        // 기존 코드와 동일 (생략 가능하나 완전성을 위해 유지)
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = result === 'WIN' ? '#00ff00' : '#ff0000';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(result === 'WIN' ? "VICTORY!" : "GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.fillText("Click to Restart", this.canvas.width / 2, this.canvas.height / 2 + 50);
        this.ctx.restore();
    }
}