import React, { useMemo } from 'react';
import { Entity, Side, UnitTier } from '../types';
import { UNIT_BASE_STATS, ENEMY_COLOR, TIER_INFO } from '../constants';

interface UnitProps {
  entity: Entity;
  tileSize: number;
  style?: React.CSSProperties;
  isDragging?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  showHealth?: boolean;
}

const Unit: React.FC<UnitProps> = ({ entity, tileSize, style, isDragging, onMouseDown, onTouchStart, showHealth }) => {
  const stats = UNIT_BASE_STATS[entity.type];
  const tierInfo = TIER_INFO[stats.tier];
  
  // Calculate visual properties
  const isEnemy = entity.side === Side.ENEMY;
  const bgColor = isEnemy ? ENEMY_COLOR : stats.color;
  
  // Size relative to tile
  const size = tileSize * 0.9;
  
  // Level Stars
  const stars = useMemo(() => {
    return Array.from({ length: entity.level }).map((_, i) => (
      <span key={i} className="text-[10px] text-yellow-300 drop-shadow-md">★</span>
    ));
  }, [entity.level]);

  // Health Percentage
  const hpPercent = (entity.hp / entity.maxHp) * 100;

  // Visual Direction
  const rotation = entity.facingRight ? 'scale-x-[-1]' : 'scale-x-[1]';

  // Border Color based on Tier (Only for Player)
  const borderColorClass = isEnemy 
    ? 'border-red-800' 
    : tierInfo.borderColor;

  // Glow effect for high tiers
  let glowClass = 'shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]';
  
  if (!isEnemy) {
      if (stats.tier === UnitTier.MYTHIC) {
          glowClass = 'shadow-[0_0_20px_rgba(239,68,68,0.9),0_0_40px_rgba(239,68,68,0.5)] ring-2 ring-red-400 animate-pulse z-20';
      } else if (stats.tier === UnitTier.LEGENDARY) {
          glowClass = 'shadow-[0_0_15px_rgba(234,179,8,0.8)]';
      } else if (stats.tier === UnitTier.EPIC) {
          glowClass = 'shadow-[0_0_10px_rgba(168,85,247,0.6)]';
      }
  }

  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      data-grid-x={entity.gridX}
      data-grid-y={entity.gridY}
      data-unit-id={entity.id}
      data-side={entity.side}
      className={`absolute transition-transform will-change-transform ${isDragging ? 'z-50 cursor-grabbing' : 'z-10 cursor-grab'} ${entity.state === 'DEAD' ? 'opacity-0 scale-0' : 'opacity-100'}`}
      style={{
        width: size,
        height: size,
        ...style, // Position injected from parent
        transition: isDragging ? 'none' : 'left 0.1s linear, top 0.1s linear, transform 0.2s ease, opacity 0.3s ease',
      }}
    >
      {/* 3D Base Shadow */}
      <div className="absolute top-1 left-0 w-full h-full bg-black/40 rounded-lg transform translate-y-1 scale-95 blur-sm pointer-events-none" />

      {/* Unit Body */}
      <div 
        className={`
          relative w-full h-full rounded-xl 
          border-2 ${borderColorClass}
          flex flex-col items-center justify-center select-none 
          ${glowClass}
          ${bgColor} 
          ${entity.state === 'ATTACKING' ? 'animate-pop' : ''}
        `}
      >
        
        {/* Unit Icon/Sprite */}
        <div className={`text-2xl filter drop-shadow-lg transform transition-transform duration-200 ${rotation} pointer-events-none`}>
          {stats.icon}
        </div>
        
        {/* Count/Level Indicators (Top right badge style) */}
        <div className="absolute -top-2 -right-2 bg-slate-800 border border-white/20 rounded-md px-1 min-w-[20px] h-5 flex items-center justify-center shadow-lg overflow-hidden pointer-events-none">
           <div className="flex space-x-[-2px]">{stars}</div>
        </div>

        {/* Level Number (Bottom Left) */}
        <div className="absolute -bottom-1 -left-1 bg-white/20 text-[10px] font-bold px-1.5 rounded-sm backdrop-blur-sm pointer-events-none">
          Lv.{entity.level}
        </div>

        {/* Health Bar (Battle Only) */}
        {showHealth && (
          <div className="absolute -bottom-3 w-[110%] h-2 bg-gray-800 rounded-full overflow-hidden border border-black/50 shadow-sm z-20 pointer-events-none">
            <div 
              className={`h-full transition-all duration-200 ${isEnemy ? 'bg-red-500' : 'bg-green-400'}`}
              style={{ width: `${Math.max(0, hpPercent)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Unit;