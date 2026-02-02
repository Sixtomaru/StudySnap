import { TileData, GRID_WIDTH, GRID_HEIGHT, Boss, ElementType } from "../types";
import { INTERFERENCE_RULES } from "../constants";

export interface MatchGroup {
  ids: string[];
  type: string;
  center: { x: number, y: number };
  direction: 'horizontal' | 'vertical'; 
  idsToDestroy?: string[]; // IDs of rocks/extras to destroy specific to this group
}

export interface MatchResult {
  groups: MatchGroup[];
  allMatchedIds: string[];
  extraDestroyedIds: string[];
}

let globalUniqueCounter = 0;
const generateId = (prefix: string = 't') => {
  globalUniqueCounter++;
  return `${prefix}_${Date.now()}_${globalUniqueCounter}`;
};

export const createBoard = (team: Boss[]): TileData[] => {
  const board: TileData[] = [];
  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      let monster = team[Math.floor(Math.random() * team.length)];
      
      let attempts = 0;
      while (attempts < 50) {
        let conflict = false;
        if (x >= 2) {
           const left1 = board.find(t => t.x === x - 1 && t.y === y);
           const left2 = board.find(t => t.x === x - 2 && t.y === y);
           if (left1?.monsterId === monster.id && left2?.monsterId === monster.id) conflict = true;
        }
        if (!conflict && y >= 2) {
           const up1 = board.find(t => t.x === x && t.y === y - 1);
           const up2 = board.find(t => t.x === x && t.y === y - 2);
           if (up1?.monsterId === monster.id && up2?.monsterId === monster.id) conflict = true;
        }
        if (!conflict) break;
        monster = team[Math.floor(Math.random() * team.length)];
        attempts++;
      }

      board.push({
        id: generateId(`init_${x}_${y}`),
        monsterId: monster.id,
        type: monster.type,
        emoji: monster.emoji,
        image: monster.image,
        isMatched: false,
        x,
        y,
        status: 'normal'
      });
    }
  }
  return board;
};

export const findMatches = (board: TileData[]): MatchResult => {
  const groups: MatchGroup[] = [];
  // We use separate sets to allow the same tile ID to be part of a horizontal AND a vertical group
  // This is crucial for the "Cross" logic requested.
  const processedSigs = new Set<string>(); 
  
  const globalExtraDestroyedIds = new Set<string>();

  // Create grid for easy access
  const grid: (TileData | null)[][] = Array(GRID_WIDTH).fill(null).map(() => Array(GRID_HEIGHT).fill(null));
  board.forEach(t => {
      if (t.x >= 0 && t.x < GRID_WIDTH && t.y >= 0 && t.y < GRID_HEIGHT) {
          grid[t.x][t.y] = t;
      }
  });

  const isValidTile = (t: TileData | null) => t && t.status !== 'rock' && t.status !== 'steel';

  // Helper to get rocks adjacent to a specific tile
  const getAdjacentRocks = (tile: TileData): string[] => {
      const rockIds: string[] = [];
      const neighbors = [
          {x: tile.x + 1, y: tile.y}, {x: tile.x - 1, y: tile.y},
          {x: tile.x, y: tile.y + 1}, {x: tile.x, y: tile.y - 1}
      ];
      neighbors.forEach(n => {
          if (n.x >= 0 && n.x < GRID_WIDTH && n.y >= 0 && n.y < GRID_HEIGHT) {
              const neighbor = grid[n.x][n.y];
              if (neighbor && neighbor.status === 'rock') {
                  rockIds.push(neighbor.id);
                  globalExtraDestroyedIds.add(neighbor.id);
              }
          }
      });
      return rockIds;
  };

  // 1. SCAN HORIZONTALS
  for (let y = 0; y < GRID_HEIGHT; y++) {
      let matchLen = 1;
      for (let x = 0; x < GRID_WIDTH; x++) {
          const current = grid[x][y];
          const next = (x < GRID_WIDTH - 1) ? grid[x+1][y] : null;

          if (isValidTile(current) && isValidTile(next) && current!.monsterId === next!.monsterId) {
              matchLen++;
          } else {
              if (matchLen >= 3) {
                  const ids: string[] = [];
                  const groupRocks = new Set<string>();
                  
                  for (let k = 0; k < matchLen; k++) {
                      const t = grid[x - k][y];
                      if (t) {
                          ids.push(t.id);
                          const rocks = getAdjacentRocks(t);
                          rocks.forEach(r => groupRocks.add(r));
                      }
                  }
                  
                  // Use a unique signature based on direction + IDs to allow duplicates across directions
                  const sig = `h|${ids.sort().join('|')}`;
                  if (!processedSigs.has(sig)) {
                      processedSigs.add(sig);
                      const tiles = ids.map(id => board.find(b => b.id === id)!);
                      const sortedTiles = tiles.sort((a,b) => a.x - b.x);
                      
                      groups.push({
                          ids: ids,
                          type: sortedTiles[0].monsterId,
                          center: sortedTiles[Math.floor(sortedTiles.length / 2)],
                          direction: 'horizontal',
                          idsToDestroy: Array.from(groupRocks)
                      });
                  }
              }
              matchLen = 1;
          }
      }
  }

  // 2. SCAN VERTICALS
  for (let x = 0; x < GRID_WIDTH; x++) {
      let matchLen = 1;
      for (let y = 0; y < GRID_HEIGHT; y++) {
          const current = grid[x][y];
          const next = (y < GRID_HEIGHT - 1) ? grid[x][y+1] : null;

          if (isValidTile(current) && isValidTile(next) && current!.monsterId === next!.monsterId) {
              matchLen++;
          } else {
              if (matchLen >= 3) {
                  const ids: string[] = [];
                  const groupRocks = new Set<string>();

                  for (let k = 0; k < matchLen; k++) {
                      const t = grid[x][y - k];
                      if (t) {
                          ids.push(t.id);
                          const rocks = getAdjacentRocks(t);
                          rocks.forEach(r => groupRocks.add(r));
                      }
                  }

                  const sig = `v|${ids.sort().join('|')}`;
                  if (!processedSigs.has(sig)) {
                      processedSigs.add(sig);
                      const tiles = ids.map(id => board.find(b => b.id === id)!);
                      const sortedTiles = tiles.sort((a,b) => a.y - b.y);

                      groups.push({
                          ids: ids,
                          type: sortedTiles[0].monsterId,
                          center: sortedTiles[Math.floor(sortedTiles.length / 2)],
                          direction: 'vertical',
                          idsToDestroy: Array.from(groupRocks)
                      });
                  }
              }
              matchLen = 1;
          }
      }
  }

  const allMatchedIds = Array.from(new Set(groups.flatMap(g => g.ids)));
  return { groups, allMatchedIds, extraDestroyedIds: Array.from(globalExtraDestroyedIds) };
};

// --- SEGMENTED GRAVITY LOGIC ---
export const applyGravity = (
    currentBoard: TileData[], 
    idsToRemove: string[], 
    team: Boss[]
): TileData[] => {
    const nextBoard: TileData[] = [];
    
    // Process COLUMN BY COLUMN
    for (let x = 0; x < GRID_WIDTH; x++) {
        // Get all tiles currently in this column
        const colTiles = currentBoard.filter(t => t.x === x);
        
        // We fill from bottom (GRID_HEIGHT - 1) up to 0
        let writePtr = GRID_HEIGHT - 1;
        
        // Scan original positions from bottom to top
        for (let readPtr = GRID_HEIGHT - 1; readPtr >= 0; readPtr--) {
            const tile = colTiles.find(t => t.y === readPtr);
            
            // 1. ICE LOGIC (Fixed Obstacle)
            // If the tile is ICE and NOT removed, it stays exactly where it is.
            // It blocks gravity for everything above it (resets writePtr).
            if (tile && tile.status === 'ice' && !idsToRemove.includes(tile.id)) {
                nextBoard.push({ ...tile, isMatched: false }); // Keep position
                writePtr = readPtr - 1; // Next fall destination must be above this ice
            }
            // 2. FALLING LOGIC (Mobile Tiles)
            // If tile exists and is NOT removed (and not Ice), it falls to writePtr
            else if (tile && !idsToRemove.includes(tile.id)) {
                if (writePtr >= 0) {
                    nextBoard.push({
                        ...tile,
                        x: x,
                        y: writePtr,
                        isMatched: false
                    });
                    writePtr--;
                }
            }
            // 3. REMOVED LOGIC
            // If tile is in idsToRemove, we skip it.
            // Empty spaces (nulls) are also skipped. 
            // This effectively "pulls" upper tiles down to fill the gap at writePtr.
        }

        // 4. SPAWN LOGIC
        // Any remaining space above the last placed tile (up to top) is filled with spawns.
        // Note: If Ice blocked the stack, writePtr resets, so spawns only appear at the top segment.
        while (writePtr >= 0) {
            const monster = team[Math.floor(Math.random() * team.length)];
            nextBoard.push({
                id: generateId(`spawn_c${x}_${writePtr}`),
                monsterId: monster.id,
                type: monster.type,
                emoji: monster.emoji,
                image: monster.image,
                isMatched: false,
                x: x,
                y: writePtr,
                status: 'normal'
            });
            writePtr--;
        }
    }

    return nextBoard;
};

export const applyInterference = (board: TileData[], enemyType: ElementType): TileData[] => {
    // Determine interference type based on enemy
    let type: 'rock' | 'steel' | 'ice' | 'random' = INTERFERENCE_RULES[enemyType] || 'random';
    
    if (type === 'random') {
        const types: ('rock' | 'steel' | 'ice')[] = ['rock', 'steel', 'ice'];
        type = types[Math.floor(Math.random() * types.length)];
    }

    const targets = board.filter(t => t.status === 'normal');
    if (targets.length === 0) return board;

    const count = Math.min(targets.length, Math.floor(Math.random() * 3) + 2);
    const shuffled = targets.sort(() => 0.5 - Math.random());
    const affected = new Set(shuffled.slice(0, count).map(t => t.id));

    return board.map(t => {
        if (affected.has(t.id)) {
            // FIX: For ICE, preserve the monster data.
            if (type === 'ice') {
                return {
                    ...t,
                    status: 'ice'
                };
            }
            // For Rock/Steel, replace the monster.
            return {
                ...t,
                status: type as 'rock' | 'steel',
                statusLife: type === 'steel' ? 5 : undefined,
                monsterId: `obstacle_${type}`,
                emoji: type === 'rock' ? '🪨' : '⚙️',
                // Keep image undefined for obstacles to show emoji
                image: undefined 
            };
        }
        return t;
    });
};

export const hasPossibleMoves = (board: TileData[]): boolean => {
    // Create grid for simulation
    const grid: (TileData | null)[][] = Array(GRID_WIDTH).fill(null).map(() => Array(GRID_HEIGHT).fill(null));
    board.forEach(t => {
        if (t.status !== 'rock' && t.status !== 'steel') {
            grid[t.x][t.y] = t;
        }
    });

    for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            const current = grid[x][y];
            if (!current) continue;

            // Check Right Swap
            if (x < GRID_WIDTH - 1) {
                const right = grid[x+1][y];
                if (right) {
                    if (checkMatchAt(grid, x, y, right.monsterId) || checkMatchAt(grid, x+1, y, current.monsterId)) return true;
                }
            }
            // Check Down Swap
            if (y < GRID_HEIGHT - 1) {
                const down = grid[x][y+1];
                if (down) {
                    if (checkMatchAt(grid, x, y, down.monsterId) || checkMatchAt(grid, x, y+1, current.monsterId)) return true;
                }
            }
        }
    }
    return false;
};

// Helper for hasPossibleMoves
const checkMatchAt = (grid: (TileData | null)[][], x: number, y: number, id: string): boolean => {
    // Horizontal
    let hCount = 1;
    let i = 1; while (x - i >= 0 && grid[x-i][y]?.monsterId === id) { hCount++; i++; }
    i = 1; while (x + i < GRID_WIDTH && grid[x+i][y]?.monsterId === id) { hCount++; i++; }
    if (hCount >= 3) return true;

    // Vertical
    let vCount = 1;
    i = 1; while (y - i >= 0 && grid[x][y-i]?.monsterId === id) { vCount++; i++; }
    i = 1; while (y + i < GRID_HEIGHT && grid[x][y+i]?.monsterId === id) { vCount++; i++; }
    if (vCount >= 3) return true;

    return false;
}