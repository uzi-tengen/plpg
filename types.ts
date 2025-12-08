export enum UnitType {
  INFANTRY = 'INFANTRY',
  ARCHER = 'ARCHER',
  TANK = 'TANK',
  SPEARMAN = 'SPEARMAN',
  MAGE = 'MAGE',
  ASSASSIN = 'ASSASSIN',
  GOLEM = 'GOLEM',
  DRAGON = 'DRAGON',
  // Mythic Units
  PALADIN = 'PALADIN',
  SNIPER = 'SNIPER',
  VOID_WALKER = 'VOID_WALKER'
}

export enum UnitTier {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
  MYTHIC = 'MYTHIC'
}

export enum Side {
  PLAYER = 'PLAYER',
  ENEMY = 'ENEMY'
}

export enum Difficulty {
  NORMAL = 'NORMAL',
  HARD = 'HARD',
  HELL = 'HELL'
}

export enum GamePhase {
  DIFFICULTY_SELECT = 'DIFFICULTY_SELECT',
  PREPARATION = 'PREPARATION',
  BATTLE = 'BATTLE',
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT',
  GAME_CLEAR = 'GAME_CLEAR'
}

export enum ArtifactType {
  HOLY_SWORD = 'HOLY_SWORD',      // Damage +5%
  ANCIENT_SHIELD = 'ANCIENT_SHIELD', // HP +5%
  WAR_DRUMS = 'WAR_DRUMS',        // Attack Speed +3%
  WIND_CLOAK = 'WIND_CLOAK',      // Move Speed +5%
  MIDAS_TOUCH = 'MIDAS_TOUCH',    // Gold Gain +10%
}

export enum GlobalTechType {
  CAPACITY = 'CAPACITY', // Increase Max Unit Count
  LUCK = 'LUCK',         // Increase High Tier Summon Rate
  MYTHIC_MASTERY = 'MYTHIC_MASTERY', // Boost Mythic Unit Stats
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface UnitStats {
  tier: UnitTier;
  hp: number;
  damage: number;
  attackSpeed: number; // Attacks per second
  range: number; // Grid cells
  moveSpeed: number; // Grid cells per second
  color: string;
  icon: string;
}

export interface Entity {
  id: string;
  type: UnitType;
  side: Side;
  level: number;
  
  // Grid position (integers) - used during PREPARATION
  gridX: number;
  gridY: number;

  // Real-time position (floats) - used during BATTLE
  x: number;
  y: number;

  hp: number;
  maxHp: number;
  lastAttackTime: number;
  targetId: string | null;
  state: 'IDLE' | 'MOVING' | 'ATTACKING' | 'DEAD';
  facingRight: boolean;
}

export interface LevelConfig {
  levelNumber: number;
  enemies: Omit<Entity, 'id' | 'hp' | 'maxHp' | 'lastAttackTime' | 'targetId' | 'state' | 'facingRight'>[];
}

export interface GameStats {
  kills: number;
  merges: number;
  wins: number;
  summons: number;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  type: keyof GameStats;
  target: number;
  reward: number;
  icon: string;
}

export interface SynthesisRecipe {
  id: string;
  result: UnitType;
  ingredients: UnitType[]; // Array of 2 types
  minLevel: number;
  cost: number;
}