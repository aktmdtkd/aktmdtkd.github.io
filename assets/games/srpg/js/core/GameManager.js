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
        this.isAnimating = false; // [추가] 애니메이션 중인지 체크
        
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
            // [추가] 애니메이션 중이거나 적 턴이면 클릭 무시
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
                // [수정] 이동 시작
                this.selectedUnit.moveTo(x, y);
                this.movableTiles = []; // 이동 범위 즉시 숨기기
                this.isAnimating = true; // 입력 잠금
                this.gameState = 'MOVING'; // 상태 변경
            } else {
                this.resetSelection();
            }
            return;
        }

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
                this.endAction();
                return;
            }
        }
    }

    // [추가] 이동 애니메이션이 끝났을 때 호출됨
    onMoveFinished() {
        this.isAnimating = false;
        
        // 이동이 끝났으니 공격 범위 계산 및 표시
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
    }

    checkDeadUnits() {
        this.units = this.units.filter(u => !u.isDead());
    }

    getUnitAt(x, y) {
        return this.units.find(u => u.x === x && u.y === y && !u.isDead());
    }

    async loadData() {
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
    }

    loop() {
        // [추가] 유닛 애니메이션 업데이트
        this.units.forEach(unit => {
            const arrived = unit.update();
            // 플레이어 턴이고, 방금 이동을 마친 유닛이 현재 선택된 유닛이라면?
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