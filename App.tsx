import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GamePhase, Entity, Side, UnitType, ArtifactType, UnitTier, GameStats, GlobalTechType, SynthesisRecipe, Difficulty } from './types';
import { GRID_ROWS, GRID_COLS, TILE_SIZE, RECRUIT_COST, RECRUIT_COST_INCREASE, UNIT_BASE_STATS, ARTIFACT_INFO, ARTIFACT_COST_BASE, ARTIFACT_COST_INCREASE, TIER_INFO, ACHIEVEMENTS, TECH_COST_BASE, TECH_COST_INCREASE, GLOBAL_TECH_INFO, BASE_UNIT_CAP, UNIT_CAP_PER_LEVEL, UNIT_NAMES, SYNTHESIS_RECIPES, DIFFICULTY_SETTINGS } from './constants';
import { createEntity, findNearestTarget, getDistance, getUnitStats } from './services/gameLogic';
import { generateLevel } from './services/geminiService';
import Unit from './components/Unit';
import StoreCard from './components/StoreCard';
import UpgradeCard from './components/UpgradeCard';
import ArtifactCard from './components/ArtifactCard';
import AltarCard from './components/AltarCard';
import { Coins, Swords, RefreshCw, Trophy, Skull, Gift, Activity, HelpCircle, X, MousePointer2, Shield, Crosshair, Percent, Heart, Zap, Move, Target, ShoppingCart, Package, Gem, Lock, Sparkles, Crown, Medal, Users, Clover, Trash2, CheckCircle2, Scroll, Flame, AlertTriangle } from 'lucide-react';

// Helper to determine difficulty rank
const getDifficultyRank = (d: Difficulty): number => {
    switch (d) {
        case Difficulty.NORMAL: return 0;
        case Difficulty.HARD: return 1;
        case Difficulty.HELL: return 2;
        default: return 0;
    }
};

const App: React.FC = () => {
  // --- State ---
  const [phase, setPhase] = useState<GamePhase>(GamePhase.DIFFICULTY_SELECT);
  
  // Unlock Progression State
  const [maxUnlockedDifficulty, setMaxUnlockedDifficulty] = useState<Difficulty>(() => {
      const saved = localStorage.getItem('aow_max_diff');
      // Validate saved value
      if (saved === Difficulty.HARD || saved === Difficulty.HELL) return saved;
      return Difficulty.NORMAL;
  });

  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  const [level, setLevel] = useState(1);
  const [coins, setCoins] = useState(2000);
  const [recruitCost, setRecruitCost] = useState(RECRUIT_COST);

  // Specific Unit Costs State
  const [unitCosts, setUnitCosts] = useState<Record<UnitType, number>>(() => {
    const costs: any = {};
    Object.values(UnitType).forEach(type => {
        const stats = UNIT_BASE_STATS[type];
        const tierMult = TIER_INFO[stats.tier].costMult;
        costs[type] = Math.floor(RECRUIT_COST * tierMult);
    });
    return costs;
  });
  
  // Game Stats for Achievements
  const [gameStats, setGameStats] = useState<GameStats>({
    kills: 0,
    merges: 0,
    wins: 0,
    summons: 0
  });
  
  // Claimed Achievements Tracking
  const [claimedAchievements, setClaimedAchievements] = useState<Set<string>>(new Set());

  // Global Tech (Capacity, Luck, Mythic Mastery)
  const [globalTech, setGlobalTech] = useState<Record<GlobalTechType, number>>({
      [GlobalTechType.CAPACITY]: 1,
      [GlobalTechType.LUCK]: 1,
      [GlobalTechType.MYTHIC_MASTERY]: 1,
  });

  // Tech / Upgrades - Initialize all types
  const [techLevels, setTechLevels] = useState<Record<UnitType, number>>(() => {
    const initialTech: any = {};
    Object.values(UnitType).forEach(t => initialTech[t] = 1);
    return initialTech;
  });

  // Artifacts
  const [artifactLevels, setArtifactLevels] = useState<Record<ArtifactType, number>>({
    [ArtifactType.HOLY_SWORD]: 0,
    [ArtifactType.ANCIENT_SHIELD]: 0,
    [ArtifactType.WAR_DRUMS]: 0,
    [ArtifactType.WIND_CLOAK]: 0,
    [ArtifactType.MIDAS_TOUCH]: 0,
  });
  const [artifactCost, setArtifactCost] = useState(ARTIFACT_COST_BASE);

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isArtifactModalOpen, setIsArtifactModalOpen] = useState(false);
  const [isAltarModalOpen, setIsAltarModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  
  // Shop State
  const [shopTab, setShopTab] = useState<UnitTier>(UnitTier.COMMON);

  const [selectedUnit, setSelectedUnit] = useState<Entity | null>(null);

  // Notifications
  const [toast, setToast] = useState<{msg: string, subMsg?: string, color: string, icon: React.ReactNode} | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [lastSupplyTime, setLastSupplyTime] = useState(Date.now());
  const [canClaimSupply, setCanClaimSupply] = useState(false);

  // Entities
  const [entities, setEntities] = useState<Entity[]>([]);
  const entitiesRef = useRef<Entity[]>([]);

  // Dragging System
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{x: number, y: number} | null>(null); // Screen coordinates for visual
  const [hoveredGrid, setHoveredGrid] = useState<{x: number, y: number} | null>(null);
  
  const dragOffset = useRef<{x: number, y: number}>({ x: 0, y: 0 }); // Offset from mouse/touch to unit corner
  const dragStartPos = useRef<{x: number, y: number}>({ x: 0, y: 0 }); // To detect click vs drag
  const gridRef = useRef<HTMLDivElement>(null);

  // UI
  const [loadingLevel, setLoadingLevel] = useState(false);
  const [justUnlockedDifficulty, setJustUnlockedDifficulty] = useState<string | null>(null);

  // Computed Values
  const maxUnitCap = BASE_UNIT_CAP + (globalTech[GlobalTechType.CAPACITY] - 1) * UNIT_CAP_PER_LEVEL;

  // Check for claimable achievements
  const hasClaimableAchievements = ACHIEVEMENTS.some(ach => {
      const current = gameStats[ach.type];
      return current >= ach.target && !claimedAchievements.has(ach.id);
  });

  // --- Helpers ---
  // Helper to determine the tech level for a player unit (Standard Tech vs Global Mythic Tech)
  const getPlayerTechLevel = useCallback((type: UnitType) => {
      const stats = UNIT_BASE_STATS[type];
      if (stats.tier === UnitTier.MYTHIC) {
          return globalTech[GlobalTechType.MYTHIC_MASTERY];
      }
      return techLevels[type];
  }, [globalTech, techLevels]);

  // --- Sound Effects (Placeholder) ---
  const playSound = (type: 'pop' | 'sword' | 'win' | 'coin' | 'gacha') => {
    // In a real app, use Audio API
  };

  const showToast = (msg: string, subMsg: string, color: string, icon: React.ReactNode) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ msg, subMsg, color, icon });
    toastTimer.current = window.setTimeout(() => setToast(null), 2000);
  };

  // --- Initialization ---
  
  // Save difficulty progress
  useEffect(() => {
      localStorage.setItem('aow_max_diff', maxUnlockedDifficulty);
  }, [maxUnlockedDifficulty]);

  // Supply Drop Timer
  useEffect(() => {
    const interval = setInterval(() => {
        // 30 seconds for supply
        if (!canClaimSupply && Date.now() - lastSupplyTime > 30000 && phase !== GamePhase.DIFFICULTY_SELECT) { 
            setCanClaimSupply(true);
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastSupplyTime, canClaimSupply, phase]);

  const getGoldMultiplier = () => {
      const midasLvl = artifactLevels[ArtifactType.MIDAS_TOUCH] || 0;
      return 1 + (midasLvl * 0.10);
  };

  const claimSupply = () => {
      const baseAmount = 100 + (level * 10);
      const mult = getGoldMultiplier();
      const finalAmount = Math.floor(baseAmount * mult);
      
      setCoins(prev => prev + finalAmount);
      setLastSupplyTime(Date.now());
      setCanClaimSupply(false);
      playSound('coin');
      showToast("보급품 도착!", `+${finalAmount} 코인 (유물 +${Math.round((mult-1)*100)}%)`, "bg-blue-500", <Gift size={24}/>);
  };

  // Sync Ref
  useEffect(() => {
    if (phase === GamePhase.PREPARATION) {
      entitiesRef.current = entities;
    }
  }, [entities, phase]);

  const loadLevel = async (lvl: number, diff: Difficulty) => {
    setLoadingLevel(true);
    setSelectedUnit(null);
    // Reset positions of existing player units for the new battle & apply new tech/artifact stats
    const playerUnits = entitiesRef.current
      .filter(e => e.side === Side.PLAYER)
      .map(e => {
         // Apply CURRENT stats
         const techLvl = getPlayerTechLevel(e.type);
         const stats = getUnitStats(e.type, e.level, techLvl, artifactLevels);
         return {
           ...e,
           x: e.gridX,
           y: e.gridY,
           hp: stats.hp,
           maxHp: stats.hp,
           targetId: null,
           state: 'IDLE',
           facingRight: true
         } as Entity;
      });

    try {
      const config = await generateLevel(lvl, diff);
      // Enemy tech level logic. Reduced scaling (divisor 5 -> 10) for ease
      const diffSetting = DIFFICULTY_SETTINGS[diff];
      const enemyTechLevel = Math.max(1, Math.ceil(lvl / 10 * diffSetting.enemyMult));
      
      const enemyUnits = config.enemies.map(e => 
        createEntity(e.type as UnitType, e.level, Side.ENEMY, e.gridX, e.gridY, enemyTechLevel, {})
      );
      
      const nextEntities = [...playerUnits, ...enemyUnits];
      setEntities(nextEntities);
      entitiesRef.current = nextEntities;
      setPhase(GamePhase.PREPARATION);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLevel(false);
    }
  };

  // Centralized function to reset run-specific data
  const resetRunData = () => {
      // Emergency stop battle loop to prevent "Defeat" logic from triggering on empty entities
      cancelAnimationFrame(battleLoopId.current);

      setLevel(1);
      setCoins(2000);
      setRecruitCost(RECRUIT_COST);
      
      // Reset Unit Costs
      const initialCosts: any = {};
      Object.values(UnitType).forEach(type => {
          const stats = UNIT_BASE_STATS[type];
          const tierMult = TIER_INFO[stats.tier].costMult;
          initialCosts[type] = Math.floor(RECRUIT_COST * tierMult);
      });
      setUnitCosts(initialCosts);

      setGameStats({ kills: 0, merges: 0, wins: 0, summons: 0 }); // Reset run stats
      
      setGlobalTech({ 
          [GlobalTechType.CAPACITY]: 1, 
          [GlobalTechType.LUCK]: 1,
          [GlobalTechType.MYTHIC_MASTERY]: 1
      });

      const initialTech: any = {};
      Object.values(UnitType).forEach(t => initialTech[t] = 1);
      setTechLevels(initialTech);

      setArtifactLevels({
          [ArtifactType.HOLY_SWORD]: 0,
          [ArtifactType.ANCIENT_SHIELD]: 0,
          [ArtifactType.WAR_DRUMS]: 0,
          [ArtifactType.WIND_CLOAK]: 0,
          [ArtifactType.MIDAS_TOUCH]: 0,
      });
      setArtifactCost(ARTIFACT_COST_BASE);
      
      setEntities([]);
      entitiesRef.current = [];
  };

  const startGame = (diff: Difficulty) => {
      setDifficulty(diff);
      resetRunData();
      loadLevel(1, diff);
  };

  const nextLevel = () => {
    const diffSetting = DIFFICULTY_SETTINGS[difficulty];
    if (level >= diffSetting.maxLevel) {
        // Handle Unlocking
        let unlockedNext = false;
        if (difficulty === Difficulty.NORMAL && getDifficultyRank(maxUnlockedDifficulty) < getDifficultyRank(Difficulty.HARD)) {
            setMaxUnlockedDifficulty(Difficulty.HARD);
            setJustUnlockedDifficulty('하드');
            unlockedNext = true;
        } else if (difficulty === Difficulty.HARD && getDifficultyRank(maxUnlockedDifficulty) < getDifficultyRank(Difficulty.HELL)) {
            setMaxUnlockedDifficulty(Difficulty.HELL);
            setJustUnlockedDifficulty('지옥');
            unlockedNext = true;
        } else {
            setJustUnlockedDifficulty(null);
        }

        setPhase(GamePhase.GAME_CLEAR);
    } else {
        setLevel(prev => prev + 1);
        loadLevel(level + 1, difficulty);
    }
  };

  const retryLevel = () => {
    loadLevel(level, difficulty);
  };

  const handleModeReset = () => {
    if (window.confirm(`${DIFFICULTY_SETTINGS[difficulty].name} 난이도를 처음부터 다시 시작하시겠습니까? (보유 코인 및 성장 초기화)`)) {
        // 1. Stop Battle
        cancelAnimationFrame(battleLoopId.current);
        
        // 2. Reset Data
        resetRunData();
        
        // 3. Force Phase Change immediately to stop any render loops referencing old data
        setPhase(GamePhase.PREPARATION);

        // 4. Reload Level (Async) - Timeout ensures state updates have settled
        setTimeout(() => {
            loadLevel(1, difficulty);
        }, 0);
        
        setIsHelpModalOpen(false);
        showToast("난이도 초기화", `${DIFFICULTY_SETTINGS[difficulty].name} 모드 재시작`, "bg-orange-500", <RefreshCw size={24}/>);
    }
  };

  const handleFullReset = () => {
    if (window.confirm("정말로 모든 데이터를 삭제하시겠습니까? 해금된 난이도와 업적 정보가 모두 사라지며 타이틀로 돌아갑니다.")) {
        // 1. Stop Battle
        cancelAnimationFrame(battleLoopId.current);
        
        // 2. Clear Persistence
        localStorage.removeItem('aow_max_diff');
        setMaxUnlockedDifficulty(Difficulty.NORMAL);
        setClaimedAchievements(new Set()); 
        
        // 3. Reset Data
        resetRunData(); 
        
        // 4. Change Phase
        setPhase(GamePhase.DIFFICULTY_SELECT);
        setIsHelpModalOpen(false);
        showToast("데이터 삭제 완료", "모든 정보가 초기화되었습니다.", "bg-red-600", <Trash2 size={24}/>);
    }
  };

  // ... (Keep handleSynthesize, applyTechUpgrade, applyGlobalUpgrade, handleBuyArtifact, handleSellUnit, claimAchievement logic as is)
  const handleSynthesize = (recipe: SynthesisRecipe) => {
    // 1. Check Cost
    if (coins < recipe.cost) {
      showToast("비용 부족", "코인이 부족합니다.", "bg-gray-600", <Lock size={24}/>);
      return;
    }

    // 2. Check Ingredients (Fresh search)
    const playerEntities = entities.filter(e => e.side === Side.PLAYER);
    
    // Find first ingredient
    const ing1 = playerEntities.find(e => e.type === recipe.ingredients[0] && e.level >= recipe.minLevel);
    
    // Find second ingredient (ensure different ID)
    const ing2 = ing1 
        ? playerEntities.find(e => e.type === recipe.ingredients[1] && e.level >= recipe.minLevel && e.id !== ing1.id) 
        : null;

    if (ing1 && ing2) {
        // No confirm dialog - fast action
        setCoins(c => c - recipe.cost);
        
        setEntities(prev => {
            // Re-validate inside setter to ensure ingredients exist in current state
            const stillHasIng1 = prev.some(e => e.id === ing1.id);
            const stillHasIng2 = prev.some(e => e.id === ing2.id);

            // If for some reason they don't exist, we just return previous state (and coin is lost - simple game limitation)
            if (!stillHasIng1 || !stillHasIng2) return prev; 

            const withoutIngredients = prev.filter(e => e.id !== ing1.id && e.id !== ing2.id);
            
            // Create new unit at position of first ingredient
            // For Mythic Units, use Global Tech Level
            const newUnit = createEntity(
                recipe.result, 
                1, 
                Side.PLAYER, 
                ing1.gridX, 
                ing1.gridY, 
                getPlayerTechLevel(recipe.result), 
                artifactLevels
            );
            
            return [...withoutIngredients, newUnit];
        });

        playSound('gacha');
        showToast("신화 유닛 강림!", `${UNIT_NAMES[recipe.result]} 소환 완료`, "bg-red-600", <span className="text-2xl">⚡</span>);
        setIsAltarModalOpen(false);

    } else {
      showToast("재료 부족", `${recipe.minLevel}레벨 이상의 재료가 부족합니다.`, "bg-gray-600", <X size={24}/>);
    }
  };

  const applyTechUpgrade = (type: UnitType) => {
    const lvl = techLevels[type];
    const cost = TECH_COST_BASE + (lvl - 1) * TECH_COST_INCREASE; 
    
    if (coins >= cost) {
        setCoins(c => c - cost);
        setTechLevels(prev => {
            const newLevel = prev[type] + 1;
            const newTechs = { ...prev, [type]: newLevel };
            // Update existing entities visuals/hp immediately
            setEntities(currentEntities => 
                currentEntities.map(ent => {
                    if (ent.side === Side.PLAYER && ent.type === type) {
                         const newStats = getUnitStats(ent.type, ent.level, newLevel, artifactLevels);
                         return { ...ent, maxHp: newStats.hp, hp: newStats.hp };
                    }
                    return ent;
                })
            );
            return newTechs;
        });
        playSound('coin');
    }
  };

  const applyGlobalUpgrade = (type: GlobalTechType) => {
      const info = GLOBAL_TECH_INFO[type];
      const lvl = globalTech[type];
      
      if (lvl >= info.maxLevel) return;

      const cost = info.baseCost + (lvl - 1) * info.costInc;
      
      if (coins >= cost) {
          setCoins(c => c - cost);
          setGlobalTech(prev => {
              const newLvl = prev[type] + 1;
              const newGlobalTech = { ...prev, [type]: newLvl };
              
              // If it's Mythic Mastery, update stats of existing mythic units immediately
              if (type === GlobalTechType.MYTHIC_MASTERY) {
                  setEntities(currentEntities => 
                    currentEntities.map(ent => {
                        const stats = UNIT_BASE_STATS[ent.type];
                        if (ent.side === Side.PLAYER && stats.tier === UnitTier.MYTHIC) {
                             const newStats = getUnitStats(ent.type, ent.level, newLvl, artifactLevels);
                             return { ...ent, maxHp: newStats.hp, hp: newStats.hp };
                        }
                        return ent;
                    })
                );
              }
              
              return newGlobalTech;
          });
          playSound('coin');
          showToast("연구 완료!", `${info.name} Lv.${lvl + 1}`, "bg-purple-600", <Activity size={24}/>);
      }
  };

  const handleBuyArtifact = () => {
      if (coins >= artifactCost) {
          setCoins(c => c - artifactCost);
          
          const types = Object.values(ArtifactType);
          const randomType = types[Math.floor(Math.random() * types.length)];
          
          setArtifactLevels(prev => {
              const newLvl = (prev[randomType] || 0) + 1;
              const newLevels = { ...prev, [randomType]: newLvl };

              // Update units immediately with new stats
              setEntities(currentEntities => 
                currentEntities.map(ent => {
                    if (ent.side === Side.PLAYER) {
                         // Use helper to get correct tech level
                         const techLvl = getPlayerTechLevel(ent.type);
                         const newStats = getUnitStats(ent.type, ent.level, techLvl, newLevels);
                         // Heal to new max HP if max HP increased
                         return { ...ent, maxHp: newStats.hp, hp: ent.hp + (newStats.hp - ent.maxHp) };
                    }
                    return ent;
                })
            );

              return newLevels;
          });
          
          setArtifactCost(prev => prev + ARTIFACT_COST_INCREASE);
          playSound('gacha');
          
          const info = ARTIFACT_INFO[randomType];
          showToast(`유물 획득!`, `${info.name} (Lv.${(artifactLevels[randomType] || 0) + 1})`, "bg-yellow-600", <span className="text-2xl">{info.icon}</span>);
      } else {
          showToast("자금 부족", "코인이 부족합니다.", "bg-gray-600", <Lock size={24}/>);
      }
  };
  
  const handleSellUnit = () => {
      if (!selectedUnit || selectedUnit.side !== Side.PLAYER) return;
      
      const stats = UNIT_BASE_STATS[selectedUnit.type];
      const tierInfo = TIER_INFO[stats.tier];
      
      // Calculate value roughly: Current Recruit Cost * Tier Multiplier * 2^(Level-1) * 0.5 (50% Refund)
      // We use current recruitCost to make selling relevant to current economy, but halve it to prevent exploits.
      // Adjusted cost multiplier for selling logic to match new buying logic (1.2 instead of 1.5)
      const baseValue = Math.floor(recruitCost * tierInfo.costMult);
      const totalValue = baseValue * Math.pow(2, selectedUnit.level - 1);
      const refund = Math.floor(totalValue * 0.2); // Reduced from 0.5 to 0.2

      setCoins(prev => prev + refund);
      setEntities(prev => prev.filter(e => e.id !== selectedUnit.id));
      
      playSound('coin');
      showToast("유닛 판매", `+${refund} 코인`, "bg-yellow-600", <Coins size={24}/>);
      setSelectedUnit(null);
  };

  const claimAchievement = (achId: string, reward: number) => {
      if (claimedAchievements.has(achId)) return;
      
      setCoins(prev => prev + reward);
      setClaimedAchievements(prev => {
          const next = new Set(prev);
          next.add(achId);
          return next;
      });
      
      playSound('win');
      showToast("업적 달성!", `보상: ${reward} 코인`, "bg-green-600", <Medal size={24}/>);
  };

  // --- Battle Logic ---

  const lastTimeRef = useRef<number>(0);
  const battleLoopId = useRef<number>(0);

  const battleTick = useCallback((timestamp: number) => {
    if (phase !== GamePhase.BATTLE) return;

    const dt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;
    const safeDt = Math.min(dt, 0.1);

    const activeEntities = entitiesRef.current.map(e => ({ ...e })); // Shallow copy for mutation
    let playerAlive = false;
    let enemyAlive = false;
    let somethingChanged = false;
    let newKills = 0;

    // 1. Check Aliveness
    activeEntities.forEach(e => {
      if (e.hp > 0) {
        if (e.side === Side.PLAYER) playerAlive = true;
        if (e.side === Side.ENEMY) enemyAlive = true;
      } else {
        if (e.state !== 'DEAD') {
          e.state = 'DEAD';
          if (e.side === Side.ENEMY) newKills++;
          somethingChanged = true;
        }
      }
    });

    if (newKills > 0) {
        setGameStats(prev => ({ ...prev, kills: prev.kills + newKills }));
    }

    // 2. Logic Update
    if (playerAlive && enemyAlive) {
      activeEntities.forEach(entity => {
        if (entity.hp <= 0) return;

        // Determine Tech & Artifacts
        const myTech = entity.side === Side.PLAYER 
            ? getPlayerTechLevel(entity.type) 
            : Math.max(1, Math.ceil(level / 5));
            
        const myArtifacts = entity.side === Side.PLAYER ? artifactLevels : {};

        const stats = getUnitStats(entity.type, entity.level, myTech, myArtifacts as any);
        
        // Find Target
        const currentTarget = entity.targetId ? activeEntities.find(e => e.id === entity.targetId && e.hp > 0) : null;
        
        if (!currentTarget) {
          const newTarget = findNearestTarget(entity, activeEntities);
          if (newTarget) {
            entity.targetId = newTarget.id;
          } else {
             entity.state = 'IDLE';
             return; // No targets left
          }
        }

        const target = activeEntities.find(e => e.id === entity.targetId);
        if (target) {
            // Face target
            entity.facingRight = target.x > entity.x;

            const dist = getDistance(entity, target);
            if (dist <= stats.range) {
                // ATTACK
                if (entity.state !== 'ATTACKING') {
                    entity.state = 'ATTACKING';
                    somethingChanged = true;
                }
                
                if (timestamp - entity.lastAttackTime > (1000 / stats.attackSpeed)) {
                    // Hit
                    target.hp -= stats.damage;
                    entity.lastAttackTime = timestamp;
                    somethingChanged = true;
                }
            } else {
                // MOVE
                if (entity.state !== 'MOVING') {
                    entity.state = 'MOVING';
                    somethingChanged = true;
                }
                
                const moveSpeed = stats.moveSpeed * safeDt;
                const dx = target.x - entity.x;
                const dy = target.y - entity.y;
                const len = Math.sqrt(dx*dx + dy*dy);
                
                if (len > 0) {
                    entity.x += (dx / len) * moveSpeed;
                    entity.y += (dy / len) * moveSpeed;
                }

                // Separation boids
                activeEntities.forEach(other => {
                    if (entity.id !== other.id && other.hp > 0) {
                        const d = getDistance(entity, other);
                        if (d < 0.6) {
                            const pushX = entity.x - other.x;
                            const pushY = entity.y - other.y;
                            entity.x += pushX * 3 * safeDt;
                            entity.y += pushY * 3 * safeDt;
                        }
                    }
                });
                
                somethingChanged = true;
            }
        }
      });
    }

    entitiesRef.current = activeEntities;
    setEntities(activeEntities);

    // 3. Phase Transition
    if (!playerAlive && !enemyAlive) {
       // Draw
       setPhase(GamePhase.DEFEAT);
    } else if (!playerAlive) {
       setPhase(GamePhase.DEFEAT);
    } else if (!enemyAlive) {
       // Loot
       const baseLoot = 150 + (level * 50);
       const mult = getGoldMultiplier();
       setCoins(c => c + Math.floor(baseLoot * mult));
       setGameStats(prev => ({ ...prev, wins: prev.wins + 1 }));
       setPhase(GamePhase.VICTORY);
    } else {
       battleLoopId.current = requestAnimationFrame(battleTick);
    }

  }, [phase, level, getPlayerTechLevel, artifactLevels]); 

  useEffect(() => {
    if (phase === GamePhase.BATTLE) {
      lastTimeRef.current = performance.now();
      battleLoopId.current = requestAnimationFrame(battleTick);
    }
    return () => cancelAnimationFrame(battleLoopId.current);
  }, [phase, battleTick]);


  // --- Interactions (Merge, Move, Recruit) ---

  const handleBuyUnit = (buyType: UnitType | 'RANDOM' | 'PREMIUM') => {
    // 1. Check Capacity
    const currentPlayerUnitCount = entities.filter(e => e.side === Side.PLAYER).length;
    if (currentPlayerUnitCount >= maxUnitCap) {
        showToast("공간 부족", `최대 유닛 수(${maxUnitCap})에 도달했습니다. 연구소에서 병영을 확장하세요.`, "bg-red-500", <Users size={24}/>);
        return;
    }

    let cost = 0;
    let finalType: UnitType;

    if (buyType === 'RANDOM' || buyType === 'PREMIUM') {
        // Reduced premium multiplier from 5 to 2
        cost = buyType === 'RANDOM' ? recruitCost : recruitCost * 2;
    } else {
        // Specific unit buy
        cost = unitCosts[buyType];
    }

    if (coins >= cost) {
      const availableSpots: {x: number, y: number}[] = [];
      for(let y = GRID_ROWS - 1; y >= Math.floor(GRID_ROWS/2); y--) {
        for(let x = 0; x < GRID_COLS; x++) {
          if (!entities.find(e => e.gridX === x && e.gridY === y && e.hp > 0)) {
            availableSpots.push({x, y});
          }
        }
      }

      if (availableSpots.length > 0) {
        const spot = availableSpots[0];
        
        if (buyType === 'RANDOM') {
            const rand = Math.random();
            const types = Object.values(UnitType);
            
            // Filter by tiers
            const commons = types.filter(t => UNIT_BASE_STATS[t].tier === UnitTier.COMMON);
            const rares = types.filter(t => UNIT_BASE_STATS[t].tier === UnitTier.RARE);
            const epics = types.filter(t => UNIT_BASE_STATS[t].tier === UnitTier.EPIC);
            const legends = types.filter(t => UNIT_BASE_STATS[t].tier === UnitTier.LEGENDARY);

            // Luck Logic
            // Level 1 (Default): 1% Legendary, 9% Epic, 30% Rare, 60% Common
            // Each Luck Level increases Legendary by 0.5%, Epic by 1%, Rare by 2%, Common reduces by remainder.
            const luckLvl = globalTech[GlobalTechType.LUCK] - 1;
            
            const legendProb = 0.01 + (luckLvl * 0.005);
            const epicProb = 0.09 + (luckLvl * 0.01);
            const rareProb = 0.30 + (luckLvl * 0.02);
            // const commonProb = 1 - (legendProb + epicProb + rareProb);

            const legendThreshold = 1 - legendProb;
            const epicThreshold = legendThreshold - epicProb;
            const rareThreshold = epicThreshold - rareProb;

            if (rand > legendThreshold) finalType = legends[Math.floor(Math.random()*legends.length)];
            else if (rand > epicThreshold) finalType = epics[Math.floor(Math.random()*epics.length)];
            else if (rand > rareThreshold) finalType = rares[Math.floor(Math.random()*rares.length)];
            else finalType = commons[Math.floor(Math.random()*commons.length)];

        } else if (buyType === 'PREMIUM') {
            // Premium Gacha: 0% Common, 50% Rare, 40% Epic, 10% Legendary (Base)
            // Luck slightly improves Premium too? Let's just boost Legendary/Epic slightly.
            // +1% Legend per level, +2% Epic per level.
            const luckLvl = globalTech[GlobalTechType.LUCK] - 1;
            const legendProb = 0.10 + (luckLvl * 0.01);
            const epicProb = 0.40 + (luckLvl * 0.02);
            // const rareProb = 1 - legendProb - epicProb;

            const rand = Math.random();
            const types = Object.values(UnitType);
            const rares = types.filter(t => UNIT_BASE_STATS[t].tier === UnitTier.RARE);
            const epics = types.filter(t => UNIT_BASE_STATS[t].tier === UnitTier.EPIC);
            const legends = types.filter(t => UNIT_BASE_STATS[t].tier === UnitTier.LEGENDARY);

            if (rand > (1 - legendProb)) finalType = legends[Math.floor(Math.random()*legends.length)];
            else if (rand > (1 - legendProb - epicProb)) finalType = epics[Math.floor(Math.random()*epics.length)];
            else finalType = rares[Math.floor(Math.random()*rares.length)];
        } else {
            finalType = buyType;
        }

        const newUnit = createEntity(finalType, 1, Side.PLAYER, spot.x, spot.y, getPlayerTechLevel(finalType), artifactLevels);
        
        setCoins(prev => prev - cost);
        
        // Update Costs Logic: Split between Global (Random) and Specific
        if (buyType === 'RANDOM' || buyType === 'PREMIUM') {
            setRecruitCost(prev => prev + RECRUIT_COST_INCREASE);
        } else {
            // Only increase specific unit cost
            setUnitCosts(prev => ({
                ...prev,
                [buyType]: prev[buyType] + 10 
            }));
        }

        setEntities(prev => [...prev, newUnit]);
        setGameStats(prev => ({ ...prev, summons: prev.summons + 1 }));
        playSound('pop');
        
        // Notification
        const stats = UNIT_BASE_STATS[finalType];
        const tierInfo = TIER_INFO[stats.tier];
        
        showToast(
            `${UNIT_NAMES[finalType]} 획득!`, 
            buyType === 'RANDOM' || buyType === 'PREMIUM' ? "랜덤 소환 성공" : "지정 호출 성공", 
            tierInfo.color.replace('text-', 'bg-').replace('400', '600'), // Hacky color conversion
            <span className="text-2xl">{stats.icon}</span>
        );

      } else {
        showToast("공간 부족", "배치할 공간이 없습니다.", "bg-red-500", <X size={24}/>);
      }
    } else {
        showToast("자금 부족", "코인이 부족합니다.", "bg-gray-600", <Coins size={24}/>);
    }
  };

  // --- Drag & Drop Logic ---
  const getGridFromClientPos = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!element) return null;
    const target = element.closest('[data-grid-x]');
    if (!target) return null;
    const gridX = parseInt(target.getAttribute('data-grid-x') || '-1', 10);
    const gridY = parseInt(target.getAttribute('data-grid-y') || '-1', 10);
    if (gridX === -1 || gridY === -1) return null;
    return { gridX, gridY };
  };

  const handleMouseDown = (e: React.MouseEvent, entity: Entity) => {
    if (phase !== GamePhase.PREPARATION) return;
    
    // Enemy selection always allowed on click
    if (entity.side !== Side.PLAYER) {
        setSelectedUnit(entity);
        return;
    }

    e.preventDefault();
    startDrag(e.clientX, e.clientY, e.currentTarget as HTMLElement, entity.id);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
  const onMouseUp = (e: MouseEvent) => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    finishDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent, entity: Entity) => {
    if (phase !== GamePhase.PREPARATION) return;

    if (entity.side !== Side.PLAYER) {
        setSelectedUnit(entity);
        return;
    }

    if(e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY, e.currentTarget as HTMLElement, entity.id);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  };

  const onTouchMove = (e: TouchEvent) => {
    if(e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  };

  const onTouchEnd = (e: TouchEvent) => {
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    const touch = e.changedTouches[0];
    finishDrag(touch.clientX, touch.clientY);
  };

  const startDrag = (clientX: number, clientY: number, element: HTMLElement, entityId: string) => {
    const rect = element.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;
    dragOffset.current = { x: offsetX, y: offsetY };
    dragStartPos.current = { x: clientX, y: clientY }; 
    setDraggingId(entityId);
    setDragPos({ x: clientX - offsetX, y: clientY - offsetY });
  };

  const moveDrag = (clientX: number, clientY: number) => {
    setDragPos({ x: clientX - dragOffset.current.x, y: clientY - dragOffset.current.y });
    const gridPos = getGridFromClientPos(clientX, clientY);
    if (gridPos) {
      setHoveredGrid(gridPos);
    } else {
      setHoveredGrid(null);
    }
  };

  const draggingIdRef = useRef<string | null>(null);
  useEffect(() => { draggingIdRef.current = draggingId; }, [draggingId]);

  const finishDrag = (clientX: number, clientY: number) => {
    const id = draggingIdRef.current;
    if (!id) return;

    const dist = Math.sqrt(Math.pow(clientX - dragStartPos.current.x, 2) + Math.pow(clientY - dragStartPos.current.y, 2));
    setDraggingId(null);
    setDragPos(null);
    setHoveredGrid(null);

    // If dragged less than threshold, consider it not a move (Tap)
    if (dist < 10) { 
        const clickedEntity = entities.find(e => e.id === id);
        if (clickedEntity) {
            setSelectedUnit(clickedEntity);
        }
        return;
    }

    const targetPos = getGridFromClientPos(clientX, clientY);
    if (!targetPos) return; 
    const { gridX, gridY } = targetPos;
    if (gridY < Math.floor(GRID_ROWS/2)) return; 

    setEntities(prev => {
        const meIndex = prev.findIndex(e => e.id === id);
        if (meIndex === -1) return prev;
        const me = prev[meIndex];
        const targetIndex = prev.findIndex(e => e.gridX === gridX && e.gridY === gridY && e.id !== id && e.hp > 0);

        if (targetIndex !== -1) {
            const target = prev[targetIndex];
            if (target.type === me.type && target.level === me.level) {
                const newEntities = [...prev];
                const techLvl = getPlayerTechLevel(target.type);
                const newStats = getUnitStats(target.type, target.level + 1, techLvl, artifactLevels);
                newEntities[targetIndex] = {
                    ...target,
                    level: target.level + 1,
                    maxHp: newStats.hp,
                    hp: newStats.hp
                };
                newEntities.splice(meIndex, 1);
                playSound('pop');
                setGameStats(prev => ({ ...prev, merges: prev.merges + 1 }));
                return newEntities;
            } else {
                const newEntities = [...prev];
                newEntities[meIndex] = { ...me, gridX: target.gridX, gridY: target.gridY, x: target.gridX, y: target.gridY };
                newEntities[targetIndex] = { ...target, gridX: me.gridX, gridY: me.gridY, x: me.gridX, y: me.gridY };
                return newEntities;
            }
        } else {
            const newEntities = [...prev];
            newEntities[meIndex] = { ...me, gridX, gridY, x: gridX, y: gridY };
            return newEntities;
        }
    });
  };

  const renderTiles = () => {
    const tiles = [];
    for(let y = 0; y < GRID_ROWS; y++) {
      for(let x = 0; x < GRID_COLS; x++) {
        const isEnemyTerritory = y < GRID_ROWS / 2;
        const isHovered = hoveredGrid?.x === x && hoveredGrid?.y === y;
        let highlightClass = '';
        if (isHovered && phase === GamePhase.PREPARATION) {
          highlightClass = isEnemyTerritory ? 'bg-red-500/50 shadow-[inset_0_0_20px_rgba(239,68,68,0.8)]' : 'bg-green-500/50 shadow-[inset_0_0_20px_rgba(34,197,94,0.8)]';
        }

        if (selectedUnit && phase === GamePhase.PREPARATION) {
            const tech = selectedUnit.side === Side.PLAYER ? getPlayerTechLevel(selectedUnit.type) : 1;
            const arts = selectedUnit.side === Side.PLAYER ? artifactLevels : {};
            const stats = getUnitStats(selectedUnit.type, selectedUnit.level, tech, arts as any);
            const dist = Math.sqrt(Math.pow(x - selectedUnit.gridX, 2) + Math.pow(y - selectedUnit.gridY, 2));
            
            if (dist <= stats.range) {
                highlightClass = selectedUnit.side === Side.PLAYER 
                    ? 'bg-green-400/30 border-2 border-green-400/50' 
                    : 'bg-red-400/30 border-2 border-red-400/50';
            }
        }

        tiles.push(
          <div key={`${x}-${y}`} data-grid-x={x} data-grid-y={y}
            className={`w-full h-full border border-white/5 transition-colors duration-150 ${isEnemyTerritory ? 'bg-red-900/10' : 'bg-blue-900/10'} ${!isEnemyTerritory && phase === GamePhase.PREPARATION && !draggingId ? 'hover:bg-blue-500/20' : ''} ${highlightClass}`}
          />
        );
      }
    }
    return tiles;
  };

  if (phase === GamePhase.DIFFICULTY_SELECT) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-50"></div>
              
              <div className="z-10 text-center mb-10">
                  <div className="flex justify-center mb-4">
                      <Swords size={64} className="text-yellow-500 animate-pulse" />
                  </div>
                  <h1 className="font-display text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-2 drop-shadow-lg">
                      ART OF WAR
                  </h1>
                  <p className="text-gray-400 text-lg">전략 클론</p>
              </div>

              <div className="z-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-4">
                  {Object.values(Difficulty).map((diff) => {
                      const setting = DIFFICULTY_SETTINGS[diff];
                      const isUnlocked = getDifficultyRank(diff) <= getDifficultyRank(maxUnlockedDifficulty);
                      
                      return (
                          <button
                              key={diff}
                              onClick={() => isUnlocked && startGame(diff)}
                              disabled={!isUnlocked}
                              className={`
                                  relative group border-2 rounded-2xl p-6 flex flex-col items-center justify-center gap-4
                                  transition-all shadow-2xl overflow-hidden
                                  ${isUnlocked 
                                    ? 'bg-slate-800 border-slate-600 hover:border-white hover:scale-105 active:scale-95 cursor-pointer' 
                                    : 'bg-slate-900 border-slate-800 opacity-60 cursor-not-allowed grayscale'}
                              `}
                          >
                              {!isUnlocked && (
                                  <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center">
                                      <Lock size={40} className="text-gray-400" />
                                  </div>
                              )}

                              <div className={`text-4xl font-display ${setting.color} ${isUnlocked ? 'group-hover:scale-110 transition-transform' : ''}`}>
                                  {setting.name}
                              </div>
                              <div className="text-sm text-gray-400 text-center">
                                  {setting.desc}
                              </div>
                              <div className="absolute top-4 right-4 text-xs font-bold bg-black/40 px-2 py-1 rounded text-white">
                                  MAX LV.{setting.maxLevel}
                              </div>
                              
                              {!isUnlocked && (
                                  <div className="text-xs text-red-400 font-bold mt-2">
                                      이전 난이도를 클리어하세요
                                  </div>
                              )}
                          </button>
                      );
                  })}
              </div>
          </div>
      );
  }

  // Handle Game Clear Screen
  if (phase === GamePhase.GAME_CLEAR) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black/95 text-white p-4 z-50">
                <Crown size={80} className="text-yellow-400 mb-6 animate-bounce" />
                <h1 className="font-display text-5xl md:text-6xl text-yellow-500 mb-4 text-center">
                    GAME CLEAR!
                </h1>
                <p className="text-xl text-gray-300 mb-4 text-center max-w-md">
                    축하합니다! <span className={DIFFICULTY_SETTINGS[difficulty].color}>{DIFFICULTY_SETTINGS[difficulty].name}</span> 난이도를 정복했습니다.
                </p>
                
                {justUnlockedDifficulty && (
                    <div className="bg-slate-800 border border-yellow-500/50 p-4 rounded-xl mb-8 flex items-center gap-3 animate-pop">
                        <Lock size={24} className="text-yellow-400" />
                        <span className="text-yellow-100 font-bold text-lg">
                            <span className="text-yellow-400">{justUnlockedDifficulty}</span> 난이도가 해금되었습니다!
                        </span>
                    </div>
                )}

                <div className="flex gap-4">
                    <button 
                        onClick={() => setPhase(GamePhase.DIFFICULTY_SELECT)}
                        className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-xl border-2 border-slate-500 flex items-center gap-2"
                    >
                        <RefreshCw size={20}/> 처음으로
                    </button>
                </div>
          </div>
      );
  }

  return (
    <div className="w-full h-full flex flex-col items-center bg-gray-900 relative">
      
      {/* Toast */}
      {toast && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-[60] animate-pop pointer-events-none w-full max-w-xs px-4">
              <div className={`${toast.color} text-white px-6 py-4 rounded-2xl border-2 border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-4 backdrop-blur-md`}>
                  <div className="bg-white/20 p-2 rounded-xl">{toast.icon}</div>
                  <div>
                      <div className="font-bold text-lg drop-shadow-md">{toast.msg}</div>
                      {toast.subMsg && <div className="text-xs text-white/80">{toast.subMsg}</div>}
                  </div>
              </div>
          </div>
      )}

      {/* Shop Modal */}
      {isShopModalOpen && (
          <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
              <div className="bg-slate-800 border-2 border-blue-500 rounded-2xl w-full max-w-3xl p-4 sm:p-6 shadow-2xl animate-pop overflow-hidden flex flex-col max-h-[95vh]">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ShoppingCart className="text-blue-400" /> 보급소
                    </h2>
                    <button onClick={() => setIsShopModalOpen(false)} className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full">
                        <X size={24}/>
                    </button>
                  </div>

                  {/* Gacha Banners */}
                  <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
                      {/* Normal Gacha */}
                      <button 
                        onClick={() => handleBuyUnit('RANDOM')}
                        className={`
                            relative bg-gradient-to-br from-blue-900 to-slate-900 p-4 rounded-xl border-2 border-blue-500 
                            flex flex-col items-center justify-between hover:scale-[1.02] active:scale-95 transition-all
                            ${coins < recruitCost ? 'opacity-50 grayscale' : ''}
                        `}
                        disabled={coins < recruitCost}
                      >
                          <div className="absolute top-2 right-2 text-blue-300 text-xs border border-blue-500 px-2 rounded-full">일반~영웅</div>
                          <Package className="text-blue-400 mb-2 animate-bounce" size={40} />
                          <div className="text-white font-bold text-lg">일반 보급</div>
                          <div className="text-xs text-blue-200 mb-2">일반 60% / 희귀 30% / 영웅 9%</div>
                          <div className="bg-blue-600 px-4 py-1 rounded-full font-bold text-white flex items-center gap-1">
                              <Coins size={14} className="text-yellow-300"/> {recruitCost}
                          </div>
                      </button>

                      {/* Premium Gacha */}
                      <button 
                        onClick={() => handleBuyUnit('PREMIUM')}
                        className={`
                            relative bg-gradient-to-br from-purple-900 to-slate-900 p-4 rounded-xl border-2 border-purple-500 
                            flex flex-col items-center justify-between hover:scale-[1.02] active:scale-95 transition-all
                            ${coins < recruitCost * 2 ? 'opacity-50 grayscale' : ''}
                        `}
                        disabled={coins < recruitCost * 2}
                      >
                           <div className="absolute top-2 right-2 text-purple-300 text-xs border border-purple-500 px-2 rounded-full flex gap-1 items-center"><Crown size={10}/> 희귀~전설</div>
                          <div className="relative">
                            <Sparkles className="absolute -top-2 -right-4 text-yellow-300 animate-pulse" size={20} />
                            <Gem className="text-purple-400 mb-2 animate-pulse" size={40} />
                          </div>
                          <div className="text-white font-bold text-lg">프리미엄 보급</div>
                          <div className="text-xs text-purple-200 mb-2">희귀 50% / 영웅 40% / 전설 10%</div>
                          <div className="bg-purple-600 px-4 py-1 rounded-full font-bold text-white flex items-center gap-1">
                              <Coins size={14} className="text-yellow-300"/> {recruitCost * 2}
                          </div>
                      </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2 shrink-0">
                      {Object.values(UnitTier).map(tier => {
                          const info = TIER_INFO[tier];
                          const isActive = shopTab === tier;
                          // Don't show Mythic tier in shop
                          if (tier === UnitTier.MYTHIC) return null;

                          return (
                              <button 
                                key={tier}
                                onClick={() => setShopTab(tier)}
                                className={`
                                    px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all flex-1
                                    ${isActive ? 'bg-slate-200 text-slate-900' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}
                                `}
                              >
                                  <span className={info.color}>{info.name}</span>
                              </button>
                          )
                      })}
                  </div>

                  {/* Specific Units List */}
                  <div className="overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4">
                      {Object.values(UnitType)
                        .filter(type => UNIT_BASE_STATS[type].tier === shopTab)
                        .map(type => {
                          const stats = UNIT_BASE_STATS[type];
                          const tierInfo = TIER_INFO[stats.tier];
                          // Specific Summon Cost from state
                          const cost = unitCosts[type];
                          
                          return (
                            <button 
                                key={type}
                                onClick={() => handleBuyUnit(type)}
                                className={`
                                    relative bg-slate-700 p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95
                                    ${tierInfo.borderColor}
                                    ${coins < cost ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-slate-600'}
                                `}
                                disabled={coins < cost}
                            >
                                <div className={`w-12 h-12 rounded-lg ${stats.color} flex items-center justify-center text-2xl shadow-lg border-2 border-white/20`}>
                                    {stats.icon}
                                </div>
                                <div className="font-bold text-white text-sm">
                                    {UNIT_NAMES[type]}
                                </div>
                                <div className="text-yellow-400 font-bold text-xs flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-full border border-yellow-500/30">
                                    <Coins size={10}/> {cost}
                                </div>
                            </button>
                          );
                      })}
                  </div>

              </div>
          </div>
      )}

      {/* Artifact Modal */}
      {isArtifactModalOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-slate-800 border-4 border-yellow-500 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-pop overflow-y-auto max-h-[90vh]">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Gem className="text-yellow-400" /> 고대 유물소
                    </h2>
                    <button onClick={() => setIsArtifactModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white p-1 rounded-lg">
                        <X size={20}/>
                    </button>
                  </div>

                  {/* Draw Section */}
                  <div className="mb-6 bg-slate-900/50 p-4 rounded-xl border border-yellow-500/30 flex flex-col items-center gap-4">
                       <div className="text-center">
                           <div className="text-yellow-200 mb-1">신비로운 유물 상자</div>
                           <div className="text-xs text-gray-400">랜덤한 유물을 획득하거나 강화합니다.</div>
                       </div>
                       <button 
                         onClick={handleBuyArtifact}
                         disabled={coins < artifactCost}
                         className={`
                           w-full py-4 rounded-xl font-bold text-xl shadow-lg border-2 border-yellow-400
                           flex flex-col items-center gap-1 transition-all active:scale-95
                           ${coins >= artifactCost 
                             ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:brightness-110' 
                             : 'bg-gray-700 text-gray-500 cursor-not-allowed border-gray-600'}
                         `}
                       >
                           <span className="flex items-center gap-2">💎 유물 소환</span>
                           <span className="text-sm flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full">
                               <Coins size={14} className="text-yellow-400"/> {artifactCost}
                           </span>
                       </button>
                  </div>

                  {/* Inventory List */}
                  <div className="space-y-3">
                      <div className="text-sm text-gray-400 font-bold px-2">보유 유물</div>
                      {Object.values(ArtifactType).map(type => {
                          const info = ARTIFACT_INFO[type];
                          const lvl = artifactLevels[type] || 0;
                          return (
                              <div key={type} className={`bg-slate-700 p-3 rounded-lg border flex items-center gap-4 ${lvl > 0 ? 'border-yellow-500/50 bg-slate-700' : 'border-slate-600 bg-slate-800 opacity-60'}`}>
                                  <div className="text-3xl bg-slate-900 w-12 h-12 flex items-center justify-center rounded-lg border border-slate-600">
                                      {info.icon}
                                  </div>
                                  <div className="flex-1">
                                      <div className="flex justify-between items-center">
                                          <div className={`font-bold ${lvl > 0 ? 'text-white' : 'text-gray-500'}`}>{info.name}</div>
                                          {lvl > 0 && <div className="text-yellow-400 font-bold text-sm">Lv.{lvl}</div>}
                                      </div>
                                      <div className="text-xs text-gray-400">{info.desc}</div>
                                  </div>
                                  <div className="text-right min-w-[50px]">
                                      <div className="text-green-400 font-bold text-sm">
                                          {lvl > 0 ? `+${(parseFloat(info.perLevel) * lvl)}%` : '-'}
                                      </div>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              </div>
          </div>
      )}
      
      {/* Altar Modal */}
      {isAltarModalOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-slate-900 border-4 border-red-600 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-pop overflow-y-auto max-h-[90vh] relative">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-red-100 flex items-center gap-2">
                        <Flame className="text-red-500 animate-pulse" /> 금지된 제단
                    </h2>
                    <button onClick={() => setIsAltarModalOpen(false)} className="bg-red-900 hover:bg-red-800 text-white p-1 rounded-lg">
                        <X size={20}/>
                    </button>
                  </div>

                  <div className="text-sm text-gray-400 mb-4 text-center">
                      강력한 유닛을 희생하여 <span className="text-red-400 font-bold">신화 등급</span> 유닛을 소환합니다.
                  </div>

                  <div className="space-y-4">
                      {SYNTHESIS_RECIPES.map(recipe => {
                          const resultStats = UNIT_BASE_STATS[recipe.result];
                          
                          // Check ingredients
                          const hasIng1 = entities.some(e => e.type === recipe.ingredients[0] && e.level >= recipe.minLevel && e.side === Side.PLAYER);
                          // For second ingredient, if types are same, we need count >= 2. If diff, just check exist.
                          const hasIng2 = recipe.ingredients[0] === recipe.ingredients[1] 
                             ? entities.filter(e => e.type === recipe.ingredients[0] && e.level >= recipe.minLevel && e.side === Side.PLAYER).length >= 2
                             : entities.some(e => e.type === recipe.ingredients[1] && e.level >= recipe.minLevel && e.side === Side.PLAYER);
                          
                          const canCraft = hasIng1 && hasIng2 && coins >= recipe.cost;

                          return (
                              <div key={recipe.id} className="bg-slate-800 p-4 rounded-xl border border-red-900 relative overflow-hidden group">
                                  {/* Background Effect */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-black via-red-900/10 to-black opacity-50"></div>
                                  
                                  <div className="relative z-10 flex flex-col gap-3">
                                      <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                               <div className="w-12 h-12 bg-red-900 rounded-lg flex items-center justify-center border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                                                   <span className="text-3xl">{resultStats.icon}</span>
                                               </div>
                                               <div>
                                                   <div className="font-bold text-red-200 text-lg">{UNIT_NAMES[recipe.result]}</div>
                                                   <div className="text-xs text-red-400">신화 등급 유닛</div>
                                               </div>
                                          </div>
                                          
                                          <button 
                                            onClick={() => handleSynthesize(recipe)}
                                            disabled={!canCraft}
                                            className={`
                                                px-4 py-2 rounded-lg font-bold shadow-lg transition-all flex flex-col items-center
                                                ${canCraft ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-gray-500 cursor-not-allowed'}
                                            `}
                                          >
                                              <span>소환</span>
                                              <span className="text-xs flex items-center gap-1 opacity-80"><Coins size={10}/> {recipe.cost}</span>
                                          </button>
                                      </div>

                                      {/* Recipe Ingredients */}
                                      <div className="flex items-center justify-center gap-2 bg-black/40 p-2 rounded-lg">
                                           <div className={`flex items-center gap-1 ${hasIng1 ? 'text-green-400' : 'text-gray-500'}`}>
                                               <span>{UNIT_BASE_STATS[recipe.ingredients[0]].icon}</span>
                                               <span className="text-xs">{UNIT_NAMES[recipe.ingredients[0]]} Lv.{recipe.minLevel}+</span>
                                           </div>
                                           <span className="text-gray-600">+</span>
                                           <div className={`flex items-center gap-1 ${hasIng2 ? 'text-green-400' : 'text-gray-500'}`}>
                                               <span>{UNIT_BASE_STATS[recipe.ingredients[1]].icon}</span>
                                               <span className="text-xs">{UNIT_NAMES[recipe.ingredients[1]]} Lv.{recipe.minLevel}+</span>
                                           </div>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {/* Achievement Modal */}
      {isAchievementModalOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-slate-800 border-4 border-green-500 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-pop overflow-y-auto max-h-[90vh]">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Medal className="text-green-400" /> 업적
                    </h2>
                    <button onClick={() => setIsAchievementModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white p-1 rounded-lg">
                        <X size={20}/>
                    </button>
                  </div>

                  <div className="space-y-4">
                      {ACHIEVEMENTS.map(ach => {
                          const current = gameStats[ach.type];
                          const progress = Math.min(100, (current / ach.target) * 100);
                          const isCompleted = current >= ach.target;
                          const isClaimed = claimedAchievements.has(ach.id);

                          return (
                              <div key={ach.id} className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${isCompleted ? 'bg-green-900/30 border-green-500' : 'bg-slate-700 border-slate-600'}`}>
                                  <div className={`text-3xl w-12 h-12 flex items-center justify-center rounded-full border-2 ${isCompleted ? 'bg-green-600 border-green-400' : 'bg-slate-800 border-slate-600 grayscale'}`}>
                                      {ach.icon}
                                  </div>
                                  <div className="flex-1">
                                      <div className="flex justify-between items-center mb-1">
                                          <div className={`font-bold ${isCompleted ? 'text-green-400' : 'text-gray-300'}`}>{ach.title}</div>
                                          {isCompleted && !isClaimed ? (
                                              <div className="text-green-400 font-bold text-xs animate-pulse">보상 수령 가능!</div>
                                          ) : (
                                              <div className="text-xs font-mono text-gray-400">{current} / {ach.target}</div>
                                          )}
                                      </div>
                                      <div className="text-xs text-gray-400 mb-2">{ach.desc}</div>
                                      
                                      {/* Reward / Progress Bar / Claim Button */}
                                      {isCompleted && !isClaimed ? (
                                          <button 
                                            onClick={() => claimAchievement(ach.id, ach.reward)}
                                            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 animate-bounce shadow-lg"
                                          >
                                              <span>보상 받기</span>
                                              <span className="bg-black/20 px-2 rounded-full text-sm flex items-center gap-1">
                                                  <Coins size={12} className="text-yellow-300"/> {ach.reward}
                                              </span>
                                          </button>
                                      ) : isClaimed ? (
                                          <div className="w-full bg-slate-800 text-gray-500 font-bold py-1.5 rounded-lg flex items-center justify-center gap-2 border border-slate-600">
                                              <CheckCircle2 size={16} /> 달성 완료
                                          </div>
                                      ) : (
                                          <>
                                              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-1">
                                                  <div 
                                                    className={`h-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${progress}%` }}
                                                  ></div>
                                              </div>
                                              <div className="text-[10px] text-right text-yellow-500 flex justify-end items-center gap-1">
                                                  보상: <Coins size={10}/> {ach.reward}
                                              </div>
                                          </>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {/* Upgrade Modal */}
      {isUpgradeModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-800 border-4 border-purple-500 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-pop overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-purple-400" /> 연구소
                    </h2>
                    <button onClick={() => setIsUpgradeModalOpen(false)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg">
                        X
                    </button>
                </div>
                
                <div className="space-y-4">
                    {/* Global Tech Section */}
                    <div className="space-y-3 mb-6">
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2">기반 시설</div>
                        {Object.values(GlobalTechType).map(type => {
                            const info = GLOBAL_TECH_INFO[type];
                            const lvl = globalTech[type];
                            const cost = info.baseCost + (lvl - 1) * info.costInc;
                            const isMax = lvl >= info.maxLevel;
                            const canAfford = coins >= cost && !isMax;

                            return (
                                <div key={type} className="bg-slate-700 p-4 rounded-xl flex flex-col gap-3 border-2 border-slate-600 relative overflow-hidden">
                                    <div className="flex items-center justify-between z-10">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-lg 
                                                ${type === GlobalTechType.CAPACITY ? 'bg-blue-900' : type === GlobalTechType.LUCK ? 'bg-purple-900' : 'bg-red-900'} 
                                                flex items-center justify-center text-2xl shadow-lg border-2 border-white/20`}
                                            >
                                                {type === GlobalTechType.CAPACITY && <Users className="text-blue-300"/>}
                                                {type === GlobalTechType.LUCK && <Clover className="text-purple-300"/>}
                                                {type === GlobalTechType.MYTHIC_MASTERY && <Flame className="text-red-300"/>}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-lg">{info.name} <span className="text-yellow-400">Lv.{lvl}</span></div>
                                                <div className="text-xs text-gray-400">{info.desc}</div>
                                                {/* Stat Preview */}
                                                <div className="text-xs text-green-400 font-bold mt-1">
                                                    {type === GlobalTechType.CAPACITY && `최대 인구: ${BASE_UNIT_CAP + (lvl-1)*2} → ${BASE_UNIT_CAP + lvl*2}`}
                                                    {type === GlobalTechType.LUCK && `확률 보너스: +${(lvl-1)*0.5}% → +${lvl*0.5}%`}
                                                    {type === GlobalTechType.MYTHIC_MASTERY && `신화 유닛 능력치: +${(lvl-1)*20}% → +${lvl*20}%`}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => applyGlobalUpgrade(type)}
                                            disabled={!canAfford}
                                            className={`
                                                flex flex-col items-center justify-center px-4 py-2 rounded-lg font-bold min-w-[80px]
                                                ${isMax ? 'bg-gray-800 text-gray-500' : canAfford ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_4px_0_rgb(147,51,234)] active:shadow-none active:translate-y-1' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
                                                transition-all
                                            `}
                                        >
                                            {isMax ? (
                                                <div className="text-sm">MAX</div>
                                            ) : (
                                                <>
                                                    <div className="text-sm">강화</div>
                                                    <div className="text-xs flex items-center gap-1">
                                                        <Coins size={10} /> {cost}
                                                    </div>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="w-full h-[2px] bg-slate-600/50 my-4"></div>

                    {/* Unit Tech Section */}
                    <div className="space-y-3">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2">유닛 강화</div>
                    {Object.values(UnitType)
                        // Don't show upgrade for Mythic units in lab? Or should we? Let's hide them to keep list short for now.
                        .filter(type => UNIT_BASE_STATS[type].tier !== UnitTier.MYTHIC)
                        .map(type => {
                        const lvl = techLevels[type];
                        const cost = TECH_COST_BASE + (lvl - 1) * TECH_COST_INCREASE;
                        const canAfford = coins >= cost;
                        
                        const currentStats = getUnitStats(type, 1, lvl, artifactLevels);
                        const nextStats = getUnitStats(type, 1, lvl + 1, artifactLevels);

                        return (
                            <div key={type} className="bg-slate-700 p-4 rounded-xl flex flex-col gap-3 border-2 border-slate-600">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-lg ${UNIT_BASE_STATS[type].color} flex items-center justify-center text-2xl shadow-lg border-2 border-black/30`}>
                                            {UNIT_BASE_STATS[type].icon}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-lg">{UNIT_NAMES[type]} <span className="text-yellow-400">Lv.{lvl}</span></div>
                                            <div className="text-xs text-gray-400">{TIER_INFO[UNIT_BASE_STATS[type].tier].name}</div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => applyTechUpgrade(type)}
                                        disabled={!canAfford}
                                        className={`
                                            flex flex-col items-center justify-center px-4 py-2 rounded-lg font-bold min-w-[80px]
                                            ${canAfford ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
                                            transition-all
                                        `}
                                    >
                                        <div className="text-sm">강화</div>
                                        <div className="text-xs flex items-center gap-1">
                                            <Coins size={10} /> {cost}
                                        </div>
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 bg-slate-900/40 p-2 rounded-lg text-xs">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-gray-400 flex items-center gap-1"><Heart size={10}/> HP</span>
                                        <div className="flex gap-1">
                                            <span>{currentStats.hp}</span>
                                            <span className="text-gray-500">→</span>
                                            <span className="text-green-400 font-bold">{nextStats.hp}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-gray-400 flex items-center gap-1"><Swords size={10}/> DMG</span>
                                        <div className="flex gap-1">
                                            <span>{currentStats.damage}</span>
                                            <span className="text-gray-500">→</span>
                                            <span className="text-green-400 font-bold">{nextStats.damage}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Help / Settings Modal */}
      {isHelpModalOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-slate-800 border-4 border-gray-500 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-pop">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <HelpCircle className="text-gray-400" /> 게임 도움말
                    </h2>
                    <button onClick={() => setIsHelpModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white p-1 rounded-lg">
                        <X size={20}/>
                    </button>
                  </div>

                  <div className="space-y-4 text-sm text-gray-300 mb-8">
                      <p>• <span className="text-white font-bold">유닛 소환:</span> 보급소에서 유닛을 모집하세요.</p>
                      <p>• <span className="text-white font-bold">합성 (Merge):</span> 같은 종류, 같은 레벨의 유닛을 드래그하여 겹치면 더 강력한 유닛으로 진화합니다.</p>
                      <p>• <span className="text-white font-bold">제단 (Altar):</span> 3레벨 이상의 유닛을 희생하여 신화 등급 유닛을 소환합니다.</p>
                      <p>• <span className="text-white font-bold">전투:</span> 준비 단계에서 유닛을 배치하고 전투 시작 버튼을 누르세요.</p>
                      <p>• <span className="text-white font-bold">연구 & 유물:</span> 코인을 모아 부대를 강화하세요.</p>
                  </div>

                  <div className="border-t border-gray-600 pt-6 grid grid-cols-2 gap-4">
                      <button 
                        onClick={handleModeReset}
                        className="w-full bg-orange-900/50 hover:bg-orange-800 border-2 border-orange-500 text-orange-200 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
                      >
                          <RefreshCw size={20} />
                          <span className="font-bold text-xs">현재 난이도 초기화</span>
                      </button>
                      <button 
                        onClick={handleFullReset}
                        className="w-full bg-red-900/50 hover:bg-red-800 border-2 border-red-500 text-red-200 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
                      >
                          <Trash2 size={20} />
                          <span className="font-bold text-xs">전체 데이터 초기화</span>
                      </button>
                      <div className="col-span-2 text-center text-[10px] text-gray-500">
                         '현재 난이도 초기화'는 현재 모드의 진행 상황만 삭제합니다.<br/>
                         '전체 데이터 초기화'는 모든 해금 정보를 포함하여 삭제합니다.
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Unit Info Modal */}
      {selectedUnit && (
        <div 
            onClick={(e) => {
                if(e.target === e.currentTarget) setSelectedUnit(null);
            }}
            className="absolute inset-0 z-50 bg-black/0 flex items-center justify-center p-4 pointer-events-auto"
        >
             <div className="bg-slate-800/95 backdrop-blur-md border-4 border-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-pop relative overflow-hidden pointer-events-auto">
                <div className={`absolute top-0 left-0 w-full h-2 ${selectedUnit.side === Side.PLAYER ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                
                <div className="flex justify-between items-start mb-6 mt-2">
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-xl ${UNIT_BASE_STATS[selectedUnit.type].color} flex items-center justify-center text-4xl shadow-lg border-2 border-white/20`}>
                            {UNIT_BASE_STATS[selectedUnit.type].icon}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
                                {UNIT_NAMES[selectedUnit.type]}
                            </h2>
                            <div className="flex items-center gap-1">
                                <span className={`font-bold text-sm px-2 py-0.5 rounded ${TIER_INFO[UNIT_BASE_STATS[selectedUnit.type].tier].color.replace('text-', 'bg-').replace('400', '900')} border border-white/20`}>
                                    {TIER_INFO[UNIT_BASE_STATS[selectedUnit.type].tier].name}
                                </span>
                                <span className="text-yellow-400 font-bold text-lg">Lv.{selectedUnit.level}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setSelectedUnit(null)} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-full transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     {(() => {
                         const tech = selectedUnit.side === Side.PLAYER ? getPlayerTechLevel(selectedUnit.type) : 1; 
                         const arts = selectedUnit.side === Side.PLAYER ? artifactLevels : {};
                         const stats = getUnitStats(selectedUnit.type, selectedUnit.level, tech, arts as any);
                         
                         return (
                            <>
                                <div className="bg-slate-700/50 p-3 rounded-xl flex flex-col items-center">
                                    <Heart className="text-red-400 mb-1" size={24} />
                                    <span className="text-xs text-gray-400">체력 (HP)</span>
                                    <span className="text-xl font-bold text-white">{stats.hp}</span>
                                </div>
                                <div className="bg-slate-700/50 p-3 rounded-xl flex flex-col items-center">
                                    <Swords className="text-blue-400 mb-1" size={24} />
                                    <span className="text-xs text-gray-400">공격력 (DMG)</span>
                                    <span className="text-xl font-bold text-white">{stats.damage}</span>
                                </div>
                                <div className="bg-slate-700/50 p-3 rounded-xl flex flex-col items-center">
                                    <Zap className="text-yellow-400 mb-1" size={24} />
                                    <span className="text-xs text-gray-400">공격 속도</span>
                                    <span className="text-xl font-bold text-white">{stats.attackSpeed}<span className="text-xs">/s</span></span>
                                </div>
                                <div className="bg-slate-700/50 p-3 rounded-xl flex flex-col items-center">
                                    <div className="flex gap-2 w-full justify-center">
                                        <div className="flex flex-col items-center">
                                            <Target className="text-green-400 mb-1" size={20} />
                                            <span className="text-xs text-gray-400">사거리</span>
                                            <span className="font-bold">{stats.range}</span>
                                        </div>
                                        <div className="w-[1px] bg-white/10"></div>
                                        <div className="flex flex-col items-center">
                                            <Move className="text-purple-400 mb-1" size={20} />
                                            <span className="text-xs text-gray-400">이동</span>
                                            <span className="font-bold">{stats.moveSpeed}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                         );
                     })()}
                </div>
                
                {/* Sell Button - Only for Player Units and during Preparation */}
                {selectedUnit.side === Side.PLAYER && phase === GamePhase.PREPARATION && (
                    <div className="mt-6 flex justify-center">
                        <button 
                            onClick={handleSellUnit}
                            className="w-full bg-red-900/80 hover:bg-red-800 border-2 border-red-500/50 text-red-200 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <Trash2 size={20} />
                            <span className="font-bold">판매하기</span>
                            <span className="text-xs bg-black/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Coins size={10} className="text-yellow-400" />
                                {/* Update Sell Value calculation to match new reduced purchase cost (1.2 multiplier) */}
                                {Math.floor(Math.floor(recruitCost * TIER_INFO[UNIT_BASE_STATS[selectedUnit.type].tier].costMult) * Math.pow(2, selectedUnit.level - 1) * 0.2)}
                            </span>
                        </button>
                    </div>
                )}
                
                <div className="mt-4 text-center text-xs text-blue-300 animate-pulse">
                     바닥에 표시된 영역이 공격 범위입니다.
                </div>
             </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="absolute top-0 w-full z-20 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
             <div className="flex items-center gap-2">
                 <div 
                    onClick={() => setIsAchievementModalOpen(true)}
                    className="relative bg-slate-800 border-2 border-yellow-600 rounded-lg px-4 py-2 flex items-center gap-3 shadow-lg cursor-pointer hover:bg-slate-700 active:scale-95 transition-all"
                 >
                    <div className="bg-yellow-500 rounded-full p-1"><Trophy size={16} className="text-black" /></div>
                    <span className="font-display text-yellow-500 text-xl tracking-wider">레벨 {level}</span>
                    <span className="text-xs text-gray-400 ml-1">/ {DIFFICULTY_SETTINGS[difficulty].maxLevel}</span>
                    {hasClaimableAchievements && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    )}
                 </div>
                 <button onClick={() => setIsHelpModalOpen(true)} className="bg-slate-800 p-2 rounded-full border-2 border-gray-500 text-gray-400 hover:text-white hover:border-white transition-all shadow-lg active:scale-95">
                    <HelpCircle size={22} />
                 </button>
             </div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
             <button 
                onClick={canClaimSupply ? claimSupply : undefined}
                className={`
                    relative bg-slate-800 border-2 border-blue-400 rounded-full px-3 py-1 flex items-center gap-2 shadow-lg transition-all
                    ${canClaimSupply ? 'animate-bounce cursor-pointer hover:bg-slate-700' : 'opacity-70'}
                `}
             >
                 <Gift className={canClaimSupply ? "text-blue-300" : "text-gray-500"} size={20} />
                 {canClaimSupply && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>}
             </button>

             <div className="bg-slate-800 border-2 border-yellow-500 rounded-full px-4 py-1 flex items-center gap-2 shadow-lg">
                <Coins className="text-yellow-400" size={20} />
                <span className="font-bold text-white text-lg">{coins}</span>
             </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
        
        {loadingLevel && (
           <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
             <RefreshCw className="animate-spin text-white mb-4" size={48} />
             <div className="font-display text-2xl tracking-widest">전장 생성 중...</div>
           </div>
        )}

        {(phase === GamePhase.VICTORY || phase === GamePhase.DEFEAT) && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 animate-in fade-in duration-500">
                {phase === GamePhase.VICTORY ? (
                    <>
                        <Trophy className="text-yellow-400 w-24 h-24 mb-6 animate-bounce" />
                        <h1 className="font-display text-6xl text-yellow-400 mb-8 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">승리</h1>
                        <button 
                            onClick={nextLevel}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-black text-2xl py-4 px-12 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.6)] transform hover:scale-110 transition-all active:scale-95"
                        >
                            다음 단계
                        </button>
                    </>
                ) : (
                    <>
                        <Skull className="text-red-500 w-24 h-24 mb-6" />
                        <h1 className="font-display text-6xl text-red-600 mb-8">패배</h1>
                        <button 
                            onClick={retryLevel}
                            className="bg-gray-700 hover:bg-gray-600 text-white font-bold text-xl py-3 px-10 rounded-xl border-2 border-gray-500 transform hover:scale-105 transition-all"
                        >
                            다시 도전
                        </button>
                    </>
                )}
            </div>
        )}

        <div className="perspective-container w-full max-w-lg aspect-[7/8]">
          <div ref={gridRef} className="battle-grid relative w-full h-full bg-slate-800 border-4 border-slate-700 rounded-lg">
             <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)` }}>
                {renderTiles()}
             </div>
             {entities.map(entity => {
                if (entity.id === draggingId) return null;
                const left = (entity.x / GRID_COLS) * 100;
                const top = (entity.y / GRID_ROWS) * 100;
                return (
                    <Unit 
                        key={entity.id} 
                        entity={entity} 
                        tileSize={gridRef.current ? gridRef.current.clientWidth / GRID_COLS : TILE_SIZE}
                        style={{ left: `${left}%`, top: `${top}%` }}
                        onMouseDown={(e) => handleMouseDown(e, entity)}
                        onTouchStart={(e) => handleTouchStart(e, entity)}
                        showHealth={phase === GamePhase.BATTLE}
                    />
                );
             })}
          </div>
        </div>
      </div>

      {draggingId && dragPos && (() => {
         const entity = entities.find(e => e.id === draggingId);
         if (!entity) return null;
         const tileSize = gridRef.current ? gridRef.current.clientWidth / GRID_COLS : TILE_SIZE;
         return (
            <div style={{ position: 'fixed', left: dragPos.x, top: dragPos.y, pointerEvents: 'none', zIndex: 9999 }}>
               <Unit entity={entity} tileSize={tileSize} isDragging={true} style={{ position: 'relative', left: 0, top: 0 }} />
            </div>
         );
      })()}


      {/* Bottom Controls */}
      <div className="w-full h-32 sm:h-40 bg-slate-900 border-t-4 border-slate-800 flex items-center justify-center relative z-40 px-2 pb-safe">
        
        {phase === GamePhase.PREPARATION ? (
            <div className="w-full max-w-lg flex justify-between items-end pb-2 sm:pb-4 relative">
                {/* Left Group */}
                <div className="flex gap-2 sm:gap-4 items-end">
                     <StoreCard 
                        cost={recruitCost} 
                        onBuy={() => setIsShopModalOpen(true)} 
                        canAfford={true} 
                        unitCount={entities.filter(e => e.side === Side.PLAYER).length}
                     />
                     {/* Unit Count Indicator inside StoreCard actually, wait, modify StoreCard instead to show Max */}
                     <div className="absolute left-6 top-0 bg-slate-900 text-white text-[10px] px-1 rounded border border-gray-600 z-50">
                        {entities.filter(e => e.side === Side.PLAYER).length} / {maxUnitCap}
                     </div>

                     <ArtifactCard onOpen={() => setIsArtifactModalOpen(true)} />
                </div>

                {/* Center Fight Button */}
                <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-6 sm:-translate-y-8 z-10">
                    <button 
                        onClick={() => setPhase(GamePhase.BATTLE)}
                        className="
                            group relative
                            w-24 h-24 sm:w-32 sm:h-32 rounded-full 
                            bg-gradient-to-br from-yellow-400 to-yellow-600 
                            border-4 border-yellow-200 
                            shadow-[0_0_30px_rgba(234,179,8,0.4)]
                            flex flex-col items-center justify-center
                            transition-all hover:scale-105 active:scale-95
                        "
                    >
                        <Swords size={32} className="sm:w-12 sm:h-12 text-yellow-900 drop-shadow-sm group-hover:animate-pulse" />
                        <span className="font-display text-yellow-900 font-bold text-xs sm:text-lg mt-1">전투 시작</span>
                        <span className="absolute inset-0 rounded-full border-4 border-yellow-400 opacity-0 group-hover:animate-ping"></span>
                    </button>
                </div>

                {/* Right Group */}
                <div className="flex gap-2 sm:gap-4 items-end">
                    <AltarCard onOpen={() => setIsAltarModalOpen(true)} />
                    <UpgradeCard 
                        onOpen={() => setIsUpgradeModalOpen(true)}
                        hasUpgradable={Object.values(UnitType).some(t => coins >= (TECH_COST_BASE + (techLevels[t] - 1) * TECH_COST_INCREASE))}
                    />
                </div>
            </div>
        ) : (
            <div className="w-full flex justify-center items-center pb-4 text-slate-500 font-display text-xl tracking-widest animate-pulse">
                전투 진행 중...
            </div>
        )}
      </div>

    </div>
  );
};

export default App;