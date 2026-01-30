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
        this.roster = []; // 전체 명단
        this.selectedRoster = []; // 출진 명단

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
        // 1. 클래스 데이터 먼저 로드
        await this.loadClassData();
        // 2. 병영(로스터) 데이터 로드 및 UI 표시
        await this.loadRosterAndShowUI();
        
        // 3. 줌 컨트롤 등 기본 설정
        this.setupInput();
        this.uiManager.setupZoomControls(
            () => this.handleZoom(10),
            () => this.handleZoom(-10)
        );
        window.addEventListener('resize', () => this.handleResize());
    }

    async loadClassData() {
        const res = await fetch('./js/data/classes.json');
        this.classes = await res.json();
    }

    // [신규] 병영 UI 로직
    async loadRosterAndShowUI() {
        const res = await fetch('./js/data/roster.json');
        this.roster = await res.json();

        // 조조(isFixed)는 기본 선택
        this.selectedRoster = this.roster.filter(c => c.isFixed).map(c => c.id);

        this.renderBarracks();
    }

    renderBarracks() {
        const listEl = document.getElementById('roster-list');
        const countEl = document.getElementById('deploy-count');
        const deployBtn = document.getElementById('btn-deploy');
        listEl.innerHTML = '';

        this.roster.forEach(char => {
            const el = document.createElement('div');
            el.className = 'roster-item';
            
            // 고정 멤버(조조) 처리
            if (char.isFixed) {
                el.classList.add('fixed', 'selected');
            } else if (this.selectedRoster.includes(char.id)) {
                el.classList.add('selected');
            }

            const className = this.classes[char.class] ? this.classes[char.class].name : char.class;
            el.innerHTML = `<span>${char.name}</span> <span style="font-size:12px; color:#aaa;">${className}</span>`;

            // 클릭 이벤트
            if (!char.isFixed) {
                el.onclick = () => {
                    if (this.selectedRoster.includes(char.id)) {
                        // 선택 해제
                        this.selectedRoster = this.selectedRoster.filter(id => id !== char.id);
                    } else {
                        // 선택 (4명 제한)
                        if (this.selectedRoster.length < 4) {
                            this.selectedRoster.push(char.id);
                        } else {
                            alert("최대 4명까지만 출진할 수 있습니다.");
                            return;
                        }
                    }
                    this.renderBarracks(); // UI 갱신
                };
            }
            listEl.appendChild(el);
        });

        const count = this.selectedRoster.length;
        countEl.innerText = `선택: ${count} / 4`;
        
        // 최소 1명(조조) 이상이면 출진 가능
        deployBtn.disabled = count < 1;
        deployBtn.onclick = () => this.startBattle();
    }

    // [신규] 전투 시작 (실제 게임 로딩)
    async startBattle() {
        // UI 전환
        document.getElementById('barracks-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        
        // 캔버스 리사이징 적용
        this.handleResize();

        // 맵 데이터 로드 및 유닛 배치
        await this.loadMapAndUnits();
        
        this.loop();
    }

    async loadMapAndUnits() {
        try {
            const mapRes = await fetch('./js/data/maps.json');
            const mapJson = await mapRes.json();
            const stage1 = mapJson.stage1;
            
            this.gridMap.load(stage1);
            
            // 1. 적군 배치 (maps.json에서 로드)
            stage1.units.forEach(uConfig => {
                const classInfo = this.classes[uConfig.class];
                const newUnit = new Unit(uConfig, classInfo);
                newUnit.tileSize = this.renderer.tileSize;
                this.units.push(newUnit);
            });

            // 2. 아군 배치 (선택된 로스터를 랜덤 위치에)
            const spawnCandidates = [];
            // 시작 지점 후보 (예: x=1~4, y=1~4 구역)
            for(let y=1; y<=4; y++) {
                for(let x=1; x<=4; x++) {
                    // 벽이 아니고, 이미 유닛이 없는 곳
                    if (this.gridMap.getTerrain(x, y) === 0 && !this.getUnitAt(x, y)) {
                        spawnCandidates.push({x, y});
                    }
                }
            }

            // 랜덤 셔플
            spawnCandidates.sort(() => Math.random() - 0.5);

            this.selectedRoster.forEach((charId, index) => {
                if (index >= spawnCandidates.length) return; // 자리 없으면 스킵 (혹은 에러처리)

                const charData = this.roster.find(c => c.id === charId);
                const classInfo = this.classes[charData.class];
                const pos = spawnCandidates[index];

                const newUnit = new Unit({
                    id: charData.id,
                    name: charData.name,
                    class: charData.class,
                    team: 'blue',
                    x: pos.x,
                    y: pos.y
                }, classInfo);
                
                newUnit.tileSize = this.renderer.tileSize;
                this.units.push(newUnit);
            });

            // 카메라를 조조(또는 첫 아군)에게 맞춤
            const mainChar = this.units.find(u => u.team === 'blue');
            if (mainChar) {
                const cx = mainChar.pixelX - (this.renderer.canvas.width / 2) + 20;
                const cy = mainChar.pixelY - (this.renderer.canvas.height / 2) + 20;
                this.renderer.updateCamera(cx, cy, this.gridMap.cols, this.gridMap.rows);
            }

        } catch (e) {
            console.error("Map load failed", e);
        }
    }

    // --- 기존 게임 로직들 (Input, Loop 등) ---
    handleResize() {
        const wrapper = document.querySelector('.game-wrapper');
        const w = wrapper.clientWidth;
        const h = wrapper.clientHeight;
        this.renderer.resize(w, h);
        if(this.gridMap.cols > 0)
            this.renderer.updateCamera(this.renderer.camera.x, this.renderer.camera.y, this.gridMap.cols, this.gridMap.rows);
    }

    handleZoom(delta) {
        const oldSize = this.renderer.tileSize;
        let newSize = oldSize + delta;
        if (newSize < 20) newSize = 20;
        if (newSize > 80) newSize = 80;
        if (oldSize === newSize) return;

        const viewW = this.renderer.canvas.width;
        const viewH = this.renderer.canvas.height;
        const centerX = this.renderer.camera.x + viewW / 2;
        const centerY = this.renderer.camera.y + viewH / 2;
        const ratio = newSize / oldSize;
        const newCenterX = centerX * ratio;
        const newCenterY = centerY * ratio;

        this.renderer.setTileSize(newSize);
        this.units.forEach(u => {
            u.tileSize = newSize; 
            if (!u.isMoving) {
                u.pixelX = u.x * newSize;
                u.pixelY = u.y * newSize;
                u.targetPixelX = u.x * newSize;
                u.targetPixelY = u.y * newSize;
            } else {
                u.pixelX *= ratio;
                u.pixelY *= ratio;
                u.targetPixelX *= ratio;
                u.targetPixelY *= ratio;
            }
        });
        this.renderer.updateCamera(newCenterX - viewW / 2, newCenterY - viewH / 2, this.gridMap.cols, this.gridMap.rows);
    }

    getInputPos(evt) {
        const canvas = this.renderer.canvas;
        const rect = canvas.getBoundingClientRect();
        let clientX = evt.clientX;
        let clientY = evt.clientY;
        if (evt.touches && evt.touches.length > 0) {
            clientX = evt.touches[0].clientX;
            clientY = evt.touches[0].clientY;
        } else if (evt.changedTouches && evt.changedTouches.length > 0) {
            clientX = evt.changedTouches[0].clientX;
            clientY = evt.changedTouches[0].clientY;
        }
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    setupInput() {
        const canvas = this.renderer.canvas;
        canvas.addEventListener('mousedown', (e) => this.handleStart(e));
        canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleEnd(e));
        canvas.addEventListener('mouseleave', () => { this.isInputDown = false; this.isDragging = false; canvas.style.cursor = 'crosshair'; });
        canvas.addEventListener('touchstart', (e) => this.handleStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.handleEnd(e), { passive: false });
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.turn === 'PLAYER' && !this.isAnimating && !this.gameOver) {
                if (this.gameState === 'TARGETING') this.openActionMenu();
                else if (this.gameState === 'SELECTED') this.resetSelection();
            }
        });
    }

    handleStart(e) {
        if (e.cancelable) e.preventDefault();
        if (this.gameOver) { location.reload(); return; }
        if (this.gameState === 'ACTION_SELECT') return;
        this.renderer.canvas.style.cursor = 'grabbing';
        this.isInputDown = true;
        this.isDragging = false;
        const pos = this.getInputPos(e);
        this.dragStartX = pos.x;
        this.dragStartY = pos.y;
        this.cameraStartX = this.renderer.camera.x;
        this.cameraStartY = this.renderer.camera.y;
    }

    handleMove(e) {
        if (e.cancelable) e.preventDefault();
        if (this.gameOver) return;
        const pos = this.getInputPos(e);
        if (this.isInputDown) {
            const dx = pos.x - this.dragStartX;
            const dy = pos.y - this.dragStartY;
            if (!this.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) this.isDragging = true;
            if (this.isDragging) {
                const newCamX = this.cameraStartX - dx;
                const newCamY = this.cameraStartY - dy;
                this.renderer.updateCamera(newCamX, newCamY, this.gridMap.cols, this.gridMap.rows);
                return; 
            }
        }
        if (!this.isDragging && !('ontouchstart' in window)) {
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
        }
    }

    async handleEnd(e) {
        if (e.cancelable) e.preventDefault();
        this.isInputDown = false;
        this.renderer.canvas.style.cursor = 'crosshair';
        if (this.gameOver || this.gameState === 'ACTION_SELECT') return;
        if (this.isDragging) { this.isDragging = false; return; }
        if (this.turn === 'ENEMY' || this.isAnimating) return;
        const pos = this.getInputPos(e);
        const worldX = pos.x + this.renderer.camera.x;
        const worldY = pos.y + this.renderer.camera.y;
        const tx = Math.floor(worldX / this.renderer.tileSize);
        const ty = Math.floor(worldY / this.renderer.tileSize);
        await this.handleClick(tx, ty);
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
                } else { this.resetSelection(); }
            } else { this.resetSelection(); }
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
                    } else { this.isAnimating = false; }
                } else if (this.selectedAction.type === 'skill') {
                    await this.battleSystem.executeSkill(this.selectedUnit, x, y, this.selectedAction.id, this.units, this.effectManager);
                    this.finishTurnSequence();
                }
            }
        }
    }

    onMoveFinished() { this.isAnimating = false; this.openActionMenu(); }
    openActionMenu() {
        this.gameState = 'ACTION_SELECT';
        this.attackableTiles = [];
        this.uiManager.showActionMenu(this.selectedUnit, () => this.selectAttack(), () => this.openSkillMenu(), () => this.wait());
    }
    openSkillMenu() { this.uiManager.showSkillMenu(this.selectedUnit, (skillId) => this.selectSkill(skillId)); }
    selectAttack() { this.selectedAction = { type: 'attack' }; this.calculateRange(this.selectedUnit.attackRange); this.gameState = 'TARGETING'; }
    selectSkill(skillId) { this.selectedAction = { type: 'skill', id: skillId }; const skill = SKILLS[skillId]; this.calculateRange(skill.range); this.gameState = 'TARGETING'; }
    wait() { this.endAction(); }
    calculateRange(range) {
        this.attackableTiles = [];
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                if (Math.abs(dx) + Math.abs(dy) <= range) {
                    const nx = this.selectedUnit.x + dx;
                    const ny = this.selectedUnit.y + dy;
                    if (this.gridMap.isValid(nx, ny)) { this.attackableTiles.push({x: nx, y: ny}); }
                }
            }
        }
    }
    finishTurnSequence(targetUnit) { this.isAnimating = false; this.checkDeadUnits(); this.endAction(); if(targetUnit) this.uiManager.updateUnit(targetUnit); }
    endAction() {
        if (this.selectedUnit) { this.selectedUnit.endAction(); }
        this.resetSelection();
        this.uiManager.hideMenus();
        if (this.checkWinCondition()) return;
        const activeBlues = this.units.filter(u => u.team === 'blue' && !u.isActionDone && !u.isDead());
        if (activeBlues.length === 0) { this.startEnemyTurn(); }
    }
    startEnemyTurn() { this.turn = 'ENEMY'; this.turnIndicator.innerText = `TURN: ${this.turn}`; this.turnIndicator.style.color = '#ff6666'; this.ai.runTurn(this); }
    startPlayerTurn() {
        this.turn = 'PLAYER'; this.turnIndicator.innerText = `TURN: ${this.turn}`; this.turnIndicator.style.color = '#ffffff';
        this.units.forEach(u => u.resetTurn());
        const mainChar = this.units.find(u => u.name === '조조' && !u.isDead());
        if(mainChar) {
            const cx = mainChar.pixelX - (this.renderer.canvas.width / 2) + 20;
            const cy = mainChar.pixelY - (this.renderer.canvas.height / 2) + 20;
            this.renderer.updateCamera(cx, cy, this.gridMap.cols, this.gridMap.rows);
        }
    }
    resetSelection() { this.selectedUnit = null; this.selectedAction = null; this.movableTiles = []; this.attackableTiles = []; this.gameState = 'IDLE'; this.isAnimating = false; this.uiManager.hideMenus(); }
    checkDeadUnits() { this.units = this.units.filter(u => !u.isDead()); this.checkWinCondition(); }
    checkWinCondition() {
        if (this.gameOver) return true;
        const blueAlive = this.units.some(u => u.team === 'blue' && !u.isDead());
        const redAlive = this.units.some(u => u.team === 'red' && !u.isDead());
        if (!redAlive) { this.gameOver = 'WIN'; return true; }
        else if (!blueAlive) { this.gameOver = 'LOSE'; return true; }
        return false;
    }
    getUnitAt(x, y) { return this.units.find(u => u.x === x && u.y === y && !u.isDead()); }
    loop() {
        this.effectManager.update();
        this.units.forEach(unit => { const arrived = unit.update(); if (arrived && this.turn === 'PLAYER' && unit === this.selectedUnit) this.onMoveFinished(); });
        this.renderer.clear();
        this.renderer.drawMap(this.gridMap);
        if (!this.gameOver) {
            if (this.movableTiles.length > 0) this.renderer.drawHighlights(this.movableTiles, 'move');
            if (this.gameState === 'TARGETING' && this.attackableTiles.length > 0) this.renderer.drawHighlights(this.attackableTiles, 'attack');
            this.renderer.drawCursor(this.selectedUnit);
        }
        this.renderer.drawUnits(this.units);
        this.renderer.drawEffects(this.effectManager);
        if (this.gameOver) this.renderer.drawGameOver(this.gameOver);
        requestAnimationFrame(() => this.loop());
    }
}