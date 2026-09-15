/**
 * GameEngine.ts - Master 60 FPS Real-Time Simulation & Flight Coordinator
 * Connects WebGL rendering, 3D kinematics, ballistics, enemy formations,
 * camera tracking, and military HUD projection into a unified simulation loop.
 */

import * as THREE from 'three';
import { SceneManager } from '../rendering/SceneManager';
import { CameraController } from '../rendering/CameraController';
import { Environment3D } from '../rendering/Environment3D';
import { PlayerAircraft } from './PlayerAircraft';
import { EnemyManager } from './EnemyManager';
import { ProjectileManager } from './ProjectileManager';
import { CollisionSystem } from './CollisionSystem';
import { EffectsManager } from '../three/effectsManager';
import { AudioManager } from '../audio/AudioManager';
import { HandState, FlightTelemetry, TargetLockHUD } from '../types';

export class GameEngine {
  private sceneManager: SceneManager;
  private cameraCtrl: CameraController;
  private environment: Environment3D;
  private player: PlayerAircraft;
  private enemyMgr: EnemyManager;
  private projectileMgr: ProjectileManager;
  private collisionSystem: CollisionSystem;
  private effects: EffectsManager;
  private audio: AudioManager;

  // Running state
  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // Gameplay telemetry
  public score: number = 0;
  public highScore: number = 0;
  public health: number = 100;
  public maxHealth: number = 100;
  public lives: number = 3;
  public shieldEnergy: number = 100;
  public combo: number = 0;
  public comboTimer: number = 0;
  public enemiesDestroyed: number = 0;
  public gameOver: boolean = false;
  public speedMultiplier: number = 1.0;

  // Weapon cooldowns
  private lastLaserTime: number = 0;
  private laserCooldown: number = 140; // ms between laser bursts
  private lastMissileTime: number = 0;
  private missileCooldown: number = 1200; // ms between guided missiles

  // Powerups
  public rapidFireUntil: number = 0;
  public tripleShotUntil: number = 0;

  // Hand state reference
  private currentHandState: HandState = {
    detected: false,
    handX: 0.5,
    handY: 0.5,
    fingerCount: 0,
    gesture: 'NONE',
    action: 'HOLD FIRE',
  };

  // Telemetry callback
  private onTelemetryCallback: ((telem: FlightTelemetry) => void) | null = null;
  private lastTelemetryTime: number = 0;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  constructor(container: HTMLElement) {
    this.sceneManager = new SceneManager(container);
    this.cameraCtrl = new CameraController();
    this.environment = new Environment3D(this.sceneManager.scene);
    this.effects = new EffectsManager(this.sceneManager.scene);
    this.player = new PlayerAircraft(this.sceneManager.scene);
    this.enemyMgr = new EnemyManager(this.sceneManager.scene);
    this.projectileMgr = new ProjectileManager(this.sceneManager.scene, this.effects);
    this.collisionSystem = new CollisionSystem(this.effects, this.cameraCtrl);
    this.audio = AudioManager.getInstance();

    // Load High Score
    try {
      const saved = localStorage.getItem('skyfighter_highscore');
      if (saved) this.highScore = parseInt(saved, 10) || 0;
    } catch {
      // ignore
    }

    // Responsive resize
    this.sceneManager.onResize((w, h) => {
      this.cameraCtrl.setAspect(w / h);
    });
  }

  public setHandState(hand: HandState) {
    this.currentHandState = hand;
  }

  public onTelemetry(callback: (telem: FlightTelemetry) => void) {
    this.onTelemetryCallback = callback;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.audio.startEngine();
    this.loop();
  }

  public pause() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.audio.stopEngine();
  }

  public restart() {
    this.score = 0;
    this.health = 100;
    this.lives = 3;
    this.shieldEnergy = 100;
    this.combo = 0;
    this.enemiesDestroyed = 0;
    this.gameOver = false;
    this.speedMultiplier = 1.0;
    this.rapidFireUntil = 0;
    this.tripleShotUntil = 0;

    this.player.position.set(0, 0, 0);
    this.player.setTarget(0, 0);
    this.enemyMgr.reset();
    this.projectileMgr.reset();

    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Primary 60 FPS flight & combat tick
   */
  private loop = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    const rawDelta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const delta = Math.min(0.1, Math.max(0.001, rawDelta));

    // FPS calculation
    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    if (!this.gameOver) {
      this.updateSimulation(now, delta);
    }

    // Render 3D frame
    this.sceneManager.renderer.render(
      this.sceneManager.scene,
      this.cameraCtrl.camera
    );

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private updateSimulation(now: number, delta: number) {
    const hand = this.currentHandState;

    // 1. Flight Control Steering
    if (hand.detected) {
      // Map hand position [0..1] to flight bounds [-1..1]
      // 0 = left (-1), 1 = right (+1)
      // 0 = top (+1), 1 = bottom (-1)
      const normX = (hand.handX - 0.5) * 2;
      const normY = -(hand.handY - 0.5) * 2;
      this.player.setTarget(normX, normY);
    }

    // 2. Shield Logic
    const wantsShield = hand.detected && (hand.gesture === 'OPEN_PALM' || hand.gesture === 'FIST');
    if (wantsShield && this.shieldEnergy > 2) {
      this.player.shieldActive = true;
      this.shieldEnergy = Math.max(0, this.shieldEnergy - 18 * delta);
    } else {
      this.player.shieldActive = false;
      this.shieldEnergy = Math.min(100, this.shieldEnergy + 12 * delta);
    }

    // 3. Drone Weapons Action (0 to 5 fingers)
    if (hand.detected && !this.player.shieldActive) {
      const muzzles = this.player.getCannonMuzzleWorldPositions();

      // 1 FINGER: SINGLE BULLET (Centerline precision kinetic pulse)
      if (hand.gesture === 'ONE_FINGER') {
        if (now - this.lastLaserTime > 190) {
          this.lastLaserTime = now;
          this.projectileMgr.fireSingleBullet(this.player.position.clone());
          this.audio.playLaser();
          this.cameraCtrl.addTrauma(0.04);
        }
      }
      // 2 FINGERS: RAPID STREAM (Continuous twin cannon firing)
      else if (hand.gesture === 'TWO_FINGERS') {
        if (now - this.lastLaserTime > 110) {
          this.lastLaserTime = now;
          this.projectileMgr.fireLaser(muzzles.left, muzzles.right, false);
          this.audio.playLaser();
          this.cameraCtrl.addTrauma(0.02);
        }
      }
      // 3 FINGERS: PLASMA SPHERE (Charged energy blast orb)
      else if (hand.gesture === 'THREE_FINGERS') {
        if (now - this.lastMissileTime > 600) {
          this.lastMissileTime = now;
          this.projectileMgr.firePlasmaSphere(this.player.position.clone());
          this.audio.playMissileLaunch();
          this.cameraCtrl.addTrauma(0.08);
        }
      }
      // 4 FINGERS: ESCORT DRONES (Activate twin companion wingmen)
      else if (hand.gesture === 'FOUR_FINGERS') {
        this.player.setEscortActive(true);
        if (now - this.lastLaserTime > 160) {
          this.lastLaserTime = now;
          this.projectileMgr.fireLaser(muzzles.left, muzzles.right, true);
          this.audio.playLaser();
        }
      }
      // 5 FINGERS: LASER BEAM (Focused concentrated beam)
      else if (hand.gesture === 'FIVE_FINGERS') {
        if (now - this.lastLaserTime > 80) {
          this.lastLaserTime = now;
          this.projectileMgr.fireLaserBeam(muzzles.left, muzzles.right);
          this.audio.playLaser();
          this.cameraCtrl.addTrauma(0.02);
        }
      }
    }

    // 4. Update Player Kinematics
    this.speedMultiplier = 1.0 + (this.enemyMgr.currentWave - 1) * 0.08;
    this.player.update(delta, this.speedMultiplier);

    // Dynamic jet engine pitch
    this.audio.updateEnginePitch(this.speedMultiplier, this.player.roll);

    // 5. Update Camera Chase
    this.cameraCtrl.update(
      this.player.position,
      this.player.roll,
      this.player.pitch,
      this.speedMultiplier,
      delta
    );

    // 6. Update Scrolling 3D Environment
    this.environment.update(this.speedMultiplier, delta);

    // 7. Update Enemy Formations & Enemy AI Firing
    this.enemyMgr.update(delta, this.player.position, (origin, dir) => {
      this.projectileMgr.spawnEnemyLaser(origin, dir);
    });

    // 8. Update Projectiles
    this.projectileMgr.update(delta, (id) => {
      const found = this.enemyMgr.enemies.find((e) => e.id === id);
      return found ? found.group.position : null;
    });

    // 9. Update Visual Particle Effects & Explosions
    this.effects.update(delta);

    // 10. Collision System
    const collision = this.collisionSystem.checkCollisions(
      this.player,
      this.enemyMgr,
      this.projectileMgr,
      this.player.shieldActive,
      this.shieldEnergy,
      (amount) => {
        this.shieldEnergy = Math.max(0, this.shieldEnergy - amount);
      }
    );

    // Score & Combo Processing
    if (collision.enemiesKilled > 0) {
      this.combo += collision.enemiesKilled;
      this.comboTimer = 3.5;
      const multiplier = Math.min(5, 1 + Math.floor(this.combo / 4));
      this.score += collision.scoreGained * multiplier;
      this.enemiesDestroyed += collision.enemiesKilled;

      if (this.score > this.highScore) {
        this.highScore = this.score;
        try {
          localStorage.setItem('skyfighter_highscore', this.highScore.toString());
        } catch {
          // ignore
        }
      }
    }

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    // Damage processing
    if (collision.playerDamaged) {
      this.health -= collision.damageAmount;
      this.combo = 0; // Reset combo on hit
      if (this.health <= 0) {
        this.lives--;
        if (this.lives > 0) {
          this.health = 100;
          this.effects.createExplosion(this.player.position.clone(), true);
          this.audio.playExplosion(true);
        } else {
          this.gameOver = true;
          this.effects.createExplosion(this.player.position.clone(), true);
          this.audio.playExplosion(true);
        }
      }
    }

    // 11. Project 3D Target Lock Reticles for Military HUD (at 10 Hz)
    if (now - this.lastTelemetryTime > 95) {
      this.lastTelemetryTime = now;
      this.emitTelemetry();
    }
  }

  private emitTelemetry() {
    if (!this.onTelemetryCallback) return;

    const width = this.sceneManager.container.clientWidth || window.innerWidth;
    const height = this.sceneManager.container.clientHeight || window.innerHeight;
    const camera = this.cameraCtrl.camera;

    const locks: TargetLockHUD[] = [];
    for (const e of this.enemyMgr.enemies) {
      if (e.group.position.z < -20 && e.group.position.z > -700) {
        const projected = e.group.position.clone().project(camera);
        if (projected.z < 1 && Math.abs(projected.x) < 1.15 && Math.abs(projected.y) < 1.15) {
          const screenX = ((projected.x + 1) / 2) * width;
          const screenY = ((-projected.y + 1) / 2) * height;
          const dist = Math.round(Math.abs(e.group.position.z - this.player.position.z) * 8);

          locks.push({
            id: e.id,
            screenX,
            screenY,
            dist,
            type: e.type,
            locked: dist < 2200,
          });
        }
      }
    }

    const multiplier = Math.min(5, 1 + Math.floor(this.combo / 4));

    let activeWeapon = 'HOVER / EVASION';
    if (this.currentHandState.detected) {
      switch (this.currentHandState.gesture) {
        case 'ONE_FINGER': activeWeapon = 'SINGLE BULLET'; break;
        case 'TWO_FINGERS': activeWeapon = 'RAPID STREAM'; break;
        case 'THREE_FINGERS': activeWeapon = 'PLASMA SPHERE'; break;
        case 'FOUR_FINGERS': activeWeapon = 'ESCORT DRONES'; break;
        case 'FIVE_FINGERS': activeWeapon = 'LASER BEAM'; break;
        case 'OPEN_PALM':
        case 'FIST': activeWeapon = 'ENERGY SHIELD'; break;
      }
    }

    this.onTelemetryCallback({
      score: this.score,
      highScore: this.highScore,
      health: Math.max(0, this.health),
      maxHealth: 100,
      lives: this.lives,
      shieldEnergy: Math.round(this.shieldEnergy),
      isShieldActive: this.player.shieldActive,
      gameOver: this.gameOver,
      wave: this.enemyMgr.currentWave,
      level: this.enemyMgr.currentWave,
      machSpeed: parseFloat((1.3 * this.speedMultiplier).toFixed(2)),
      altitude: Math.round(32000 + this.player.position.y * 420),
      combo: this.combo,
      comboMultiplier: multiplier,
      enemiesDestroyed: this.enemiesDestroyed,
      fps: this.fps,
      rapidFireSeconds: Math.max(0, Math.ceil((this.rapidFireUntil - performance.now()) / 1000)),
      tripleShotSeconds: Math.max(0, Math.ceil((this.tripleShotUntil - performance.now()) / 1000)),
      targetLocks: locks.slice(0, 6),
      // Drone tactical telemetry (from photo)
      airspeedKmh: this.player.airspeedKmh,
      altitudeM: this.player.altitudeM,
      vsiMs: this.player.vsiMs,
      batteryPercent: this.player.batteryPercent,
      thrustPercent: this.player.thrustPercent,
      bulletTimePercent: 100,
      isBulletTime: false,
      activeWeapon,
      escortActive: this.player.escortActive,
      bossActive: this.enemyMgr.bossActive,
      bossName: this.enemyMgr.bossName,
      bossClass: this.enemyMgr.bossClass,
      bossHp: this.enemyMgr.bossHp,
      maxBossHp: this.enemyMgr.maxBossHp,
    });
  }

  public dispose() {
    this.pause();
    this.player.dispose(this.sceneManager.scene);
    this.environment.dispose();
    this.sceneManager.dispose();
  }
}
