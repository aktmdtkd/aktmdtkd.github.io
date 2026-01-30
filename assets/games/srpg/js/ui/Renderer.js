export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 40;
        this.camera = { x: 0, y: 0 };
    }

    updateCamera(x, y, mapCols, mapRows) {
        const viewW = this.canvas.width;
        const viewH = this.canvas.height;
        const mapW = mapCols * this.tileSize;
        const mapH = mapRows * this.tileSize;

        this.camera.x = x;
        this.camera.y = y;

        // 화면 밖으로 나가지 않게 제한 (Clamping)
        if (this.camera.x < 0) this.camera.x = 0;
        if (this.camera.y < 0) this.camera.y = 0;
        
        // 맵이 화면보다 클 때만 제한 적용
        if (mapW > viewW) {
            if (this.camera.x > mapW - viewW) this.camera.x = mapW - viewW;
        } else {
            this.camera.x = 0; // 맵이 작으면 0 고정
        }

        if (mapH > viewH) {
            if (this.camera.y > mapH - viewH) this.camera.y = mapH - viewH;
        } else {
            this.camera.y = 0; // 맵이 작으면 0 고정
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

                // 화면 밖 타일은 그리지 않음 (성능 최적화)
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
        const px = unit.pixelX - this.camera.x;
        const py = unit.pixelY - this.camera.y;
        
        this.ctx.strokeStyle = '#FFFF00';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
        this.ctx.lineWidth = 1;
    }

    drawUnits(units) {
        units.forEach(unit => {
            const px = unit.pixelX + unit.offsetX - this.camera.x;
            const py = unit.pixelY + unit.offsetY - this.camera.y;
            
            if (px < -40 || py < -40 || px > this.canvas.width || py > this.canvas.height) return;

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

    drawEffects(effectManager) {
        effectManager.draw(this.ctx, this.camera);
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