
export type ElementType = 'Fuego' | 'Agua' | 'Planta' | 'Eléctrico' | 'Tierra' | 'Roca' | 'Hielo' | 'Acero' | 'Fantasma' | 'Dragón' | 'Normal' | 'Bicho' | 'Volador' | 'Psíquico' | 'Hada';
export type TileStatus = 'normal' | 'rock' | 'steel' | 'ice';

export interface TileData {
  id: string;
  monsterId: string;
  type: ElementType;
  emoji: string;
  image?: string; // New: Support for images
  isMatched: boolean;
  x: number;
  y: number;
  status: TileStatus;
  statusLife?: number; 
}

export type SkillType = 'damage_single' | 'damage_aoe' | 'heal_turns' | 'clear_rocks' | 'clear_ice' | 'clear_steel' | 'convert_type' | 'nuke' | 'clear_random' | 'clear_self';

export interface Boss {
  id: string;
  name: string;
  emoji: string;
  image?: string; // New: Support for images
  description: string;
  maxHp: number;
  currentHp: number;
  type: ElementType;
  skillType: SkillType;
  skillName: string;
  skillDescription: string;
  skillCost: number; 
  captured?: boolean;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  scale?: number;
}

export interface GameState {
  board: TileData[];
  movesLeft: number;
  currentLevel: number; 
  status: 'menu' | 'team_select' | 'playing' | 'capture' | 'captured_info' | 'victory' | 'gameover' | 'gallery';
  selectedTileId: string | null;
  combo: number;
  skillCharges: Record<string, number>; 
}

export const GRID_WIDTH = 6;
export const GRID_HEIGHT = 6;

export interface DialogLine {
  speaker: string;
  text: string;
}

export interface DialogChoice {
  text: string;
  effect: 'empathy' | 'efficiency';
}

export interface ProjectileData {
    id: string;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    color: string;
    icon?: string;
    startTime: number;
}
