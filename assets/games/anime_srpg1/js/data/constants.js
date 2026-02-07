// 스킬 데이터
export const SKILLS = {
    "fire": { 
        name: "화계", cost: 10, range: 3, power: 1.5, 
        type: "magic_damage", aoe: "cross" 
    },
    "heal": { 
        name: "구원", cost: 15, range: 2, power: 2.0, 
        type: "heal", aoe: "single" 
    },
    "smash": { 
        name: "강타", cost: 8, range: 1, power: 1.3, 
        type: "phys_damage", aoe: "single" 
    }
};

// 지형 데이터 (0:평지, 1:산, 2:강)
export const TERRAIN_DATA = {
    0: { name: "평지", cost: 1, defBonus: 0.0, desc: "이동 비용: 1" },
    1: { name: "산악", cost: 2, defBonus: 0.2, desc: "이동 비용: 2 / 방어 +20%" },
    2: { name: "강",   cost: 3, defBonus: -0.1, desc: "이동 비용: 3 / 방어 -10%" }
};