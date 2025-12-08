import { LevelConfig, UnitType, Side, Difficulty } from "../types";
import { GRID_ROWS, GRID_COLS, DIFFICULTY_SETTINGS } from "../constants";

export const generateLevel = async (levelNumber: number, difficulty: Difficulty): Promise<LevelConfig> => {
  // Procedural Generation Logic (Replacing AI)
  const diffSetting = DIFFICULTY_SETTINGS[difficulty];
  
  const enemies = [];
  const enemyMaxRow = Math.floor(GRID_ROWS / 2) - 1;

  // Determine available unit types based on level progression
  let availableTypes = [UnitType.INFANTRY, UnitType.ARCHER];
  if (levelNumber > 3) availableTypes.push(UnitType.TANK, UnitType.SPEARMAN);
  if (levelNumber > 6) availableTypes.push(UnitType.MAGE, UnitType.ASSASSIN);
  if (levelNumber > 10) availableTypes.push(UnitType.GOLEM, UnitType.DRAGON);

  // Determine enemy count scaling
  // Hell difficulty spawns more enemies faster
  // Slower count scaling (divisor increased from 3.0 to 4.0)
  let baseCount = 2 + Math.floor(levelNumber / 4.0);
  if (difficulty === Difficulty.HELL) {
    baseCount += 1 + Math.floor(levelNumber / 5);
  } else if (difficulty === Difficulty.HARD) {
    baseCount += Math.floor(levelNumber / 10);
  }

  const count = Math.min(baseCount, 16); // Hard cap at 16

  // Track occupied positions to prevent overlap
  const occupied = new Set<string>();

  for (let i = 0; i < count; i++) {
    let gridX = 0;
    let gridY = 0;
    let attempts = 0;
    
    // Try to find a valid position
    do {
      gridX = Math.floor(Math.random() * GRID_COLS);
      gridY = Math.floor(Math.random() * (enemyMaxRow + 1));
      attempts++;
    } while (occupied.has(`${gridX},${gridY}`) && attempts < 20);

    if (attempts < 20) {
      occupied.add(`${gridX},${gridY}`);
      
      const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      
      // Enemy level scaling: increases every X levels based on difficulty
      // Relaxed scaling significantly (divisors increased)
      let enemyLevel = 1;
      if (difficulty === Difficulty.NORMAL) {
        enemyLevel = 1 + Math.floor(levelNumber / 8); // Was 6
      } else if (difficulty === Difficulty.HARD) {
        enemyLevel = 1 + Math.floor(levelNumber / 6); // Was 5
      } else {
        enemyLevel = 2 + Math.floor(levelNumber / 5); // Was 4
      }

      enemies.push({
        type,
        level: enemyLevel,
        side: Side.ENEMY,
        gridX,
        gridY
      });
    }
  }

  // Simulate a brief delay for smooth UI transition
  await new Promise(resolve => setTimeout(resolve, 300));

  return { levelNumber, enemies };
};