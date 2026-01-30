import { GridMap } from '../battle/GridMap.js';
import { Unit } from '../battle/Unit.js';
import { PathFinder } from '../battle/PathFinder.js';
import { BattleSystem, SKILLS } from '../battle/BattleSystem.js';
import { AI } from '../battle/AI.js';
import { Renderer } from '../ui/Renderer.js';
import { UIManager } from '../ui/UIManager.js';
import { EffectManager } from '../ui/EffectManager.js';

export class GameManager {
    constructor() {
        this.gridMap = new GridMap();
        this.renderer = new Renderer('gameCanvas');
        this.uiManager = new UIManager();
        this.effectManager = new EffectManager();
        this.pathFinder = new PathFinder();
        this.battleSystem = new BattleSystem();
        this.ai = new AI();
        
        this.units = [];
        this.classes = {};

        this.gameState = 'IDLE'; 
        this.turn = 'PLAYER'; 
        this.isAnimating = false;
        this.gameOver = null;
        
        this.selectedUnit = null;
        this.selectedAction = null; 
        this.movableTiles = [];
        this.attackableTiles = [];
        this.lastHoverX = -1;
        this.lastHoverY = -1;

        this.isMouseDown = false;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.cameraStartX = 0;
        this.cameraStartY = 0;

        this.turnIndicator = document.getElementById('turn-indicator');
    }

    async init() {
        this.setupInput();
        // [신규] 줌 컨트롤 연결
        this.uiManager.setupZoomControls(
            () => this.handleZoom(10),  // Zoom In
            () => this.handleZoom(-10)  // Zoom Out
        );
        await this.loadData();
        this.loop();
    }

    // [신규] 줌 처리 로직
    handleZoom(delta) {
        const oldSize = this.renderer.tileSize;
        let newSize = oldSize + delta;

        // 제한 (20px ~ 80px)
        if (newSize < 20) newSize = 20;
        if (newSize > 80) newSize = 80;

        if (oldSize === newSize) return;

        // 줌 중심점 유지 로직
        // 현재 화면의 중앙이 맵의 어디를 보고 있었는지 계산
        const viewW = this.renderer.canvas.width;
        const viewH = this.renderer.canvas.height;
        
        const centerX = this.renderer.camera.x + viewW / 2;
        const centerY = this.renderer.camera.y + viewH / 2;

        const ratio = newSize / oldSize;

        const newCenterX = centerX * ratio;
        const newCenterY = centerY * ratio;

        this.renderer.setTileSize(newSize);
        
        // 줌 변경에 따른 유닛 픽셀 좌표 업데이트
        this.units.forEach(u => {
            u.tileSize = newSize; // 유닛 내부 타일사이즈 갱신
            // 이동 중이 아닐 때만 강제 동기화 (이동 중이면 애니메이션 튈 수 있음 - 간소화 처리)
            if (!u.isMoving) {
                u.pixelX = u.x * newSize;
                u.pixelY = u.y * newSize;
                u.targetPixelX = u.x * newSize;
                u.targetPixelY = u.y * newSize;
            } else {
                // 이동 중이라면 비율대로 위치 보정
                u.pixelX *= ratio;
                u.pixelY *= ratio;
                u.targetPixelX *= ratio;
                u.targetPixelY *= ratio;
            }
        });

        // 카메라 위치 재설정
        this.renderer.updateCamera(
            newCenterX - viewW / 2, 
            newCenterY - viewH / 2, 
            this.gridMap.cols, 
            this.gridMap.rows
        );
    }

    getMousePos(evt) {
        const canvas = this.renderer.canvas;
        const rect = canvas.getBoundingClientRect();
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY
        };
    }

    setupInput() {
        const canvas = this.renderer.canvas;

        canvas.addEventListener('mousedown', (e) => {
            e.preventDefault(); 
            if (this.gameOver) { location.reload(); return; }
            if (this.gameState === 'ACTION_SELECT') return;

            canvas.style.cursor = 'grabbing';
            this.isMouseDown = true;
            this.isDragging = false;
            
            const pos = this.getMousePos(e);
            this.dragStartX = pos.x;
            this.dragStartY = pos.y;
            this.cameraStartX = this.renderer.camera.x;
            this.cameraStartY = this.renderer.camera.y;
        });

        canvas.addEventListener('mousemove', (e) => {
            e.preventDefault();
            if (this.gameOver) return;

            const pos = this.getMousePos(e);

            if (this.isMouseDown) {
                const dx = pos.x - this.dragStartX;
                const dy = pos.y - this.dragStartY;

                if (!this.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                    this.isDragging = true;
                }

                if (this.isDragging) {
                    const newCamX = this.cameraStartX - dx;
                    const newCamY = this.cameraStartY - dy;
                    this.renderer.updateCamera(newCamX, newCamY, this.gridMap.cols, this.gridMap.rows);
                    return; 
                }
            }

            const worldX = pos.x + this.renderer.camera.x;
            const worldY = pos.y + this.renderer.camera.y;
            
            const tx = Math.floor(worldX / this.renderer.tileSize);
            const ty = Math.floor(worldY / this.renderer.tileSize);

            if (tx === this.lastHoverX && ty === this.lastHoverY) return;
            this.lastHoverX = tx;
            this.lastHoverY = ty;

            const hoverUnit = this.getUnitAt(tx, ty);
            this.uiManager.updateUnit(hoverUnit);
            const terrainType = this.gridMap.getTerrain(tx, ty);
            if (terrainType !== null) this.uiManager.updateTerrain(terrainType);
        });

        canvas.addEventListener('mouseup', async (e) => {
            e.preventDefault();
            this.isMouseDown = false;
            canvas.style.cursor = 'crosshair';

            if (this.gameOver || this.gameState === 'ACTION_SELECT') return;

            if (this.isDragging) {
                this.isDragging = false;
                return;
            }

            if (this.turn === 'ENEMY' || this.isAnimating) return;

            const pos = this.getMousePos(e);
            const worldX = pos.x + this.renderer.camera.x;
            const worldY = pos.y + this.renderer.camera.y;

            const tx = Math.floor(worldX / this.renderer.tileSize);
            const ty = Math.floor(worldY / this.renderer.tileSize);
            
            await this.handleClick(tx, ty);
        });

        canvas.addEventListener('mouseleave', () => {
            this.isMouseDown = false;
            this.isDragging = false;
            canvas.style.cursor = 'crosshair';
        });

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.turn === 'PLAYER' && !this.isAnimating && !this.gameOver) {
                if (this.gameState === 'TARGETING') {
                    this.openActionMenu();
                } else if (this.gameState === 'SELECTED') {
                    this.resetSelection();
                }
            }
        });
    }

    async handleClick(x, y) {
        if (this.gameState === 'IDLE') {
            const clickedUnit = this.getUnitAt(x, y);
            if (clickedUnit && clickedUnit.team === 'blue' && !clickedUnit.isActionDone) {
                this.selectedUnit = clickedUnit;
                this.movableTiles = this.pathFinder.getMovableTiles(clickedUnit, this.gridMap, this.units);
                this.gameState = 'SELECTED';
            }
            return;
        }

        if (this.gameState === 'SELECTED') {
            if (this.movableTiles.some(t => t.x === x && t.y === y)) {
                if (x === this.selectedUnit.x && y === this.selectedUnit.y) {
                    this.movableTiles = [];
                    this.onMoveFinished(); 
                    return;
                }
                const path = this.pathFinder.findPath(this.selectedUnit, x, y, this.gridMap, this.units);
                if (path && path.length > 0) {
                    this.selectedUnit.moveAlong(path);
                    this.movableTiles = []; 
                    this.isAnimating = true;
                    this.gameState = 'MOVING';
                } else {
                    this.resetSelection();
                }
            } else {
                this.resetSelection();
            }
            return;
        }

        if (this.gameState === 'TARGETING') {
            if (this.attackableTiles.some(t => t.x === x && t.y === y)) {
                this.isAnimating = true;

                if (this.selectedAction.type === 'attack') {
                    const targetUnit = this.getUnitAt(x, y);
                    if (targetUnit && targetUnit.team === 'red') {
                        await this.battleSystem.executeAttack(this.selectedUnit, targetUnit, this.effectManager);
                        this.finishTurnSequence(targetUnit);
                    } else {
                        this.isAnimating = false; 
                    }
                } 
                else if (this.selectedAction.type === 'skill') {
                    await this.battleSystem.executeSkill(
                        this.selectedUnit, x, y, 
                        this.selectedAction.id, 
                        this.units, 
                        this.effectManager
                    );
                    this.finishTurnSequence();
                }
            }
        }
    }

    onMoveFinished() {
        this.isAnimating = false;
        this.openActionMenu();
    }

    openActionMenu() {
        this.gameState = 'ACTION_SELECT';
        this.attackableTiles = []; 

        this.uiManager.showActionMenu(
            this.selectedUnit,
            () => this.selectAttack(),  
            () => this.openSkillMenu(), 
            () => this.wait()           
        );
    }

    openSkillMenu() {
        this.uiManager.showSkillMenu(
            this.selectedUnit,
            (skillId) => this.selectSkill(skillId) 
        );
    }

    selectAttack() {
        this.selectedAction = { type: 'attack' };
        this.calculateRange(this.selectedUnit.attackRange);
        this.gameState = 'TARGETING';
    }

    selectSkill(skillId) {
        this.selectedAction = { type: 'skill', id: skillId };
        const skill = SKILLS[skillId];
        this.calculateRange(skill.range);
        this.gameState = 'TARGETING';
    }

    wait() {
        this.endAction();
    }

    calculateRange(range) {
        this.attackableTiles = [];
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                if (Math.abs(dx) + Math.abs(dy) <= range) {
                    const nx = this.selectedUnit.x + dx;
                    const ny = this.selectedUnit.y + dy;
                    if (this.gridMap.isValid(nx, ny)) {
                        this.attackableTiles.push({x: nx, y: ny});
                    }
                }
            }
        }
    }

    finishTurnSequence(targetUnit) {
        this.isAnimating = false;
        this.checkDeadUnits();
        this.endAction();
        if(targetUnit) this.uiManager.updateUnit(targetUnit);
    }

    endAction() {
        if (this.selectedUnit) {
            this.selectedUnit.endAction();
        }
        this.resetSelection();
        this.uiManager.hideMenus();

        if (this.checkWinCondition()) return;

        const activeBlues = this.units.filter(u => u.team === 'blue' && !u.isActionDone && !u.isDead());
        if (activeBlues.length === 0) {
            this.startEnemyTurn();
        }
    }

    startEnemyTurn() {
        this.turn = 'ENEMY';
        this.turnIndicator.innerText = `TURN: ${this.turn}`;
        this.turnIndicator.style.color = '#ff6666';
        this.ai.runTurn(this);
    }

    startPlayerTurn() {
        this.turn = 'PLAYER';
        this.turnIndicator.innerText = `TURN: ${this.turn}`;
        this.turnIndicator.style.color = '#ffffff';
        this.units.forEach(u => u.resetTurn());
        
        const mainChar = this.units.find(u => u.name === '조조' && !u.isDead());
        if(mainChar) {
            const cx = mainChar.pixelX - (this.renderer.canvas.width / 2) + 20;
            const cy = mainChar.pixelY - (this.renderer.canvas.height / 2) + 20;
            this.renderer.updateCamera(cx, cy, this.gridMap.cols, this.gridMap.rows);
        }
    }

    resetSelection() {
        this.selectedUnit = null;
        this.selectedAction = null;
        this.movableTiles = [];
        this.attackableTiles = [];
        this.gameState = 'IDLE';
        this.isAnimating = false;
        this.uiManager.hideMenus();
    }

    checkDeadUnits() {
        this.units = this.units.filter(u => !u.isDead());
        this.checkWinCondition();
    }

    checkWinCondition() {
        if (this.gameOver) return true;
        const blueAlive = this.units.some(u => u.team === 'blue' && !u.isDead());
        const redAlive = this.units.some(u => u.team === 'red' && !u.isDead());

        if (!redAlive) { this.gameOver = 'WIN'; return true; }
        else if (!blueAlive) { this.gameOver = 'LOSE'; return true; }
        return false;
    }

    getUnitAt(x, y) {
        return this.units.find(u => u.x === x && u.y === y && !u.isDead());
    }

    async loadData() {
        try {
            const classRes = await fetch('./js/data/classes.json');
            this.classes = await classRes.json();
            const mapRes = await fetch('./js/data/maps.json');
            const mapJson = await mapRes.json();
            const stage1 = mapJson.stage1;
            this.gridMap.load(stage1);
            stage1.units.forEach(uConfig => {
                const classInfo = this.classes[uConfig.class];
                const newUnit = new Unit(uConfig, classInfo);
                // [신규] 유닛에게 타일 사이즈 정보 전달 (초기화)
                newUnit.tileSize = this.renderer.tileSize;
                this.units.push(newUnit);
            });
            
            const mainChar = this.units.find(u => u.name === '조조');
            if (mainChar) {
                const cx = mainChar.pixelX - (this.renderer.canvas.width / 2) + 20;
                const cy = mainChar.pixelY - (this.renderer.canvas.height / 2) + 20;
                this.renderer.updateCamera(cx, cy, this.gridMap.cols, this.gridMap.rows);
            }
        } catch (e) {
        }
    }

    loop() {
        this.effectManager.update();
        this.units.forEach(unit => {
            const arrived = unit.update();
            if (arrived && this.turn === 'PLAYER' && unit === this.selectedUnit) {
                this.onMoveFinished();
            }
        });

        this.renderer.clear();
        this.renderer.drawMap(this.gridMap);
        
        if (!this.gameOver) {
            if (this.movableTiles.length > 0) this.renderer.drawHighlights(this.movableTiles, 'move');
            
            if (this.gameState === 'TARGETING' && this.attackableTiles.length > 0) {
                this.renderer.drawHighlights(this.attackableTiles, 'attack');
            }
            this.renderer.drawCursor(this.selectedUnit);
        }
        
        this.renderer.drawUnits(this.units);
        this.renderer.drawEffects(this.effectManager);

        if (this.gameOver) {
            this.renderer.drawGameOver(this.gameOver);
        }

        requestAnimationFrame(() => this.loop());
    }
}