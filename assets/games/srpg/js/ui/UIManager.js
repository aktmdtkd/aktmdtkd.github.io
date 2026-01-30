import { SKILLS } from '../battle/BattleSystem.js';

export class UIManager {
    constructor() {
        this.nameEl = document.getElementById('ui-name');
        this.classEl = document.getElementById('ui-class');
        
        this.hpBarEl = document.getElementById('ui-hp-bar');
        this.hpTextEl = document.getElementById('ui-hp-text');
        this.mpBarEl = document.getElementById('ui-mp-bar');
        this.mpTextEl = document.getElementById('ui-mp-text');
        
        this.atkEl = document.getElementById('ui-atk');
        this.defEl = document.getElementById('ui-def');
        this.intEl = document.getElementById('ui-int');

        this.terrainEl = document.getElementById('ui-terrain');
        this.terrainEffectEl = document.getElementById('ui-terrain-effect');

        this.unitPanel = document.getElementById('ui-unit-panel');
        this.statsPanel = document.getElementById('ui-stats-panel');

        this.actionMenu = document.getElementById('action-menu');
        this.skillMenu = document.getElementById('skill-menu');
        this.btnAttack = document.getElementById('btn-attack');
        this.btnMagic = document.getElementById('btn-magic');
        this.btnWait = document.getElementById('btn-wait');

        // [신규] 줌 버튼
        this.btnZoomIn = document.getElementById('btn-zoom-in');
        this.btnZoomOut = document.getElementById('btn-zoom-out');
        
        this.terrainNames = { 0: "평지", 1: "산악", 2: "강" };
    }

    // [신규] 줌 이벤트 연결
    setupZoomControls(onZoomIn, onZoomOut) {
        this.btnZoomIn.onclick = (e) => {
            e.stopPropagation(); // 맵 클릭 방지
            onZoomIn();
        };
        this.btnZoomOut.onclick = (e) => {
            e.stopPropagation();
            onZoomOut();
        };
    }

    updateUnit(unit) {
        if (!unit) {
            this.unitPanel.style.opacity = '0';
            this.statsPanel.style.opacity = '0';
            return;
        }

        this.unitPanel.style.opacity = '1';
        this.statsPanel.style.opacity = '1';

        this.nameEl.innerText = unit.name;
        this.classEl.innerText = `${unit.team==='blue'?'[아군]':'[적군]'} ${unit.className}`;
        
        this.atkEl.innerText = unit.atk;
        this.defEl.innerText = unit.def;
        this.intEl.innerText = unit.int;

        const hpPct = (unit.currentHp / unit.maxHp) * 100;
        this.hpBarEl.style.width = `${hpPct}%`;
        this.hpTextEl.innerText = `HP ${unit.currentHp}/${unit.maxHp}`;
        this.hpBarEl.style.backgroundColor = hpPct > 50 ? '#00ff00' : (hpPct > 25 ? '#ffff00' : '#ff0000');

        const mpPct = unit.maxMp > 0 ? (unit.currentMp / unit.maxMp) * 100 : 0;
        this.mpBarEl.style.width = `${mpPct}%`;
        this.mpTextEl.innerText = `MP ${unit.currentMp}/${unit.maxMp}`;
    }

    updateTerrain(type) {
        this.terrainEl.innerText = this.terrainNames[type] || "알 수 없음";
        this.terrainEffectEl.innerText = type === 1 ? "방어 +10%" : (type === 2 ? "회피 -10%" : "-");
    }

    showActionMenu(unit, onAttack, onMagic, onWait) {
        this.actionMenu.style.display = 'flex';
        this.skillMenu.style.display = 'none';

        this.btnAttack.onclick = () => { this.hideMenus(); onAttack(); };
        this.btnMagic.onclick = () => { this.hideMenus(); onMagic(); };
        this.btnWait.onclick = () => { this.hideMenus(); onWait(); };

        const unitSkills = unit.skills || [];
        if (unitSkills.length === 0) {
            this.btnMagic.disabled = true;
            this.btnMagic.innerText = "책략 (없음)";
        } else {
            const minCost = Math.min(...unitSkills.map(id => SKILLS[id].cost));
            if (unit.currentMp < minCost) {
                this.btnMagic.disabled = true;
                this.btnMagic.innerText = "책략 (MP부족)";
            } else {
                this.btnMagic.disabled = false;
                this.btnMagic.innerText = "책략";
            }
        }
    }

    showSkillMenu(unit, onSkillSelect) {
        this.skillMenu.style.display = 'flex';
        this.actionMenu.style.display = 'none';

        let html = `<div class="menu-title">책략 선택 (MP ${unit.currentMp})</div>`;
        const availableSkills = unit.skills || [];

        availableSkills.forEach(skillId => {
            const skill = SKILLS[skillId];
            const disabled = unit.currentMp < skill.cost ? 'disabled' : '';
            html += `<button class="menu-btn" ${disabled} id="skill-${skillId}">
                        ${skill.name} (MP ${skill.cost})
                     </button>`;
        });

        html += `<button class="menu-btn" onclick="cancelSkill()">뒤로가기</button>`;
        this.skillMenu.innerHTML = html;

        availableSkills.forEach(skillId => {
            const btn = document.getElementById(`skill-${skillId}`);
            if (btn && !btn.disabled) {
                btn.onclick = () => {
                    this.hideMenus();
                    onSkillSelect(skillId);
                };
            }
        });
    }

    hideMenus() {
        this.actionMenu.style.display = 'none';
        this.skillMenu.style.display = 'none';
    }
}