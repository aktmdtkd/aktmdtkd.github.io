export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 40;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawMap(gridMap) {
        if (!gridMap.data) return;
        for (let y = 0; y < gridMap.rows; y++) {
            for (let x = 0; x < gridMap.cols; x++) {
                const type = gridMap.data[y][x];
                const px = x * this.tileSize;
                const py = y * this.tileSize;

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
            const px = tile.x * this.tileSize;
            const py = tile.y * this.tileSize;
            this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
            this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
        });
    }

    drawCursor(unit) {
        if(!unit) return;
        // [수정] 커서도 유닛을 따라다니게 pixel 좌표 사용
        const px = unit.pixelX;
        const py = unit.pixelY;
        
        this.ctx.strokeStyle = '#FFFF00';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
        this.ctx.lineWidth = 1;
    }

    // [수정] 픽셀 좌표 기반 렌더링
    drawUnits(units) {
        units.forEach(unit => {
            const px = unit.pixelX; // 여기가 핵심!
            const py = unit.pixelY; // 여기가 핵심!
            const size = this.tileSize;
            const padding = 5;

            if (unit.isActionDone) {
                this.ctx.fillStyle = '#888888';
            } else {
                this.ctx.fillStyle = unit.team === 'blue' ? '#0000AA' : '#AA0000';
            }
            
            this.ctx.fillRect(px + padding, py + padding, size - padding*2, size - padding*2);

            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(unit.name, px + size/2, py + size/2 + 4);

            const hpRatio = unit.currentHp / unit.maxHp;
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(px + padding, py + size - 8, (size - padding*2), 4);
            
            if(hpRatio > 0.5) this.ctx.fillStyle = '#00FF00';
            else if(hpRatio > 0.25) this.ctx.fillStyle = '#FFFF00';
            else this.ctx.fillStyle = '#FF0000';
            
            this.ctx.fillRect(px + padding, py + size - 8, (size - padding*2) * hpRatio, 4);
        });
    }
}