/**
 * types.ts - Shared interfaces and types for the Hand-Gesture Airplane Shooter
 */

export type GestureType = 'NONE' | 'FIST' | 'ONE_FINGER' | 'TWO_FINGERS' | 'OPEN_PALM';
export type ActionType = 'HOLD FIRE' | 'SHOOT LASER' | 'AOE BOMB' | 'ENERGY SHIELD';

export interface HandState {
  detected: boolean;
  handX: number; // 0.0 to 1.0 (horizontal position)
  handY: number; // 0.0 to 1.0
  fingerCount: number;
  gesture: GestureType;
  action: ActionType;
  landmarks?: Array<{ x: number; y: number; z: number }>;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx?: number;
  speed: number;
  damage: number;
  width: number;
  height: number;
  color?: string;
}

export interface Bomb {
  id: number;
  x: number;
  y: number;
  speed: number;
  damage: number;
  radius: number;
}

export interface BombExplosion {
  id: number;
  x: number;
  y: number;
  currentRadius: number;
  maxRadius: number;
  damage: number;
  hitEnemies: Set<number>;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  type: 'SCOUT' | 'HEAVY';
  hp: number;
  maxHp: number;
  speed: number;
  width: number;
  height: number;
  swayOffset: number;
  swaySpeed: number;
  scoreValue: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  lineWidth: number;
  alpha: number;
}

export interface Star {
  x: number;
  y: number;
  speed: number;
  baseSpeed: number;
  size: number;
  brightness: number;
  layer: number; // 0 = distant dust, 1 = mid starfield, 2 = foreground streak
  color?: string;
  twinklePhase?: number;
  twinkleSpeed?: number;
}

export type PowerUpType = 'RAPID_FIRE' | 'TRIPLE_SHOT' | 'SHIELD_BOOST';

export interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: PowerUpType;
  vy: number;
  width: number;
  height: number;
  spawnTime: number;
  bobPhase: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}
