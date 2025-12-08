import { Entity, UnitStats, Side, Vector2, UnitType, ArtifactType } from "../types";
import { UNIT_BASE_STATS, HP_MULTIPLIER, DAMAGE_MULTIPLIER, GRID_COLS, GRID_ROWS } from "../constants";

export const getUnitStats = (
  type: UnitType, 
  level: number, 
  techLevel: number = 1,
  artifactLevels: Partial<Record<ArtifactType, number>> = {}
): UnitStats => {
  const base = UNIT_BASE_STATS[type];
  // Tech multiplier: +20% stats per tech level above 1
  const techMult = 1 + ((techLevel - 1) * 0.2);

  // Artifact Multipliers
  const swordLvl = artifactLevels[ArtifactType.HOLY_SWORD] || 0;
  const damageMult = 1 + (swordLvl * 0.05);

  const shieldLvl = artifactLevels[ArtifactType.ANCIENT_SHIELD] || 0;
  const hpMult = 1 + (shieldLvl * 0.05);

  const drumLvl = artifactLevels[ArtifactType.WAR_DRUMS] || 0;
  const atkSpeedMult = 1 + (drumLvl * 0.03);

  const cloakLvl = artifactLevels[ArtifactType.WIND_CLOAK] || 0;
  const moveSpeedMult = 1 + (cloakLvl * 0.05);

  return {
    ...base,
    hp: Math.floor(base.hp * Math.pow(HP_MULTIPLIER, level - 1) * techMult * hpMult),
    damage: Math.floor(base.damage * Math.pow(DAMAGE_MULTIPLIER, level - 1) * techMult * damageMult),
    attackSpeed: Number((base.attackSpeed * atkSpeedMult).toFixed(2)),
    moveSpeed: Number((base.moveSpeed * moveSpeedMult).toFixed(2)),
    range: base.range,
    color: base.color,
    icon: base.icon
  };
};

export const createEntity = (
  type: UnitType, 
  level: number, 
  side: Side, 
  gridX: number, 
  gridY: number,
  techLevel: number = 1,
  artifactLevels: Partial<Record<ArtifactType, number>> = {}
): Entity => {
  const stats = getUnitStats(type, level, techLevel, artifactLevels);
  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    level,
    side,
    gridX,
    gridY,
    x: gridX,
    y: gridY,
    hp: stats.hp,
    maxHp: stats.hp,
    lastAttackTime: 0,
    targetId: null,
    state: 'IDLE',
    facingRight: side === Side.PLAYER 
  };
};

export const getDistance = (e1: Entity, e2: Entity): number => {
  const dx = e1.x - e2.x;
  const dy = e1.y - e2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const findNearestTarget = (me: Entity, allEntities: Entity[]): Entity | null => {
  let nearest: Entity | null = null;
  let minDist = Infinity;

  for (const other of allEntities) {
    if (other.side !== me.side && other.hp > 0) {
      const dist = getDistance(me, other);
      if (dist < minDist) {
        minDist = dist;
        nearest = other;
      }
    }
  }
  return nearest;
};