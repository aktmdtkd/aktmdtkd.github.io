import { GridMap } from '../battle/GridMap.js';
import { Unit } from '../battle/Unit.js';
import { PathFinder } from '../battle/PathFinder.js';
import { BattleSystem } from '../battle/BattleSystem.js';
import { AI } from '../battle/AI.js';
import { Renderer } from '../ui/Renderer.js';

export class GameManager {
    constructor() {
        this.gridMap = new GridMap();
        this.renderer = new Renderer('gameCanvas');
        this.pathFinder = new PathFinder();
        this.battleSystem = new BattleSystem();
        this.ai = new AI();
        
        this.units = [];
        this.classes = {};

        this.gameState = 'IDLE'; 
        this.turn = 'PLAYER'; 
        this.isAnimating = false; 
        
        this.selectedUnit = null;
        this.movableTiles = [];
        this.attackableTiles = [];
    }

    async init() {
        this.setupInput();
        await this.loadData();
        this.loop();
    }

    setupInput() {
        const canvas = this.renderer.canvas;
        canvas.addEventListener('mousedown', (e) => {
            if (this.turn === 'ENEMY' || this.isAnimating) return;

            const rect = canvas.getBoundingClientRect();
            const tx = Math.floor((e.clientX - rect.left) / this.renderer.tileSize);
            const ty = Math.floor((e.clientY - rect.top) / this.renderer.tileSize);
            this.handleClick(tx, ty);
        });

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.turn === 'PLAYER' && !this.isAnimating) this.resetSelection();
        });
    }

    handleClick(x, y) {
        // [1] 유닛 선택
        if (this.gameState === 'IDLE') {
            const clickedUnit = this.getUnitAt(x, y);
            if (clickedUnit && clickedUnit.team === 'blue' && !clickedUnit.isActionDone) {
                this.selectedUnit = clickedUnit;
                this.movableTiles = this.pathFinder.getMovableTiles(clickedUnit, this.gridMap, this.units);
                this.gameState = 'SELECTED';
                console.log(`Selected: ${clickedUnit.name}`);
            }
            return;
        }

        // [2] 이동 목표 선택
        if (this.gameState === 'SELECTED') {
            if (this.movableTiles.some(t => t.x === x && t.y === y)) {
                
                const path = this.pathFinder.findPath(
                    this.selectedUnit, 
                    x, y, 
                    this.gridMap, 
                    this.units
                );

                // [핵심 수정] 경로가 진짜로 존재할 때만 이동 시작!
                // 경로가 없으면(오류 상황) 이동하지 않고 취소 처리하거나 무시
                if (path && path.length > 0) {
                    this.selectedUnit.moveAlong(path);
                    this.movableTiles = []; 
                    this.isAnimating = true; // 여기서 잠금
                    this.gameState = 'MOVING';
                } else {
                    console.warn("Path finding failed or empty path.");
                    this.resetSelection(); // 강제로 선택 취소해서 멈춤 방지
                }
            } else {
                this.resetSelection();
            }
            return;
        }

        // [3] 공격/대기
        if (this.gameState === 'TARGETING') {
            const targetUnit = this.getUnitAt(x, y);
            
            if (this.attackableTiles.some(t => t.x === x && t.y === y)) {
                if (targetUnit && targetUnit.team === 'red') {
                    this.battleSystem.executeAttack(this.selectedUnit, targetUnit);
                    this.checkDeadUnits();
                    this.endAction();
                    return;
                }
            }

            if (x === this.selectedUnit.x && y === this.selectedUnit.y) {
                console.log("Command: Wait");
                this.endAction();
                return;
            }
        }
    }

    onMoveFinished() {
        this.isAnimating = false; // [중요] 애니메이션 잠금 해제
        this.calculateAttackRange(this.selectedUnit);
        this.gameState = 'TARGETING';
        console.log("Move finished. Now Targeting.");
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

        const activeBlues = this.units.filter(u => u.team === 'blue' && !u.isActionDone && !u.isDead());
        if (activeBlues.length === 0) {
            this.startEnemyTurn();
        }
    }

    startEnemyTurn() {
        console.log("System: Starting Enemy Turn...");
        this.turn = 'ENEMY';
        this.ai.runTurn(this);
    }

    startPlayerTurn() {
        console.log("System: Starting Player Turn...");
        this.turn = 'PLAYER';
        this.units.forEach(u => u.resetTurn());
    }

    resetSelection() {
        this.selectedUnit = null;
        this.movableTiles = [];
        this.attackableTiles = [];
        this.gameState = 'IDLE';
        this.isAnimating = false; // [안전장치] 리셋 시 애니메이션 락도 해제
    }

    checkDeadUnits() {
        this.units = this.units.filter(u => {
            if (u.isDead()) {
                console.log(`${u.name} has been defeated!`);
                return false;
            }
            return true;
        });
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
            console.log("System: Data Loaded.");
        } catch (e) {
            console.error("System: Failed to load data", e);
        }
    }

    loop() {
        this.units.forEach(unit => {
            const arrived = unit.update();
            if (arrived && this.turn === 'PLAYER' && unit === this.selectedUnit) {
                this.onMoveFinished();
            }
        });

        this.renderer.clear();
        this.renderer.drawMap(this.gridMap);
        
        if (this.movableTiles.length > 0) this.renderer.drawHighlights(this.movableTiles, 'move');
        if (this.attackableTiles.length > 0) this.renderer.drawHighlights(this.attackableTiles, 'attack');

        this.renderer.drawCursor(this.selectedUnit);
        this.renderer.drawUnits(this.units);
        
        this.renderer.ctx.fillStyle = 'white';
        this.renderer.ctx.font = '20px Arial';
        this.renderer.ctx.textAlign = 'left';
        this.renderer.ctx.fillText(`TURN: ${this.turn}`, 10, 30);

        requestAnimationFrame(() => this.loop());
    }
}