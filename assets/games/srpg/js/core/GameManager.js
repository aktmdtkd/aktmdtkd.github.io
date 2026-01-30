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

        // 드래그 및 입력 상태 변수
        this.isMouseDown = false;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.cameraStartX = 0;
        this.cameraStartY = 0;
    }

    async init() {
        this.setupInput();
        await this.loadData();
        this.loop();
    }

    setupInput() {
        const canvas = this.renderer.canvas;

        // 1. 마우스 누름 (드래그 시작 준비)
        canvas.addEventListener('mousedown', (e) => {
            // 브라우저 기본 드래그 방지
            e.preventDefault(); 

            if (this.gameOver) { location.reload(); return; }
            if (this.gameState === 'ACTION_SELECT') return;

            this.isMouseDown = true;
            this.isDragging = false;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.cameraStartX = this.renderer.camera.x;
            this.cameraStartY = this.renderer.camera.y;
        });

        // 2. 마우스 이동 (드래그 중인지 판단 후 카메라 이동)
        canvas.addEventListener('mousemove', (e) => {
            e.preventDefault();

            // 게임 오버 상태면 무시
            if (this.gameOver) return;

            // 마우스를 누른 상태에서만 드래그 로직 동작
            if (this.isMouseDown) {
                const dx = e.clientX - this.dragStartX;
                const dy = e.clientY - this.dragStartY;

                // 5픽셀 이상 움직였을 때만 드래그로 간주 (클릭 미스 방지)
                if (!this.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                    this.isDragging = true;
                }

                if (this.isDragging) {
                    // 카메라 이동: 시작 위치에서 마우스 이동량만큼 뺌 (Grab & Drag 느낌)
                    const newCamX = this.cameraStartX - dx;
                    const newCamY = this.cameraStartY - dy;
                    
                    this.renderer.updateCamera(newCamX, newCamY, this.gridMap.cols, this.gridMap.rows);
                    return; // 드래그 중에는 호버링 효과 갱신 안 함
                }
            }

            // --- 호버링 로직 (드래그 중이 아닐 때만) ---
            const rect = canvas.getBoundingClientRect();
            // 월드 좌표 = 화면 좌표 + 카메라 좌표
            const worldX = (e.clientX - rect.left) + this.renderer.camera.x;
            const worldY = (e.clientY - rect.top) + this.renderer.camera.y;
            
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

        // 3. 마우스 뗌 (클릭 처리 or 드래그 종료)
        canvas.addEventListener('mouseup', async (e) => {
            e.preventDefault();
            this.isMouseDown = false;

            if (this.gameOver || this.gameState === 'ACTION_SELECT') return;

            // 드래그였다면 클릭 로직 실행하지 않고 종료
            if (this.isDragging) {
                this.isDragging = false;
                return;
            }

            if (this.turn === 'ENEMY' || this.isAnimating) return;

            const rect = canvas.getBoundingClientRect();
            const worldX = (e.clientX - rect.left) + this.renderer.camera.x;
            const worldY = (e.clientY - rect.top) + this.renderer.camera.y;

            const tx = Math.floor(worldX / this.renderer.tileSize);
            const ty = Math.floor(worldY / this.renderer.tileSize);
            
            await this.handleClick(tx, ty);
        });

        // 4. 마우스가 캔버스 밖으로 나감 (드래그 취소 안전장치)
        canvas.addEventListener('mouseleave', () => {
            this.isMouseDown = false;
            this.isDragging = false;
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
        // [1] 유닛 선택
        if (this.gameState === 'IDLE') {
            const clickedUnit = this.getUnitAt(x, y);
            if (clickedUnit && clickedUnit.team === 'blue' && !clickedUnit.isActionDone) {
                this.selectedUnit = clickedUnit;
                this.movableTiles = this.pathFinder.getMovableTiles(clickedUnit, this.gridMap, this.units);
                this.gameState = 'SELECTED';
            }
            return;
        }

        // [2] 이동
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

        // [3] 타겟팅 (공격/스킬)
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
        this.ai.runTurn(this);
    }

    startPlayerTurn() {
        this.turn = 'PLAYER';
        this.units.forEach(u => u.resetTurn());
        
        // 턴 시작 시 조조에게 카메라 포커싱
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
            
            // GridMap 로드 (cols, rows 설정됨)
            this.gridMap.load(stage1);
            
            stage1.units.forEach(uConfig => {
                const classInfo = this.classes[uConfig.class];
                const newUnit = new Unit(uConfig, classInfo);
                this.units.push(newUnit);
            });
            
            // 데이터 로드 완료 후 카메라 초기 위치 설정
            const mainChar = this.units.find(u => u.name === '조조');
            if (mainChar) {
                const cx = mainChar.pixelX - (this.renderer.canvas.width / 2) + 20;
                const cy = mainChar.pixelY - (this.renderer.canvas.height / 2) + 20;
                this.renderer.updateCamera(cx, cy, this.gridMap.cols, this.gridMap.rows);
            }
        } catch (e) {
            // Error handling
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

        if (!this.gameOver) {
            this.renderer.ctx.fillStyle = 'white';
            this.renderer.ctx.font = '20px Arial';
            this.renderer.ctx.textAlign = 'left';
            this.renderer.ctx.fillText(`TURN: ${this.turn}`, 10, 30);
        } else {
            this.renderer.drawGameOver(this.gameOver);
        }

        requestAnimationFrame(() => this.loop());
    }
}