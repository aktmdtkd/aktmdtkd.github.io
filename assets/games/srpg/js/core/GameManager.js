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

        this.gameState = 'IDLE'; // IDLE, SELECTED, MOVING, TARGETING
        this.turn = 'PLAYER'; // PLAYER, ENEMY
        this.isAnimating = false; // 유닛 이동 애니메이션 중인지 체크
        
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
            // 적군 턴이거나 애니메이션 중일 때는 입력 차단
            if (this.turn === 'ENEMY' || this.isAnimating) return;

            const rect = canvas.getBoundingClientRect();
            const tx = Math.floor((e.clientX - rect.left) / this.renderer.tileSize);
            const ty = Math.floor((e.clientY - rect.top) / this.renderer.tileSize);
            this.handleClick(tx, ty);
        });

        // 우클릭으로 취소
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.turn === 'PLAYER' && !this.isAnimating) this.resetSelection();
        });
    }

    handleClick(x, y) {
        // [1] 유닛 선택 단계
        if (this.gameState === 'IDLE') {
            const clickedUnit = this.getUnitAt(x, y);
            // 아군이면서 행동을 하지 않은 유닛만 선택 가능
            if (clickedUnit && clickedUnit.team === 'blue' && !clickedUnit.isActionDone) {
                this.selectedUnit = clickedUnit;
                // 이동 가능한 타일 계산 (BFS)
                this.movableTiles = this.pathFinder.getMovableTiles(clickedUnit, this.gridMap, this.units);
                this.gameState = 'SELECTED';
                console.log(`Selected: ${clickedUnit.name}`);
            }
            return;
        }

        // [2] 이동 목표 선택 단계
        if (this.gameState === 'SELECTED') {
            // 이동 가능한 타일을 클릭했는지 확인
            if (this.movableTiles.some(t => t.x === x && t.y === y)) {
                
                // 1. 최단 경로(Path) 계산
                const path = this.pathFinder.findPath(
                    this.selectedUnit, 
                    x, y, 
                    this.gridMap, 
                    this.units
                );

                // 2. 경로를 따라 이동 시작
                this.selectedUnit.moveAlong(path);
                
                this.movableTiles = []; // 이동 범위 숨김
                this.isAnimating = true; // 애니메이션 잠금 시작
                this.gameState = 'MOVING'; // 상태 변경
            } else {
                // 딴 곳을 찍으면 선택 취소
                this.resetSelection();
            }
            return;
        }

        // [3] 공격 또는 대기 선택 단계 (이동 애니메이션 종료 후 진입)
        if (this.gameState === 'TARGETING') {
            const targetUnit = this.getUnitAt(x, y);
            
            // 3-1. 공격 범위 내의 적군 클릭 -> 공격
            if (this.attackableTiles.some(t => t.x === x && t.y === y)) {
                if (targetUnit && targetUnit.team === 'red') {
                    this.battleSystem.executeAttack(this.selectedUnit, targetUnit);
                    this.checkDeadUnits(); // 사망 처리
                    this.endAction(); // 행동 종료
                    return;
                }
            }

            // 3-2. 자기 자신이나 빈 땅 클릭 -> 대기
            if (x === this.selectedUnit.x && y === this.selectedUnit.y) {
                console.log("Command: Wait");
                this.endAction(); // 행동 종료
                return;
            }
            
            // 그 외 지역 클릭은 무시 (취소하려면 우클릭)
        }
    }

    // 유닛의 이동 애니메이션이 끝났을 때 Unit.js에서 호출됨 (혹은 loop에서 감지)
    onMoveFinished() {
        this.isAnimating = false;
        
        // 이동이 끝났으니 공격 가능한 범위 계산
        this.calculateAttackRange(this.selectedUnit);
        this.gameState = 'TARGETING';
        console.log("Move finished. Now Targeting.");
    }

    calculateAttackRange(unit) {
        this.attackableTiles = [];
        const range = unit.attackRange;
        
        // 간단한 맨해튼 거리 방식으로 공격 범위 계산
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                if (Math.abs(dx) + Math.abs(dy) <= range) {
                    const nx = unit.x + dx;
                    const ny = unit.y + dy;
                    if (this.gridMap.isValid(nx, ny)) {
                        // 빈 땅이든 유닛이 있든 사거리 안이면 표시
                        this.attackableTiles.push({x: nx, y: ny});
                    }
                }
            }
        }
    }

    endAction() {
        if (this.selectedUnit) {
            this.selectedUnit.endAction(); // 유닛 회색 처리
        }
        this.resetSelection();

        // 아군 턴 종료 조건 체크 (움직일 수 있는 아군이 없으면)
        const activeBlues = this.units.filter(u => u.team === 'blue' && !u.isActionDone && !u.isDead());
        if (activeBlues.length === 0) {
            this.startEnemyTurn();
        }
    }

    startEnemyTurn() {
        console.log("System: Starting Enemy Turn...");
        this.turn = 'ENEMY';
        // AI 작동 시작
        this.ai.runTurn(this);
    }

    startPlayerTurn() {
        console.log("System: Starting Player Turn...");
        this.turn = 'PLAYER';
        // 모든 아군 유닛 행동력 초기화
        this.units.forEach(u => u.resetTurn());
    }

    resetSelection() {
        this.selectedUnit = null;
        this.movableTiles = [];
        this.attackableTiles = [];
        this.gameState = 'IDLE';
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
        // [애니메이션 업데이트]
        this.units.forEach(unit => {
            const arrived = unit.update(); // 유닛 이동 업데이트
            
            // 플레이어 턴이고, 방금 이동을 마친 유닛이 선택된 유닛이라면 다음 단계 진행
            if (arrived && this.turn === 'PLAYER' && unit === this.selectedUnit) {
                this.onMoveFinished();
            }
        });

        // [렌더링]
        this.renderer.clear();
        this.renderer.drawMap(this.gridMap);
        
        if (this.movableTiles.length > 0) this.renderer.drawHighlights(this.movableTiles, 'move');
        if (this.attackableTiles.length > 0) this.renderer.drawHighlights(this.attackableTiles, 'attack');

        this.renderer.drawCursor(this.selectedUnit);
        this.renderer.drawUnits(this.units);
        
        // 턴 UI 표시
        this.renderer.ctx.fillStyle = 'white';
        this.renderer.ctx.font = '20px Arial';
        this.renderer.ctx.textAlign = 'left';
        this.renderer.ctx.fillText(`TURN: ${this.turn}`, 10, 30);

        requestAnimationFrame(() => this.loop());
    }
}