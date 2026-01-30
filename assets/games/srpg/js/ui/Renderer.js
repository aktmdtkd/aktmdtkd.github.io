export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 40; // 기본 크기
        this.camera = { x: 0, y: 0 };
    }

    // [신규] 줌 기능
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
        // 유닛의 논리적 위치(x,y)를 현재 타일 크기로 변환
        const px = unit.x * this.tileSize - this.camera.x;
        const py = unit.y * this.tileSize - this.camera.y;
        
        this.ctx.strokeStyle = '#FFFF00';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
        this.ctx.lineWidth = 1;
    }

    drawUnits(units) {
        units.forEach(unit => {
            // 애니메이션 중일 때만 pixelX를 쓰지만, 줌이 바뀌면 pixelX도 갱신 필요
            // 여기서는 간단히: 이동 중이 아니면 (x * tileSize)를 쓰고, 이동 중이면 보정 필요
            // 가장 깔끔한 방법: Unit.js에서 줌 바뀔 때 pixelX 재계산 하도록 하거나,
            // 렌더링 시에 비율 계산. 여기서는 후자(Unit.x * tileSize + offset) 방식을 씁니다.

            // 이동 애니메이션 중 오프셋(0~1 사이 비율) 계산을 위해 임시 로직 사용 가능하지만
            // 기존 로직(pixelX)은 고정 40px 기준이라 줌 바뀌면 어긋납니다.
            // 해결: Unit의 pixelX는 항상 '현재 타일 사이즈 기준'이어야 함. 
            // GameManager에서 줌 변경 시 Unit들의 pixelX도 업데이트 해줄 예정.

            const px = unit.pixelX + unit.offsetX - this.camera.x;
            const py = unit.pixelY + unit.offsetY - this.camera.y;
            
            if (px < -this.tileSize || py < -this.tileSize || px > this.canvas.width || py > this.canvas.height) return;

            const size = this.tileSize;
            const padding = size * 0.1; // 비율로 변경

            if (unit.isActionDone) {
                this.ctx.fillStyle = '#888888';
            } else {
                this.ctx.fillStyle = unit.team === 'blue' ? '#0000AA' : '#AA0000';
            }
            
            this.ctx.fillRect(px + padding, py + padding, size - padding*2, size - padding*2);

            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = `${Math.floor(size/4)}px Arial`; // 폰트 크기도 가변
            this.ctx.textAlign = 'center';
            this.ctx.fillText(unit.name, px + size/2, py + size/2 + size/10);

            const hpRatio = unit.currentHp / unit.maxHp;
            const barHeight = Math.max(2, size * 0.1);

            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(px + padding, py + size - barHeight*2, (size - padding*2), barHeight);
            
            if(hpRatio > 0.5) this.ctx.fillStyle = '#00FF00';
            else if(hpRatio > 0.25) this.ctx.fillStyle = '#FFFF00';
            else this.ctx.fillStyle = '#FF0000';
            
            this.ctx.fillRect(px + padding, py + size - barHeight*2, (size - padding*2) * hpRatio, barHeight);
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