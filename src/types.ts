/**
 * types.ts - Shared interfaces and types for the 3D Hand-Gesture Flight Combat Simulation
 */

export type GameMode = 'MENU' | 'CALIBRATING' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type GestureType =
  | 'NONE'
  | 'FIST' // 0: MOVE Left / Right (Stationary hover)
  | 'ONE_FINGER' // 1: Parallel Single Bullet
  | 'TWO_FINGERS' // 2: Rapid Stream
  | 'THREE_FINGERS' // 3: Plasma Sphere
  | 'FOUR_FINGERS' // 4: Escort Drones
  | 'FIVE_FINGERS' // 5: Laser Beam
  | 'OPEN_PALM'; // Open Hand (Laser Beam / Shield)

export type ActionType =
  | 'HOVER / MOVE'
  | 'SINGLE BULLET'
  | 'RAPID STREAM'
  | 'PLASMA SPHERE'
  | 'ESCORT DRONES'
  | 'LASER BEAM'
  | 'ENERGY SHIELD'
  | 'HOLD FIRE';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandState {
  detected: boolean;
  handX: number; // 0.0 to 1.0 (calibrated horizontal position)
  handY: number; // 0.0 to 1.0 (calibrated vertical position)
  rawX?: number;
  rawY?: number;
  fingerCount: number;
  gesture: GestureType;
  action: ActionType;
  confidence?: number;
  landmarks?: HandLandmark[];
}

export interface CalibrationData {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
  isCalibrated: boolean;
  step: 'CENTER' | 'LEFT_RIGHT' | 'UP_DOWN' | 'GESTURES' | 'READY';
}

export interface TargetLockHUD {
  id: number;
  screenX: number;
  screenY: number;
  dist: number;
  type: string;
  locked: boolean;
}

export interface FlightTelemetry {
  score: number;
  highScore: number;
  health: number;
  maxHealth: number;
  lives: number;
  shieldEnergy: number;
  isShieldActive: boolean;
  gameOver: boolean;
  wave: number;
  level: number;
  machSpeed: number;
  altitude?: number;
  airspeedKmh: number;
  altitudeM: number;
  vsiMs: number;
  batteryPercent: number;
  thrustPercent: number;
  activeWeapon?: string;
  bulletTimePercent: number;
  isBulletTime: boolean;
  escortActive: boolean;
  combo: number;
  comboMultiplier: number;
  enemiesDestroyed: number;
  fps: number;
  rapidFireSeconds: number;
  tripleShotSeconds: number;
  targetLocks: TargetLockHUD[];

  // Boss encounter
  bossActive: boolean;
  bossName: string;
  bossClass: string;
  bossHp: number;
  maxBossHp: number;
}

export type EnemyType = 'INTERCEPTOR' | 'GUNSHIP' | 'DRONE' | 'SWARM_QUEEN';

export interface FloatingNotice {
  id: number;
  text: string;
  color: string;
  time: number;
}
