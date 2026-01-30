import { GridMap } from '../battle/GridMap.js';
import { Unit } from '../battle/Unit.js';
import { PathFinder } from '../battle/PathFinder.js';
import { BattleSystem } from '../battle/BattleSystem.js';
import { AI } from '../battle/AI.js';
import { Renderer } from '../ui/Renderer.js';
import { UIManager } from '../ui/UIManager.js';
import { EffectManager } from '../ui/EffectManager.js'; // [추가]

export class GameManager {
    constructor() {
        this.gridMap = new GridMap();
        this.renderer = new Renderer('gameCanvas');
        this.uiManager = new UIManager();
        this.effectManager = new EffectManager(); // [추가]
        this.pathFinder = new PathFinder();
        this.battleSystem = new BattleSystem();
        this.ai = new AI();
        
        this.units = [];
        this.classes = {};

        this.gameState = 'IDLE'; 
        this.turn = 'PLAYER'; 
        this.isAnimating = false;
        this.gameOver = null; // [추가] null, 'WIN', 'LOSE'
        
        this.selectedUnit = null;
        this.movableTiles = [];
        this.attackableTiles = [];
        this.lastHoverX = -1;
        this.lastHoverY = -1;
    }

    async init() {
        this.setupInput();
        await this.loadData();
        this.loop();
    }

    setupInput() {
        const canvas = this.renderer.canvas;

        canvas.addEventListener('mousemove', (e) => {
            // [추가] 게임 오버 시 정보 갱신 중단
            if (this.gameOver) return;
            const rect = canvas.getBoundingClientRect();
            const tx = Math.floor((e.clientX - rect.left) / this.renderer.tileSize);
            const ty = Math.floor((e.clientY - rect.top) / this.renderer.tileSize);

            if (tx === this.lastHoverX && ty === this.lastHoverY) return;
            this.lastHoverX = tx;
            this.lastHoverY = ty;

            const hoverUnit = this.getUnitAt(tx, ty);
            this.uiManager.updateUnit(hoverUnit);
            const terrainType = this.gridMap.getTerrain(tx, ty);
            if (terrainType !== null) this.uiManager.updateTerrain(terrainType);
        });

        canvas.addEventListener('mousedown', async (e) => { // [수정] async 추가
            // [추가] 게임 오버 시 클릭하면 재시작
            if (this.gameOver) {
                location.reload();
                return;
            }
            if (this.turn === 'ENEMY' || this.isAnimating) return;

            const rect = canvas.getBoundingClientRect();
            const tx = Math.floor((e.clientX - rect.left) / this.renderer.tileSize);
            const ty = Math.floor((e.clientY - rect.top) / this.renderer.tileSize);
            await this.handleClick(tx, ty); // [수정] await 추가
        });

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.turn === 'PLAYER' && !this.isAnimating && !this.gameOver) this.resetSelection();
        });
    }

    async handleClick(x, y) { // [수정] async 추가
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
                const path = this.pathFinder.findPath(
                    this.selectedUnit, x, y, this.gridMap, this.units
                );
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
            const targetUnit = this.getUnitAt(x, y);
            if (this.attackableTiles.some(t => t.x === x && t.y === y)) {
                if (targetUnit && targetUnit.team === 'red') {
                    this.isAnimating = true; // [추가] 공격 중 입력 잠금
                    // [수정] 공격 실행 대기 및 이펙트 매니저 전달
                    await this.battleSystem.executeAttack(this.selectedUnit, targetUnit, this.effectManager);
                    this.isAnimating = false; // 잠금 해제
                    
                    this.checkDeadUnits();
                    this.endAction();
                    this.uiManager.updateUnit(targetUnit);
                    return;
                }
            }
            if (x === this.selectedUnit.x && y === this.selectedUnit.y) {
                this.endAction();
                return;
            }
        }
    }

    onMoveFinished() {
        this.isAnimating = false; 
        this.calculateAttackRange(this.selectedUnit);
        this.gameState = 'TARGETING';
    }

    calculateAttackRange(unit) {
        this.attackableTiles = [];
        const range = unit.attackRange;
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                if (Math.abs(dx) + Math.abs(dy) <= range) {
                    const nx = unit.x + dx;
                    const ny = unit.y + dy;
                    if (this.gridMap.isValid(nx, ny)) {
                        this.attackableTiles.push({x: nx, y: ny});
                    }
                }
            }
        }
    }

    endAction() {
        if (this.selectedUnit) {
            this.selectedUnit.endAction();
        }
        this.resetSelection();

        // [추가] 턴 종료 시 승패 체크
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
    }

    resetSelection() {
        this.selectedUnit = null;
        this.movableTiles = [];
        this.attackableTiles = [];
        this.gameState = 'IDLE';
        this.isAnimating = false;
    }

    checkDeadUnits() {
        this.units = this.units.filter(u => !u.isDead());
        // [추가] 유닛 사망 시 즉시 승패 체크
        this.checkWinCondition();
    }

    // [추가] 승리/패배 조건 체크
    checkWinCondition() {
        if (this.gameOver) return true; // 이미 끝났으면 패스

        const blueAlive = this.units.some(u => u.team === 'blue' && !u.isDead());
        const redAlive = this.units.some(u => u.team === 'red' && !u.isDead());

        if (!redAlive) {
            this.gameOver = 'WIN';
            console.log("Game Over: Victory!");
            return true;
        } else if (!blueAlive) {
            this.gameOver = 'LOSE';
            console.log("Game Over: Defeat!");
            return true;
        }
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
                this.units.push(newUnit);
            });
        } catch (e) {
            console.error("System: Failed to load data", e);
        }
    }

    loop() {
        // [추가] 이펙트 업데이트
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
            if (this.attackableTiles.length > 0) this.renderer.drawHighlights(this.attackableTiles, 'attack');
            this.renderer.drawCursor(this.selectedUnit);
        }
        
        this.renderer.drawUnits(this.units);
        // [추가] 이펙트 그리기 (유닛 위에)
        this.renderer.drawEffects(this.effectManager);

        if (!this.gameOver) {
            this.renderer.ctx.fillStyle = 'white';
            this.renderer.ctx.font = '20px Arial';
            this.renderer.ctx.textAlign = 'left';
            this.renderer.ctx.fillText(`TURN: ${this.turn}`, 10, 30);
        } else {
            // [추가] 게임 오버 화면 그리기
            this.renderer.drawGameOver(this.gameOver);
        }

        requestAnimationFrame(() => this.loop());
    }
}