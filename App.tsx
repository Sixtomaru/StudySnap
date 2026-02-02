import React, { useState, useEffect, useCallback, useRef } from 'react';
import Board from './components/Board';
import BossCard from './components/BossCard';
// AttackProjectile component is no longer used directly in DOM
import TeamSelector from './components/TeamSelector';
import MainMenu from './components/MainMenu';
import CaptureModal from './components/CaptureModal';
import { GameState, TileData, Boss, FloatingText, ElementType, SkillType, GRID_WIDTH, GRID_HEIGHT } from './types';
import { createBoard, findMatches, applyGravity, applyInterference, MatchGroup, hasPossibleMoves } from './utils/gameLogic';
import { MONSTER_DB, INITIAL_MOVES, MOVES_PER_LEVEL, TYPE_CHART, getLevelBackground, SECRET_BOSS, TYPE_PROJECTILE_ICONS } from './constants';
import { soundManager } from './utils/sound';
import { Skull, Zap, RotateCcw, X, LogOut, CheckCircle2 } from 'lucide-react';

// Define ProjectileData locally or import if moved to types
export interface ProjectileData {
    id: string;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    color: string;
    icon?: string;
    startTime: number; // Added to track animation in canvas
}

const App: React.FC = () => {
  // --- Game State ---
  const [appState, setAppState] = useState<GameState['status']>('menu');
  const [level, setLevel] = useState(1);
  const [movesLeft, setMovesLeft] = useState(INITIAL_MOVES);
  const [movesAtStart, setMovesAtStart] = useState(INITIAL_MOVES);
  const [collection, setCollection] = useState<Boss[]>([MONSTER_DB[0], MONSTER_DB[1], MONSTER_DB[2], MONSTER_DB[3]]);
  const [team, setTeam] = useState<Boss[]>([MONSTER_DB[0], MONSTER_DB[1], MONSTER_DB[2], MONSTER_DB[3]]);
  const [isFinalBossMode, setIsFinalBossMode] = useState(false);
  const [levelPlan, setLevelPlan] = useState<Boss[]>([]);
  
  // --- Battle State ---
  const [nextPreviewEnemy, setNextPreviewEnemy] = useState<Boss>(MONSTER_DB[4]); 
  const [board, setBoard] = useState<TileData[]>([]);
  const [enemy, setEnemy] = useState<Boss>(MONSTER_DB[4]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  
  // Interference Logic
  const [turnsToInterference, setTurnsToInterference] = useState(3);
  
  // Lock input during animations
  const [isProcessing, setIsProcessing] = useState(false);
  const [stageCleared, setStageCleared] = useState(false); 
  const [showFinishMessage, setShowFinishMessage] = useState(false);
  const [isResettingBoard, setIsResettingBoard] = useState(false);
  
  const [comboCount, setComboCount] = useState(0);
  const [skillCharges, setSkillCharges] = useState<Record<string, number>>({});
  const [showSkillMenu, setShowSkillMenu] = useState(false);
  const [victoryAnim, setVictoryAnim] = useState(false);
  const [isDefeatedAnim, setIsDefeatedAnim] = useState(false); 
  
  // --- Visuals ---
  const [bossShake, setBossShake] = useState(false);
  const [boardShake, setBoardShake] = useState(false); 
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileData[]>([]);
  const [captureCaught, setCaptureCaught] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [hitEffect, setHitEffect] = useState(false); // New Hit Effect State
  
  // UI States
  const [viewingMonster, setViewingMonster] = useState<Boss | null>(null);
  const [showQuitConfirmation, setShowQuitConfirmation] = useState(false);

  const bossRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const enterFullscreen = () => {
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => console.log(err));
        }
      } catch (e) {
          console.log("Fullscreen not supported");
      }
  };

  const scaleEnemyHp = (baseEnemy: Boss, lvl: number, isFinal: boolean): Boss => {
      let scaledHp = baseEnemy.maxHp;
      if (isFinal) {
          scaledHp = 40000;
      } else if (lvl === 10 || lvl === 20 || lvl === 30) {
          scaledHp = baseEnemy.maxHp; 
      } else {
          scaledHp = 800 + (lvl * 320);
      }
      return { ...baseEnemy, maxHp: scaledHp, currentHp: scaledHp };
  };

  const handleStartArcade = () => {
      enterFullscreen();
      setIsFinalBossMode(false);
      const fixedBossIds = ["m010", "m020", "m030"];
      const nonBosses = MONSTER_DB.filter(m => !fixedBossIds.includes(m.id));
      for (let i = nonBosses.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [nonBosses[i], nonBosses[j]] = [nonBosses[j], nonBosses[i]];
      }
      const plan: Boss[] = [];
      let nonBossIdx = 0;
      for (let i = 1; i <= 30; i++) {
          if (i === 10) plan.push(MONSTER_DB.find(m => m.id === "m010")!);
          else if (i === 20) plan.push(MONSTER_DB.find(m => m.id === "m020")!);
          else if (i === 30) plan.push(MONSTER_DB.find(m => m.id === "m030")!);
          else {
              if (nonBossIdx < nonBosses.length) {
                  plan.push(nonBosses[nonBossIdx]);
                  nonBossIdx++;
              } else {
                  plan.push(nonBosses[0]); 
              }
          }
      }
      setLevelPlan(plan);
      setLevel(1);
      setNextPreviewEnemy(scaleEnemyHp(plan[0], 1, false)); 
      setMovesLeft(INITIAL_MOVES);
      setMovesAtStart(INITIAL_MOVES);
      setAppState('team_select');
      setSkillCharges({});
  };

  const handleStartFinalBoss = () => {
      enterFullscreen();
      setIsFinalBossMode(true);
      const startLvl = 999;
      setLevel(startLvl);
      setNextPreviewEnemy(scaleEnemyHp(SECRET_BOSS, startLvl, true));
      setMovesLeft(20);
      setMovesAtStart(20);
      setAppState('team_select');
      setSkillCharges({});
  }

  const handleOpenGallery = () => {
      enterFullscreen();
      setAppState('gallery');
  };

  const handleQuitToMenu = () => {
      soundManager.playButton();
      setShowQuitConfirmation(true);
  };

  const confirmQuit = () => {
      soundManager.playButton();
      setShowQuitConfirmation(false);
      setAppState('menu');
  };

  const startLevel = () => {
      setEnemy(nextPreviewEnemy);
      setMovesAtStart(movesLeft);
      setBoard(createBoard(team));
      setAppState('playing');
      setSkillCharges({});
      setTurnsToInterference(Math.floor(Math.random() * 4) + 2); // 2-5
      setIsProcessing(false);
      setVictoryAnim(false);
      setIsDefeatedAnim(false);
      setStageCleared(false);
      setShowFinishMessage(false);
      setImgError(false);
      setIsResettingBoard(false);
  };

  const handleCaptureResult = (caught: boolean) => {
      setCaptureCaught(caught);
      if (caught) {
          if (!collection.find(m => m.name === enemy.name)) {
             setCollection(prev => [...prev, { ...enemy, currentHp: enemy.maxHp, id: enemy.id + '_caught_' + Date.now() }]);
          }
          setAppState('captured_info');
      } else {
          advanceLevel();
      }
  };

  const advanceLevel = () => {
      if (isFinalBossMode) {
          soundManager.playWin();
          setAppState('victory'); 
          return;
      }
      if (level >= 30) {
          soundManager.playWin();
          setAppState('victory'); 
      } else {
          const nextLvl = level + 1;
          setLevel(nextLvl);
          const baseEnemy = levelPlan[nextLvl - 1]; 
          setNextPreviewEnemy(scaleEnemyHp(baseEnemy, nextLvl, false));
          setMovesLeft(m => m + MOVES_PER_LEVEL);
          setAppState('team_select');
      }
  };

  const applyDamage = (amount: number) => {
      if (amount <= 0) return;
      setLastDamage(amount);
      setBossShake(true);
      setHitEffect(true); // Trigger visual hit
      setTimeout(() => { setBossShake(false); setLastDamage(null); setHitEffect(false); }, 200);
      setEnemy(prev => ({ ...prev, currentHp: Math.max(0, prev.currentHp - amount) }));
  };

  // --- LOGIC: INTELLIGENT BATCH PROCESSING (Staggered) ---
  const processMatches = async (startBoard: TileData[], startCombo: number, priorityTileId: string | null = null) => {
      let currentBoard = startBoard;
      let combo = startCombo;
      // We operate on a local copy of HP so we don't need to wait for state updates to check logic
      let currentBossHp = enemy.currentHp; 
      let hasWon = currentBossHp <= 0;

      while (true) {
          const { groups } = findMatches(currentBoard);
          if (groups.length === 0) break;

          // 1. Identify Intersections
          const tileCounts = new Map<string, number>();
          groups.forEach(g => g.ids.forEach(id => tileCounts.set(id, (tileCounts.get(id) || 0) + 1)));
          
          const intersectionIds = new Set<string>();
          tileCounts.forEach((count, id) => {
              if (count > 1) intersectionIds.add(id);
          });

          // 2. Selection & Priority Logic
          // UPDATED: Priority to Intersecting groups (Cross/L/T).
          let groupsToProcess = [...groups].sort((a, b) => {
              const aHasIntersect = a.ids.some(id => intersectionIds.has(id));
              const bHasIntersect = b.ids.some(id => intersectionIds.has(id));
              // Intersections come first
              if (aHasIntersect && !bHasIntersect) return -1;
              if (!aHasIntersect && bHasIntersect) return 1;
              return 0;
          });

          // 3. Process the selected groups (SEQUENTIAL STAGGERING)
          const allIdsForGravity = new Set<string>();
          const allIdsToUnfreeze = new Set<string>();

          for (const group of groupsToProcess) {
             const attacker = team.find(m => m.id === group.type);
             const size = group.ids.length; 
             
             // Determine IDs for this specific group
             const groupVisualIds = new Set<string>();
             const groupUnfreezeIds = new Set<string>();

             group.ids.forEach(id => {
                 const tile = currentBoard.find(t => t.id === id);
                 if (tile?.status === 'ice') {
                     groupUnfreezeIds.add(id);
                     allIdsToUnfreeze.add(id);
                 } else {
                     groupVisualIds.add(id);
                     allIdsForGravity.add(id);
                 }
             });
             
             group.idsToDestroy?.forEach(id => {
                 groupVisualIds.add(id);
                 allIdsForGravity.add(id);
             });

             // --- Apply Damage/Score Logic ---
             if (attacker) {
                   setSkillCharges(prev => ({ ...prev, [attacker.id]: Math.min(attacker.skillCost, (prev[attacker.id] || 0) + size) }));
                   let dmg = 100 * size;
                   if (size >= 4) dmg *= 1.2;
                   if (size >= 5) dmg *= 1.5;
                   if (TYPE_CHART[attacker.type].includes(enemy.type)) dmg *= 1.5;
                   dmg = Math.floor(dmg * (1 + (combo * 0.2)));
                   
                   const colorMap: Record<string, string> = { 'Fuego': '#ef4444', 'Agua': '#3b82f6', 'Planta': '#22c55e', 'Eléctrico': '#eab308' };
                   const centerTile = group.center; 

                   // Floating Text appears with Damage at match center IMMEDIATELY
                   addFloatingText(centerTile.x, centerTile.y, `${dmg}`, colorMap[attacker.type] || 'white');

                   // FIRE PROJECTILE BURST (Curved balls)
                   const projectileCount = 5;
                   for(let i=0; i<projectileCount; i++) {
                       setTimeout(() => {
                            fireProjectile(centerTile.x, centerTile.y, colorMap[attacker.type] || 'white');
                       }, i * 40); // Rapid fire sequence
                   }

                   // DELAY DAMAGE UPDATE UNTIL IMPACT (Wait for last projectile)
                   setTimeout(() => {
                        const wasAlive = currentBossHp > 0;
                        if (dmg > 0) {
                            currentBossHp = Math.max(0, currentBossHp - dmg);
                            applyDamage(dmg); // Visual HP update + Shake + Hit Effect
                        }

                        // Check Win Condition at Impact
                        if (wasAlive && currentBossHp <= 0) {
                           setShowFinishMessage(true);
                           soundManager.playWin(); // SURPRISE CHIME
                           hasWon = true; // Local variable update for outer loop break
                        }
                   }, 500 + (projectileCount * 40)); 
             }

             // --- STAGGERED VISUAL UPDATE ---
             if (groupVisualIds.size > 0 || groupUnfreezeIds.size > 0) {
                 setBoard(prev => prev.map(t => {
                     if (groupUnfreezeIds.has(t.id)) return { ...t, status: 'normal', isMatched: false };
                     if (groupVisualIds.has(t.id)) return { ...t, isMatched: true };
                     return t;
                 }));
                 
                 combo++;
                 setComboCount(combo);
                 soundManager.playMatch(combo);
                 
                 // REDUCED DELAY: 180ms for faster stagger
                 if (groupsToProcess.length > 1) {
                     await new Promise(r => setTimeout(r, 170));
                 }
             }
          }

          // 4. Animation Wait
          await new Promise(r => setTimeout(r, 200));

          // 5. Apply Gravity
          // Update local board state with unfreezes so gravity handles them correctly (as solid blocks, not empty)
          const boardWithUnfrozen = currentBoard.map(t => {
              if (allIdsToUnfreeze.has(t.id)) return { ...t, status: 'normal' as const, isMatched: false };
              return t;
          });

          const boardAfterFall = applyGravity(boardWithUnfrozen, Array.from(allIdsForGravity), team);
          setBoard(boardAfterFall);
          currentBoard = boardAfterFall;

          // 6. Dynamic Wait for next phase
          // INCREASED WAIT: 600ms - To allow floaty physics (stiffness 50) to settle before checking new matches
          await new Promise(r => setTimeout(r, 600));
      }

      // --- END OF COMBINATION SEQUENCE ---
      // Wait for any pending damage timeouts (max 600ms) to resolve before deciding outcome
      await new Promise(r => setTimeout(r, 700));

      // Re-check Enemy HP from State or use local tracker logic
      // Since setTimeout is async, we need to rely on the fact that if we won, hasWon was set or enemy state will update.
      // However, inside this closure, enemy.currentHp is stale. 
      // But we updated `hasWon` locally inside the loop if we detected a kill.
      // Let's use the visual state for the final check to be safe.
      
      if (hasWon) {
          await new Promise(r => setTimeout(r, 1500));
          setShowFinishMessage(false);
          setIsDefeatedAnim(true);
          await new Promise(r => setTimeout(r, 1500));
          
          setIsProcessing(false);
          setComboCount(0);
          
          if (isFinalBossMode) setAppState('victory');
          else if (collection.some(m => m.name === enemy.name)) advanceLevel();
          else setAppState('capture');
      } 
      else {
          setTimeout(() => setComboCount(0), 1000);
          
          // --- TURN END LOGIC (INTERFERENCE & STEEL) ---
          
          let nextBoard = currentBoard;
          let changed = false;

          // 1. Steel Life Decay
          const steelDecayed = nextBoard.map(t => {
              if (t.status === 'steel' && t.statusLife !== undefined) {
                  const newLife = t.statusLife - 1;
                  changed = true;
                  if (newLife <= 0) {
                      // Destroy steel
                      return { ...t, isMatched: true }; // Mark for removal
                  } else {
                      return { ...t, statusLife: newLife };
                  }
              }
              return t;
          });

          // Handle broken steel removal
          const steelToRemove = steelDecayed.filter(t => t.status === 'steel' && t.isMatched).map(t => t.id);
          if (steelToRemove.length > 0) {
               // Show visual update
               setBoard(steelDecayed);
               await new Promise(r => setTimeout(r, 300));
               nextBoard = applyGravity(steelDecayed, steelToRemove, team);
               setBoard(nextBoard);
               await new Promise(r => setTimeout(r, 300));
               changed = true;
          } else if (changed) {
               setBoard(steelDecayed); // Just update numbers
               nextBoard = steelDecayed;
          }

          // 2. Interference Trigger
          setTurnsToInterference(prev => {
              const next = prev - 1;
              if (next <= 0) {
                  // Trigger!
                  const interferedBoard = applyInterference(nextBoard, enemy.type);
                  setBoard(interferedBoard);
                  nextBoard = interferedBoard; // Update reference for deadlock check
                  soundManager.playThrow(); // Sound effect
                  setBoardShake(true);
                  setTimeout(() => setBoardShake(false), 300);
                  return Math.floor(Math.random() * 4) + 2; // Reset 2-5
              }
              return next;
          });

          // 3. Deadlock Check / Reset
          // Wait a tick for state to settle visually
          setTimeout(() => {
               if (!hasPossibleMoves(nextBoard)) {
                   // RESET BOARD
                   setIsResettingBoard(true);
                   setTimeout(() => {
                       const freshBoard = createBoard(team);
                       setBoard(freshBoard);
                       setIsResettingBoard(false);
                       setIsProcessing(false);
                   }, 1000);
               } else {
                   setIsProcessing(false);
               }
          }, 500);

          if (movesLeft <= 0 && !hasWon) {
              setAppState('gameover');
              soundManager.playLose();
          }
      }
  };

  const handleMove = async (id: string, targetX: number, targetY: number) => {
    if (isProcessing || movesLeft <= 0 || showFinishMessage || enemy.currentHp <= 0) return;

    const sourceTile = board.find(t => t.id === id);
    if (!sourceTile) return;

    if (sourceTile.x === targetX && sourceTile.y === targetY) {
         setSelectedTileId(prev => prev === id ? null : id); 
         return; 
    }

    const targetTile = board.find(t => t.x === targetX && t.y === targetY);
    
    // Check if either tile is immovable (Frozen, Rock, Steel)
    // Though UI prevents drag, this prevents click-swap
    if (sourceTile.status !== 'normal' || (targetTile && targetTile.status !== 'normal')) {
        return; 
    }
    
    let tempBoard = [...board];
    if (targetTile) {
        tempBoard = tempBoard.map(t => {
            if (t.id === sourceTile.id) return { ...t, x: targetX, y: targetY };
            if (t.id === targetTile.id) return { ...t, x: sourceTile.x, y: sourceTile.y };
            return t;
        });
    } else {
        tempBoard = tempBoard.map(t => t.id === sourceTile.id ? { ...t, x: targetX, y: targetY } : t);
    }

    const { groups } = findMatches(tempBoard);
    
    if (groups.length > 0) {
        soundManager.playSwap();
        setMovesLeft(prev => prev - 1);
        setSelectedTileId(null);
        setBoard(tempBoard);
        setIsProcessing(true); 

        await new Promise(r => setTimeout(r, 250));
        
        // FIX: Start Combo at 0, so the first match counts as 1
        await processMatches(tempBoard, 0, id);
    } else {
        setBoard(tempBoard); 
        soundManager.playSwap(); 
        await new Promise(r => setTimeout(r, 250));
        setBoard(board); 
    }
  };

  const executeSkill = async (monster: Boss) => {
     if (skillCharges[monster.id] < monster.skillCost || enemy.currentHp <= 0) return;
     soundManager.playButton();
     setShowSkillMenu(false);
     setSkillCharges(prev => ({...prev, [monster.id]: 0}));
     setIsProcessing(true);

     soundManager.playBeam();
     
     // 1. Determine Effect Amount based on description parsing or loose logic based on cost
     // We'll use a rough mapping based on cost to amount for logic:
     // Cost 10-12 -> 4-5 items
     // Cost 14-15 -> 5-6 items
     // Cost 18-20 -> 6-8 items
     // Cost 25+ -> 8-10 items
     let amount = 4;
     if (monster.skillCost >= 14) amount = 5;
     if (monster.skillCost >= 18) amount = 6;
     if (monster.skillCost >= 25) amount = 8;
     
     // Override based on specific types if needed, but the formula above fits the prompt reasonably well.
     
     let newBoard = [...board];
     let physicsTriggered = false;
     let tilesToRemove: string[] = [];

     // --- NUKE LOGIC (Fixed Damage) ---
     if (monster.skillType === 'nuke') {
         let dmg = 2000;
         if (monster.skillCost >= 25) dmg = 3500;
         // Visual Nuke Effect?
         fireProjectile(GRID_WIDTH/2, GRID_HEIGHT/2, 'yellow');
         
         setTimeout(() => {
             applyDamage(dmg);
             addFloatingText(GRID_WIDTH/2, GRID_HEIGHT/2, `¡${dmg}!`, 'yellow', 2);
         }, 600);
     } 
     // --- BOARD MANIPULATION LOGIC ---
     else {
         if (monster.skillType === 'clear_rocks') {
             // Find rocks
             const rocks = newBoard.filter(t => t.status === 'rock');
             const targets = rocks.sort(() => 0.5 - Math.random()).slice(0, amount);
             if (targets.length > 0) {
                 targets.forEach(t => tilesToRemove.push(t.id));
                 physicsTriggered = true;
             }
         } 
         else if (monster.skillType === 'clear_ice') {
             // Find ice
             const ice = newBoard.filter(t => t.status === 'ice');
             const targets = ice.sort(() => 0.5 - Math.random()).slice(0, amount);
             if (targets.length > 0) {
                 // Melt ice: Change status to normal. Gravity applies if they can match now.
                 const targetIds = new Set(targets.map(t => t.id));
                 newBoard = newBoard.map(t => targetIds.has(t.id) ? { ...t, status: 'normal' } : t);
                 physicsTriggered = true; 
             }
         }
         else if (monster.skillType === 'clear_steel') {
             // Find steel
             const steel = newBoard.filter(t => t.status === 'steel');
             const targets = steel.sort(() => 0.5 - Math.random()).slice(0, amount);
             if (targets.length > 0) {
                 targets.forEach(t => tilesToRemove.push(t.id));
                 physicsTriggered = true;
             }
         }
         else if (monster.skillType === 'clear_random') {
             // Find any tile (prefer normal, but can take obstacles if needed)
             // Prompt says "elimina 4, 5, 6 casillas al azar (interferencias o no)"
             const targets = newBoard.sort(() => 0.5 - Math.random()).slice(0, amount);
             if (targets.length > 0) {
                 targets.forEach(t => tilesToRemove.push(t.id));
                 physicsTriggered = true;
             }
         }
         else if (monster.skillType === 'clear_self') {
             // Find tiles of this monster
             const selfTiles = newBoard.filter(t => t.monsterId === monster.id && t.status === 'normal');
             const targets = selfTiles.sort(() => 0.5 - Math.random()).slice(0, amount + 1); // +1 bonus for self
             if (targets.length > 0) {
                 targets.forEach(t => tilesToRemove.push(t.id));
                 physicsTriggered = true;
             }
         }
         else if (monster.skillType === 'convert_type') {
             // Replace N random non-self tiles with self
             const candidates = newBoard.filter(t => t.monsterId !== monster.id && t.status === 'normal');
             const targets = candidates.sort(() => 0.5 - Math.random()).slice(0, amount);
             
             if (targets.length > 0) {
                 const targetIds = new Set(targets.map(t => t.id));
                 newBoard = newBoard.map(t => {
                     if (targetIds.has(t.id)) {
                         return {
                             ...t,
                             monsterId: monster.id,
                             type: monster.type,
                             emoji: monster.emoji,
                             image: monster.image,
                             isMatched: true // Trigger match animation visually? No, just change type.
                             // Actually, changing type might immediately form matches. 
                             // We don't remove them, we just change them.
                         };
                     }
                     return t;
                 });
                 // We don't remove, but we want to check matches immediately.
                 physicsTriggered = true;
             }
         }

         // Update visual board first
         setBoard(newBoard);
         
         if (physicsTriggered) {
             // Wait small delay for visual effect
             await new Promise(r => setTimeout(r, 300));
             
             // If we have tiles to remove (Rock, Steel, Random, Self), we treat them as "matched" for gravity
             // We need to pass the IDs to remove to applyGravity
             if (tilesToRemove.length > 0) {
                 // Mark them matched visually first?
                 setBoard(prev => prev.map(t => tilesToRemove.includes(t.id) ? { ...t, isMatched: true } : t));
                 await new Promise(r => setTimeout(r, 200));

                 const boardAfterFall = applyGravity(newBoard, tilesToRemove, team);
                 setBoard(boardAfterFall);
                 // Now process matches on the new board
                 await new Promise(r => setTimeout(r, 300));
                 await processMatches(boardAfterFall, 1);
             } else {
                 // Only conversions or ice melting happened, check matches directly on newBoard
                 await processMatches(newBoard, 1);
             }
         }
     }
     
     // Check Win Condition (if Nuke killed it)
     // Use timeout to sync with potential nuke delay above
     setTimeout(async () => {
         if (enemy.currentHp <= 0) {
            setShowFinishMessage(true);
            soundManager.playWin(); // SURPRISE CHIME
            
            await new Promise(r => setTimeout(r, 2000));
            setShowFinishMessage(false);
            
            await new Promise(r => setTimeout(r, 2000));
            setIsDefeatedAnim(true);
            await new Promise(r => setTimeout(r, 1500));

            setIsProcessing(false);
            if (isFinalBossMode) setAppState('victory');
            else if (collection.some(m => m.name === enemy.name)) advanceLevel();
            else setAppState('capture');
         } else {
            setIsProcessing(false);
         }
     }, monster.skillType === 'nuke' ? 650 : 0);
  };

  const addFloatingText = (x: number, y: number, text: string, color: string = 'white', scale: number = 1) => {
      const id = Date.now() + Math.random().toString();
      setFloatingTexts(prev => [...prev, { id, x, y, text, color, scale }]);
      setTimeout(() => setFloatingTexts(prev => prev.filter(ft => ft.id !== id)), 1000);
  };
  
  const fireProjectile = (gridX: number, gridY: number, color: string, icon?: string) => {
      if (boardRef.current) {
          const rect = boardRef.current.getBoundingClientRect();
          const startX = rect.left + (gridX + 0.5) * (rect.width / 6);
          const startY = rect.top + (gridY + 0.5) * (rect.height / 6);
          const targetX = window.innerWidth / 2;
          
          // Target roughly the center of the Boss Card (approx 25% of screen height)
          const targetY = window.innerHeight * 0.22; 
          
          const id = Date.now() + Math.random().toString();
          setProjectiles(prev => [...prev, { id, startX, startY, targetX, targetY, color, icon, startTime: Date.now() }]);
          
          // Cleanup is now handled by the Board canvas logic or self-expiry
          setTimeout(() => setProjectiles(prev => prev.filter(p => p.id !== id)), 500); 
      }
  };

  const anySkillReady = team.some(m => (skillCharges[m.id] || 0) >= m.skillCost);

  return (
    <div className={`h-screen w-screen bg-black flex overflow-hidden font-sans select-none text-slate-100 relative`}>
      {/* Background */}
      <div className={`absolute inset-0 z-0 transition-all duration-700 ease-in-out ${getLevelBackground(level, enemy.type)}`}></div>

      {appState === 'menu' && (
          <MainMenu 
            onStartArcade={handleStartArcade} 
            onOpenGallery={handleOpenGallery} 
            collectionSize={collection.length}
            onStartFinalBoss={handleStartFinalBoss}
          />
      )}

      {/* ... (Gallery and TeamSelect remain same, code elided for brevity if not changed, but must include full file in update) ... */}
      
      {appState === 'gallery' && (
          <div className="absolute inset-0 z-50 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black p-4 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-white">MONSTEMOJIS</h2>
                  <button onClick={() => { soundManager.playButton(); setAppState('menu'); }} className="bg-slate-700 p-2 rounded-full"><X /></button>
              </div>
              <div className="grid grid-cols-4 gap-2 overflow-y-auto pb-20 no-scrollbar">
                  {collection.map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => { soundManager.playButton(); setViewingMonster(m); }}
                        className="bg-slate-800 p-2 rounded-xl flex flex-col items-center border border-slate-700 active:scale-95 transition-transform"
                      >
                          <div className="w-12 h-12 flex items-center justify-center">
                            {m.image ? <img src={m.image} className="w-full h-full object-contain" /> : <span className="text-3xl">{m.emoji}</span>}
                          </div>
                      </div>
                  ))}
              </div>
              {viewingMonster && (
                  <div className="absolute inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setViewingMonster(null)}>
                      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-600 max-w-sm w-full relative">
                          <button onClick={() => setViewingMonster(null)} className="absolute top-2 right-2 p-1 bg-slate-700 rounded-full"><X size={16}/></button>
                          <div className="text-center mb-4">
                              <div className="w-40 h-40 mx-auto mb-2 flex items-center justify-center">
                                  {viewingMonster.image ? <img src={viewingMonster.image} className="w-full h-full object-contain" /> : <span className="text-8xl">{viewingMonster.emoji}</span>}
                              </div>
                              <h3 className="text-3xl font-black text-white">{viewingMonster.name}</h3>
                          </div>
                          <p className="text-slate-300 italic text-sm mb-4 text-center">"{viewingMonster.description}"</p>
                      </div>
                  </div>
              )}
          </div>
      )}

      {appState === 'team_select' && (
          <TeamSelector 
            collection={collection} 
            currentTeam={team} 
            onUpdateTeam={setTeam} 
            onStart={startLevel} 
            nextLevel={level}
            nextEnemy={nextPreviewEnemy} 
            movesLeft={movesLeft} 
            onBackToMenu={handleQuitToMenu}
          />
      )}
      
      {appState === 'capture' && (
          <CaptureModal 
             boss={enemy} 
             chance={Math.max(1, 100 - ((Math.max(1, movesAtStart - movesLeft) - 1) * 5))}
             onCaptureEnd={handleCaptureResult}
          />
      )}
      
      {appState === 'captured_info' && (
          <div 
             onClick={() => { soundManager.playButton(); advanceLevel(); }}
             className="absolute inset-0 z-50 bg-indigo-950/95 flex flex-col items-center justify-center p-8 animate-in zoom-in cursor-pointer text-center"
          >
              <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg overflow-y-auto no-scrollbar">
                  <div className="w-48 h-48 mb-6 animate-bounce flex items-center justify-center filter drop-shadow-2xl">
                        {enemy.image && !imgError ? <img src={enemy.image} className="w-full h-full object-contain" /> : <span className="text-9xl">{enemy.emoji}</span>}
                  </div>
                  <h2 className="text-5xl font-black text-white mb-2 tracking-wide text-shadow">{enemy.name}</h2>
                  <div className="bg-white/10 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-widest text-indigo-200 mb-6 border border-white/20">
                      Tipo: {enemy.type}
                  </div>
                  
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 backdrop-blur w-full mb-4">
                      <p className="text-slate-200 text-lg italic leading-relaxed mb-4">"{enemy.description}"</p>
                      <div className="border-t border-slate-700 pt-4">
                          <span className="text-yellow-400 font-bold uppercase text-xs block mb-1">Habilidad Especial</span>
                          <span className="text-white font-bold text-xl block mb-1">{enemy.skillName}</span>
                          <span className="text-slate-400 text-sm">{enemy.skillDescription}</span>
                      </div>
                  </div>
              </div>
              
              <div className="mt-4 pt-4 w-full border-t border-white/10 animate-pulse">
                  <span className="text-xl font-bold text-white uppercase tracking-widest">Toca para continuar</span>
              </div>
          </div>
      )}

      {appState === 'playing' && (
          <>
            <div className={`flex-1 h-full flex flex-col items-center relative min-w-0 justify-center z-10 w-full max-w-md mx-auto transition-all duration-700`}>
             
                {/* SUPERADO OVERLAY */}
                {stageCleared && (
                    <div className="absolute inset-x-0 top-1/3 z-50 flex items-center justify-center pointer-events-none">
                        <div className="bg-yellow-500/90 text-white font-black text-4xl md:text-6xl px-8 py-4 rounded-xl shadow-2xl border-4 border-white transform -rotate-3 animate-bounce drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
                            ¡SUPERADO!
                        </div>
                    </div>
                )}
                
                {/* RESET OVERLAY */}
                {isResettingBoard && (
                     <div className="absolute inset-x-0 top-1/2 z-50 flex items-center justify-center pointer-events-none">
                        <div className="bg-indigo-600/90 text-white font-black text-xl px-4 py-2 rounded-xl shadow-2xl border border-white animate-pulse">
                            SIN MOVIMIENTOS - REINICIANDO
                        </div>
                    </div>
                )}

                <div className="w-full flex justify-between items-center px-4 pt-4 pb-2 z-20">
                    <button 
                        onClick={handleQuitToMenu} 
                        disabled={enemy.currentHp <= 0}
                        className={`
                            bg-red-900/80 p-2 rounded-lg border border-red-700 text-red-200 transition-all
                            ${enemy.currentHp <= 0 ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-red-800'}
                        `}
                    >
                        <LogOut size={18} />
                    </button>

                    <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-600 font-bold flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 uppercase">Turnos</span>
                        <span className={`text-2xl ${movesLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{movesLeft}</span>
                    </div>
                    
                    <div className="relative group">
                        <button 
                            onClick={() => !isProcessing && enemy.currentHp > 0 && (soundManager.playButton(), setShowSkillMenu(!showSkillMenu))}
                            className={`bg-indigo-600 p-3 rounded-full border-2 border-indigo-400 shadow-lg shadow-indigo-500/30 active:scale-95 transition-all ${anySkillReady ? 'animate-bounce' : ''} ${enemy.currentHp <= 0 ? 'opacity-50 grayscale' : ''}`}
                        >
                            <Zap fill="currentColor" />
                        </button>
                        {showSkillMenu && enemy.currentHp > 0 && (
                            <div className="absolute top-14 right-0 bg-slate-800 border border-slate-600 rounded-xl p-2 w-72 shadow-2xl z-50 flex flex-col gap-2 animate-in zoom-in">
                                {team.map(m => {
                                    const charge = skillCharges[m.id] || 0;
                                    const ready = charge >= m.skillCost;
                                    return (
                                        <button 
                                            key={m.id}
                                            disabled={!ready}
                                            onClick={() => executeSkill(m)}
                                            className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all ${ready ? 'bg-indigo-900/50 hover:bg-indigo-800 border border-indigo-500' : 'opacity-50 grayscale'}`}
                                        >
                                            <div className="w-8 h-8 flex items-center justify-center">
                                                {m.image ? <img src={m.image} className="w-full h-full object-contain" /> : <span className="text-xl">{m.emoji}</span>}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-xs font-bold text-white">{m.skillName}</div>
                                                <div className="w-full h-1.5 bg-slate-900 rounded-full mt-1">
                                                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${Math.min(100, (charge / m.skillCost) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full max-w-md px-4 mb-2 z-10 relative mx-auto" ref={bossRef}>
                    {/* Pass Hit Effect State */}
                    <BossCard boss={enemy} shake={bossShake} damageTaken={lastDamage} isDefeated={isDefeatedAnim} hitEffect={hitEffect} />
                    
                    {/* MODIFIED COMBO UI - MOVED RIGHT - HIDE IF < 2 */}
                    {comboCount >= 2 && (
                        <div className="absolute top-1/2 right-6 transform -translate-y-1/2 z-50 flex flex-col items-center animate-in zoom-in duration-300 pointer-events-none">
                            <span className="text-yellow-400 font-bold text-xs italic tracking-widest drop-shadow-md whitespace-nowrap mb-1">
                                {(showFinishMessage || enemy.currentHp <= 0) ? "COMBO EXTRA" : "COMBO"}
                            </span>
                            <span className="text-6xl font-black text-white leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] font-sans" 
                                style={{
                                    textShadow: '0 0 10px rgba(250,204,21,0.8)'
                                }}>
                                {comboCount}
                            </span>
                        </div>
                    )}
                </div>

                {/* BOARD CONTAINER */}
                <div className="flex-1 w-full relative flex flex-col justify-center items-center z-10" ref={boardRef}>
                    
                    {/* "¡YA ESTÁ!" OVERLAY - MOVED INSIDE BOARD CONTAINER & UNBLURRED - SIMPLIFIED FONT */}
                    {showFinishMessage && (
                        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
                            <div className="relative transform scale-125 animate-gentle-bounce">
                                <h1 className="text-6xl md:text-7xl font-black tracking-tight text-center text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] stroke-black font-sans">
                                    ¡YA ESTÁ!
                                </h1>
                            </div>
                        </div>
                    )}

                    {/* BOARD COMPONENT - REDUCED BLUR */}
                    <div className={`transition-all duration-700 w-full flex justify-center ${showFinishMessage ? 'blur-[2px]' : ''}`}>
                        <Board 
                            board={board} 
                            selectedTileId={selectedTileId} 
                            onMove={handleMove} 
                            isProcessing={isProcessing} 
                            floatingTexts={floatingTexts} 
                            shake={boardShake}
                            projectiles={projectiles}
                        />
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes gentle-bounce {
                    0%, 100% { transform: scale(1.25); }
                    50% { transform: scale(1.3); }
                }
                .animate-gentle-bounce {
                    animation: gentle-bounce 2s infinite ease-in-out;
                }
            `}</style>
          </>
      )}

      {showQuitConfirmation && (
        <div className="absolute inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-800 p-6 rounded-2xl border border-red-500/50 max-w-sm w-full text-center">
                <h3 className="text-2xl font-black text-white mb-4">¿Abandonar?</h3>
                <p className="text-slate-400 mb-6 text-sm">Se perderá el progreso actual.</p>
                <div className="flex gap-4 justify-center">
                    <button onClick={() => setShowQuitConfirmation(false)} className="bg-slate-700 text-white px-6 py-3 rounded-xl font-bold">Cancelar</button>
                    <button onClick={confirmQuit} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold">Salir</button>
                </div>
            </div>
        </div>
      )}

      {appState === 'victory' && (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-center p-8">
              <h1 className="text-6xl mb-4">🏆</h1>
              <h2 className="text-4xl font-black text-yellow-400 mb-4">¡VICTORIA!</h2>
              <button onClick={() => { soundManager.playButton(); setAppState('menu'); }} className="bg-white text-black px-8 py-4 rounded-xl font-bold">Volver al Menú</button>
          </div>
      )}

      {appState === 'gameover' && (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-center p-8">
              <Skull size={64} className="text-red-600 mb-4" />
              <h2 className="text-4xl font-black text-white mb-2">GAME OVER</h2>
              <button onClick={() => { soundManager.playButton(); setAppState('menu'); }} className="bg-slate-700 text-white px-8 py-4 rounded-xl font-bold flex gap-2"><RotateCcw /> Volver al Menú</button>
          </div>
      )}
      
      {/* AttackProjectiles are now handled inside Board canvas for performance */}
    </div>
  );
};

export default App;