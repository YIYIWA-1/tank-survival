const MAP_SIZE = 4000;
const COLORS = ['#FFFFFF', '#95a5a6', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#e74c3c', '#f1c40f', '#000000'];
const COLOR_NAMES = ['白', '灰', '绿', '蓝', '紫', '橙', '红', '金', '黑'];
const ENEMY_TYPES = { BASIC: 0, KAMIKAZE: 1, ENERGY: 2, HEAVY: 3 }; 

const RARITIES = {
    WHITE: { n: '白色', color: '#FFFFFF', cost: 1, max: 1, next: 'GRAY', forgeCost: 1 },
    GRAY: { n: '灰色', color: '#bdc3c7', cost: 3, max: 2, next: 'GREEN', forgeCost: 2 },
    GREEN: { n: '绿色', color: '#2ecc71', cost: 10, max: 3, next: 'BLUE', forgeCost: 4 },
    BLUE: { n: '蓝色', color: '#3498db', cost: 25, max: 4, next: 'PURPLE', forgeCost: 8 },
    PURPLE: { n: '紫色', color: '#9b59b6', cost: 60, max: 5, next: 'ORANGE', forgeCost: 16 },
    ORANGE: { n: '橙色', color: '#e67e22', cost: 150, max: 6, next: 'RED', forgeCost: 32 },
    RED: { n: '红色', color: '#e74c3c', cost: 350, max: 7, next: 'GOLD', forgeCost: 64 },
    GOLD: { n: '金色', color: '#f1c40f', cost: 800, max: 8, next: 'BLACK', forgeCost: 128 },
    BLACK: { n: '黑色', color: '#000000', cost: 2000, max: 10, next: null }
};

const BASE_PLAYER = { hp: 100, maxHp: 100, size: 18, speed: 120, atk: 10, atkSpd: 1, range: 300, splash: 30, projSpd: 400, regen: 0, def: 0, level: 1, xp: 0, nextLevelXp: 25, energy: 100, maxEnergy: 100, energyRegen: 1.0 };

function hexToRgba(hex, alpha) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) { r = parseInt(hex[1]+hex[1], 16); g = parseInt(hex[2]+hex[2], 16); b = parseInt(hex[3]+hex[3], 16); } 
    else if (hex.length === 7) { r = parseInt(hex.substring(1,3), 16); g = parseInt(hex.substring(3,5), 16); b = parseInt(hex.substring(5,7), 16); }
    return `rgba(${r},${g},${b},${alpha})`;
}

function genId() { return Math.random().toString(36).substr(2,9); }
