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

        // 상태: IDLE -> SELECTED -> MOVING -> ACTION_SELECT -> TARGETING
        this.gameState = 'IDLE'; 
        this.turn = 'PLAYER'; 
        this.isAnimating = false;
        this.gameOver = null;
        
        this.selectedUnit = null;
        this.selectedAction = null; // { type: 'attack' } or { type: 'skill', id: 'fire' }
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

        canvas.addEventListener('mousedown', async (e) => {
            if (this.gameOver) { location.reload(); return; }
            if (this.turn === 'ENEMY' || this.isAnimating) return;
            // 메뉴가 떠있을 땐 캔버스 클릭 막기 (간단 처리)
            if (this.gameState === 'ACTION_SELECT') return;

            const rect = canvas.getBoundingClientRect();
            const tx = Math.floor((e.clientX - rect.left) / this.renderer.tileSize);
            const ty = Math.floor((e.clientY - rect.top) / this.renderer.tileSize);
            await this.handleClick(tx, ty);
        });

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // 우클릭 취소 로직
            if (this.turn === 'PLAYER' && !this.isAnimating && !this.gameOver) {
                if (this.gameState === 'TARGETING') {
                    // 타겟팅 중에 우클릭하면 다시 메뉴로
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
                    this.onMoveFinished(); // 제자리 대기 -> 메뉴 오픈
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

        // [3] 타겟팅 (공격 또는 스킬)
        if (this.gameState === 'TARGETING') {
            // 범위 내 클릭인지 확인
            if (this.attackableTiles.some(t => t.x === x && t.y === y)) {
                this.isAnimating = true;

                // A. 일반 공격
                if (this.selectedAction.type === 'attack') {
                    const targetUnit = this.getUnitAt(x, y);
                    if (targetUnit && targetUnit.team === 'red') {
                        await this.battleSystem.executeAttack(this.selectedUnit, targetUnit, this.effectManager);
                        this.finishTurnSequence(targetUnit);
                    } else {
                        this.isAnimating = false; // 잘못 누름
                    }
                } 
                // B. 책략 사용
                else if (this.selectedAction.type === 'skill') {
                    // 책략은 빈 땅에도 쓸 수 있음 (범위기 등)
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

    // 이동 완료 후 호출됨
    onMoveFinished() {
        this.isAnimating = false;
        // 곧바로 타겟팅이 아니라 메뉴를 연다
        this.openActionMenu();
    }

    openActionMenu() {
        this.gameState = 'ACTION_SELECT';
        this.attackableTiles = []; // 범위 표시 제거

        this.uiManager.showActionMenu(
            this.selectedUnit,
            () => this.selectAttack(),  // 공격 클릭 시
            () => this.openSkillMenu(), // 책략 클릭 시
            () => this.wait()           // 대기 클릭 시
        );
    }

    openSkillMenu() {
        this.uiManager.showSkillMenu(
            this.selectedUnit,
            (skillId) => this.selectSkill(skillId) // 스킬 선택 시
        );
    }

    // [행동 1] 공격 선택
    selectAttack() {
        this.selectedAction = { type: 'attack' };
        this.calculateRange(this.selectedUnit.attackRange);
        this.gameState = 'TARGETING';
        console.log("Mode: Attack Targeting");
    }

    // [행동 2] 스킬 선택
    selectSkill(skillId) {
        this.selectedAction = { type: 'skill', id: skillId };
        const skill = SKILLS[skillId];
        this.calculateRange(skill.range);
        this.gameState = 'TARGETING';
        console.log(`Mode: Skill Targeting (${skill.name})`);
    }

    // [행동 3] 대기
    wait() {
        console.log("Command: Wait");
        this.endAction();
    }

    // 범위 계산 (공격/스킬 공용)
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
        this.uiManager.hideMenus(); // 메뉴 닫기

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
                this.units.push(newUnit);
            });
        } catch (e) {
            console.error(e);
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
            // 이동 범위
            if (this.movableTiles.length > 0) this.renderer.drawHighlights(this.movableTiles, 'move');
            
            // 공격/스킬 범위 (메뉴가 떠있을 땐 안 그림)
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
            this.renderer.ctx.fillText(`TURN: ${this.turn}`, 10, 30);
        } else {
            this.renderer.drawGameOver(this.gameOver);
        }

        requestAnimationFrame(() => this.loop());
    }
}