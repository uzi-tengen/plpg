import { UnitType, UnitStats, ArtifactType, UnitTier, Achievement, GlobalTechType, SynthesisRecipe, Difficulty } from './types';

// Grid Configuration
export const GRID_ROWS = 8;
export const GRID_COLS = 7;
export const TILE_SIZE = 50; // Base pixel size for calculations (responsive scaling handles display)

// Tier Configuration
export const TIER_INFO: Record<UnitTier, { name: string; color: string; borderColor: string; costMult: number }> = {
  [UnitTier.COMMON]: { name: '일반', color: 'text-gray-400', borderColor: 'border-gray-400', costMult: 1.0 },
  [UnitTier.RARE]: { name: '희귀', color: 'text-blue-400', borderColor: 'border-blue-500', costMult: 3.0 },
  [UnitTier.EPIC]: { name: '영웅', color: 'text-purple-400', borderColor: 'border-purple-500', costMult: 8.0 },
  [UnitTier.LEGENDARY]: { name: '전설', color: 'text-yellow-400', borderColor: 'border-yellow-400', costMult: 20.0 },
  [UnitTier.MYTHIC]: { name: '신화', color: 'text-red-500', borderColor: 'border-red-500', costMult: 50.0 },
};

// Difficulty Settings (Easier now)
export const DIFFICULTY_SETTINGS: Record<Difficulty, { name: string; maxLevel: number; enemyMult: number; desc: string; color: string }> = {
  [Difficulty.NORMAL]: {
    name: '보통',
    maxLevel: 30,
    enemyMult: 0.8, 
    desc: '30단계. 기본적인 전략을 익히기에 적합합니다.',
    color: 'text-green-400'
  },
  [Difficulty.HARD]: {
    name: '하드',
    maxLevel: 40,
    enemyMult: 1.0, 
    desc: '40단계. 더 강력한 적들이 등장합니다.',
    color: 'text-orange-400'
  },
  [Difficulty.HELL]: {
    name: '지옥',
    maxLevel: 50,
    enemyMult: 1.2, 
    desc: '50단계. 극한의 난이도에 도전하세요.',
    color: 'text-red-600'
  }
};

// Unit Names Localization
export const UNIT_NAMES: Record<UnitType, string> = {
  [UnitType.INFANTRY]: '보병',
  [UnitType.ARCHER]: '궁수',
  [UnitType.TANK]: '탱크',
  [UnitType.SPEARMAN]: '창병',
  [UnitType.MAGE]: '마법사',
  [UnitType.ASSASSIN]: '암살자',
  [UnitType.GOLEM]: '골렘',
  [UnitType.DRAGON]: '드래곤',
  [UnitType.PALADIN]: '신성 기사',
  [UnitType.SNIPER]: '저격수',
  [UnitType.VOID_WALKER]: '공허 방랑자',
};

// Base Stats (Level 1)
export const UNIT_BASE_STATS: Record<UnitType, UnitStats> = {
  // COMMON
  [UnitType.INFANTRY]: {
    tier: UnitTier.COMMON,
    hp: 120,
    damage: 15,
    attackSpeed: 1.2,
    range: 1.2,
    moveSpeed: 2.5,
    color: 'bg-slate-600',
    icon: '⚔️'
  },
  [UnitType.ARCHER]: {
    tier: UnitTier.COMMON,
    hp: 80,
    damage: 25,
    attackSpeed: 1.0,
    range: 5.5,
    moveSpeed: 2.2,
    color: 'bg-slate-600',
    icon: '🏹'
  },
  
  // RARE
  [UnitType.TANK]: {
    tier: UnitTier.RARE,
    hp: 300,
    damage: 12,
    attackSpeed: 0.8,
    range: 1.2,
    moveSpeed: 1.8,
    color: 'bg-blue-700',
    icon: '🛡️'
  },
  [UnitType.SPEARMAN]: {
    tier: UnitTier.RARE,
    hp: 150,
    damage: 22,
    attackSpeed: 1.1,
    range: 2.5, // Slightly longer melee range
    moveSpeed: 2.3,
    color: 'bg-blue-700',
    icon: '🔱'
  },

  // EPIC
  [UnitType.MAGE]: {
    tier: UnitTier.EPIC,
    hp: 90,
    damage: 45,
    attackSpeed: 0.7,
    range: 6.0,
    moveSpeed: 2.0,
    color: 'bg-purple-700',
    icon: '🧙'
  },
  [UnitType.ASSASSIN]: {
    tier: UnitTier.EPIC,
    hp: 140,
    damage: 40,
    attackSpeed: 2.0, // Very fast
    range: 1.2,
    moveSpeed: 3.5, // Very fast
    color: 'bg-purple-700',
    icon: '🥷'
  },

  // LEGENDARY
  [UnitType.GOLEM]: {
    tier: UnitTier.LEGENDARY,
    hp: 600,
    damage: 25,
    attackSpeed: 0.6,
    range: 1.2,
    moveSpeed: 1.5,
    color: 'bg-yellow-700',
    icon: '🗿'
  },
  [UnitType.DRAGON]: {
    tier: UnitTier.LEGENDARY,
    hp: 400,
    damage: 70,
    attackSpeed: 0.9,
    range: 3.5,
    moveSpeed: 2.5,
    color: 'bg-yellow-700',
    icon: '🐉'
  },

  // MYTHIC
  [UnitType.PALADIN]: {
    tier: UnitTier.MYTHIC,
    hp: 2000, 
    damage: 100, 
    attackSpeed: 1.0,
    range: 1.2,
    moveSpeed: 2.0,
    color: 'bg-red-900',
    icon: '⚜️'
  },
  [UnitType.SNIPER]: {
    tier: UnitTier.MYTHIC,
    hp: 350, 
    damage: 400, 
    attackSpeed: 0.6, 
    range: 8.0, // Extreme range
    moveSpeed: 1.5,
    color: 'bg-red-900',
    icon: '🎯'
  },
  [UnitType.VOID_WALKER]: {
    tier: UnitTier.MYTHIC,
    hp: 1000, 
    damage: 150, 
    attackSpeed: 1.6, 
    range: 3.0, // Mid range
    moveSpeed: 2.5,
    color: 'bg-red-900',
    icon: '👾'
  }
};

// Scaling per level (Reduced significantly to make it easier)
export const HP_MULTIPLIER = 1.8; 
export const DAMAGE_MULTIPLIER = 1.6;

// Enemy Color Override
export const ENEMY_COLOR = 'bg-red-600';

// Costs
export const RECRUIT_COST = 100;
export const RECRUIT_COST_INCREASE = 10;

// Tech / Upgrades
export const TECH_COST_BASE = 100;
export const TECH_COST_INCREASE = 20;

export const GLOBAL_TECH_INFO: Record<GlobalTechType, { name: string; desc: string; baseCost: number; costInc: number; maxLevel: number }> = {
  [GlobalTechType.CAPACITY]: {
    name: "병영 확장",
    desc: "최대 보유 유닛 수가 증가합니다.",
    baseCost: 200,
    costInc: 100,
    maxLevel: 20
  },
  [GlobalTechType.LUCK]: {
    name: "행운의 부적",
    desc: "높은 등급의 유닛이 등장할 확률이 증가합니다.",
    baseCost: 200,
    costInc: 100,
    maxLevel: 10
  },
  [GlobalTechType.MYTHIC_MASTERY]: {
    name: "신화 마스터리",
    desc: "모든 신화 등급 유닛의 능력치가 강화됩니다.",
    baseCost: 200,
    costInc: 20,
    maxLevel: 100
  }
};

export const BASE_UNIT_CAP = 10;
export const UNIT_CAP_PER_LEVEL = 2;

// Artifacts
export const ARTIFACT_COST_BASE = 200;
export const ARTIFACT_COST_INCREASE = 50;

export const ARTIFACT_INFO: Record<ArtifactType, { name: string; desc: string; icon: string; perLevel: string }> = {
  [ArtifactType.HOLY_SWORD]: {
    name: "성스러운 검",
    desc: "모든 아군 유닛의 공격력이 증가합니다.",
    icon: "🗡️",
    perLevel: "+5%"
  },
  [ArtifactType.ANCIENT_SHIELD]: {
    name: "고대 방패",
    desc: "모든 아군 유닛의 체력이 증가합니다.",
    icon: "🛡️",
    perLevel: "+5%"
  },
  [ArtifactType.WAR_DRUMS]: {
    name: "전쟁의 북",
    desc: "모든 아군 유닛의 공격 속도가 빨라집니다.",
    icon: "🥁",
    perLevel: "+3%"
  },
  [ArtifactType.WIND_CLOAK]: {
    name: "바람의 망토",
    desc: "모든 아군 유닛의 이동 속도가 빨라집니다.",
    icon: "🍃",
    perLevel: "+5%"
  },
  [ArtifactType.MIDAS_TOUCH]: {
    name: "미다스의 손",
    desc: "전투 승리 및 보급 시 획득하는 골드가 증가합니다.",
    icon: "🖐️",
    perLevel: "+10%"
  }
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'kill_1', title: "첫 번째 피", desc: "적 유닛 1마리 처치", type: 'kills', target: 1, reward: 100, icon: "🩸" },
  { id: 'kill_100', title: "전장의 학살자", desc: "적 유닛 100마리 처치", type: 'kills', target: 100, reward: 500, icon: "💀" },
  { id: 'kill_1000', title: "전쟁의 신", desc: "적 유닛 1,000마리 처치", type: 'kills', target: 1000, reward: 2000, icon: "👹" },
  
  { id: 'merge_10', title: "합성의 시작", desc: "유닛 10회 합성", type: 'merges', target: 10, reward: 200, icon: "✨" },
  { id: 'merge_100', title: "연금술사", desc: "유닛 100회 합성", type: 'merges', target: 100, reward: 1000, icon: "⚗️" },
  
  { id: 'summon_50', title: "징집관", desc: "유닛 50회 소환", type: 'summons', target: 50, reward: 300, icon: "📦" },
  { id: 'summon_200', title: "군단장", desc: "유닛 200회 소환", type: 'summons', target: 200, reward: 1500, icon: "🏰" },
  
  { id: 'win_10', title: "승리의 맛", desc: "전투 10회 승리", type: 'wins', target: 10, reward: 400, icon: "🚩" },
  { id: 'win_50', title: "정복자", desc: "전투 50회 승리", type: 'wins', target: 50, reward: 2500, icon: "👑" },
];

export const SYNTHESIS_RECIPES: SynthesisRecipe[] = [
  {
    id: 'paladin',
    result: UnitType.PALADIN,
    ingredients: [UnitType.INFANTRY, UnitType.TANK],
    minLevel: 3,
    cost: 500
  },
  {
    id: 'sniper',
    result: UnitType.SNIPER,
    ingredients: [UnitType.ARCHER, UnitType.SPEARMAN],
    minLevel: 3,
    cost: 500
  },
  {
    id: 'void_walker',
    result: UnitType.VOID_WALKER,
    ingredients: [UnitType.MAGE, UnitType.GOLEM],
    minLevel: 3,
    cost: 500
  }
];