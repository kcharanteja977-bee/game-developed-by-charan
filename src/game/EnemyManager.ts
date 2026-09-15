/**
 * EnemyManager.ts - 3D Enemy Aircraft Formations, AI Tactics, & Flight Paths
 * Manages Interceptors, Heavy Gunships, and Stealth Drones with:
 * - Far horizon spawning (Z = -700 to -950)
 * - True 3D banking, evasive weaving, and diving passes
 * - AI weapon firing (enemy plasma bolts aimed at player)
 * - Scaled wave encounters and boss formations
 */

import * as THREE from 'three';
import { createEnemyInterceptor, createEnemyHeavyCruiser, createNexusQueenBoss } from '../three/aircraftModels';
import { EnemyType } from '../types';

export interface EnemyAircraft3D {
  id: number;
  type: EnemyType;
  group: THREE.Group;
  hp: number;
  maxHp: number;
  speed: number;
  scoreValue: number;
  radius: number;

  // AI behavior states
  aiState: 'APPROACH' | 'EVADE' | 'ATTACK' | 'DIVE' | 'BOSS_HOVER';
  swayPhase: number;
  swaySpeed: number;
  swayAmplitude: number;
  targetX: number;
  targetY: number;
  lastFireTime: number;
  fireCooldown: number;
  roll: number;
  flameMesh?: THREE.Mesh;
  bossData?: ReturnType<typeof createNexusQueenBoss>;
}

export class EnemyManager {
  private scene: THREE.Scene;
  public enemies: EnemyAircraft3D[] = [];
  private nextEnemyId: number = 1;

  // Wave management
  public currentWave: number = 1;
  private waveTimer: number = 0;
  private spawnInterval: number = 2.4;
  private enemiesSpawnedInWave: number = 0;
  private maxEnemiesInWave: number = 6;

  // Boss encounter
  public bossActive: boolean = true;
  public bossName: string = 'NEXUS SWARM QUEEN';
  public bossClass: string = 'DREADNOUGHT CLASS ENEMY';
  public bossHp: number = 2400;
  public maxBossHp: number = 2400;
  public bossEnemy: EnemyAircraft3D | null = null;
  private bossOrbitAngle: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.spawnBoss();
  }

  public reset() {
    for (const e of this.enemies) {
      this.scene.remove(e.group);
    }
    this.enemies = [];
    this.currentWave = 1;
    this.waveTimer = 0;
    this.enemiesSpawnedInWave = 0;
    this.maxEnemiesInWave = 6;
    this.spawnBoss();
  }

  public spawnBoss() {
    if (this.bossEnemy) {
      this.scene.remove(this.bossEnemy.group);
      this.bossEnemy = null;
    }

    const bossData = createNexusQueenBoss();
    bossData.group.position.set(0, 10, -220);
    this.scene.add(bossData.group);

    this.bossHp = 2400;
    this.maxBossHp = 2400;
    this.bossActive = true;

    const boss: EnemyAircraft3D = {
      id: this.nextEnemyId++,
      type: 'SWARM_QUEEN',
      group: bossData.group,
      hp: this.bossHp,
      maxHp: this.maxBossHp,
      speed: 0,
      scoreValue: 5000,
      radius: 12.0,
      aiState: 'BOSS_HOVER',
      swayPhase: 0,
      swaySpeed: 0.8,
      swayAmplitude: 8.0,
      targetX: 0,
      targetY: 10,
      lastFireTime: performance.now(),
      fireCooldown: 1400,
      roll: 0,
      bossData,
    };

    this.bossEnemy = boss;
    this.enemies.push(boss);
  }

  public spawnEnemy(type: EnemyType, x?: number, y?: number, z?: number) {
    let group: THREE.Group;
    let hp: number;
    let speed: number;
    let scoreValue: number;
    let radius: number;
    if (type === 'GUNSHIP') {
      group = createEnemyHeavyCruiser();
      hp = 180 + this.currentWave * 40;
      speed = 55 + this.currentWave * 4;
      scoreValue = 350;
      radius = 4.2;
    } else {
      group = createEnemyInterceptor();
      if (type === 'DRONE') {
        group.scale.set(0.7, 0.7, 0.7);
        hp = 40 + this.currentWave * 10;
        speed = 120 + this.currentWave * 10;
        scoreValue = 180;
        radius = 1.8;
      } else {
        // INTERCEPTOR
        hp = 80 + this.currentWave * 20;
        speed = 85 + this.currentWave * 8;
        scoreValue = 120;
        radius = 2.6;
      }
    }

    const spawnX = x !== undefined ? x : (Math.random() - 0.5) * 36;
    const spawnY = y !== undefined ? y : (Math.random() - 0.5) * 16 + 2;
    const spawnZ = z !== undefined ? z : -750 - Math.random() * 200; // Far horizon!

    group.position.set(spawnX, spawnY, spawnZ);
    this.scene.add(group);

    const enemy: EnemyAircraft3D = {
      id: this.nextEnemyId++,
      type,
      group,
      hp,
      maxHp: hp,
      speed,
      scoreValue,
      radius,
      aiState: 'APPROACH',
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 1.2 + Math.random() * 1.5,
      swayAmplitude: 6.0 + Math.random() * 8.0,
      targetX: spawnX,
      targetY: spawnY,
      lastFireTime: performance.now(),
      fireCooldown: 2000 + Math.random() * 1500,
      roll: 0,
    };

    this.enemies.push(enemy);
  }

  /**
   * Updates all enemy kinematics, AI evasion, and wave spawning
   */
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    onEnemyFire: (origin: THREE.Vector3, dir: THREE.Vector3) => void
  ) {
    const now = performance.now();

    // 1. Wave Spawning Timer
    this.waveTimer += delta;
    if (this.waveTimer > this.spawnInterval && this.enemiesSpawnedInWave < this.maxEnemiesInWave) {
      this.waveTimer = 0;
      this.enemiesSpawnedInWave++;

      // Pick enemy type based on wave
      const roll = Math.random();
      if (this.currentWave >= 3 && roll < 0.28) {
        this.spawnEnemy('GUNSHIP');
      } else if (this.currentWave >= 2 && roll < 0.55) {
        this.spawnEnemy('DRONE');
      } else {
        this.spawnEnemy('INTERCEPTOR');
      }
    }

    // Check if wave cleared (excluding boss)
    const minionEnemies = this.enemies.filter((e) => e.type !== 'SWARM_QUEEN');
    if (this.enemiesSpawnedInWave >= this.maxEnemiesInWave && minionEnemies.length === 0) {
      this.currentWave++;
      this.enemiesSpawnedInWave = 0;
      this.maxEnemiesInWave = 5 + this.currentWave * 2;
      this.spawnInterval = Math.max(1.1, 2.4 - this.currentWave * 0.15);
    }

    // 2. Update individual enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Special Boss AI: NEXUS SWARM QUEEN
      if (e.type === 'SWARM_QUEEN' && e.bossData) {
        this.bossHp = Math.max(0, e.hp);

        // Hover & Sway at horizon
        e.swayPhase += delta * e.swaySpeed;
        const targetX = Math.sin(e.swayPhase) * e.swayAmplitude;
        const targetY = 10 + Math.cos(e.swayPhase * 0.6) * 3.5;
        e.group.position.x += (targetX - e.group.position.x) * (2.0 * delta);
        e.group.position.y += (targetY - e.group.position.y) * (2.0 * delta);

        // Rotate core and shield
        e.bossData.coreMesh.rotation.y += delta * 0.8;
        e.bossData.shieldRing.rotation.z += delta * 1.2;

        // Rotate orbiting swarm nodes
        e.bossData.swarmNodes.forEach((node, nodeIdx) => {
          const angle = this.bossOrbitAngle + (nodeIdx * Math.PI * 2) / 6;
          const radius = 14.5;
          node.position.set(Math.cos(angle) * radius, Math.sin(angle * 2) * 3.5, Math.sin(angle) * radius);
          node.rotation.x += delta * 3;
          node.rotation.y += delta * 2;
        });

        // Fire Boss plasma salvos
        if (now - e.lastFireTime > e.fireCooldown) {
          e.lastFireTime = now;
          const origin = e.group.position.clone();
          origin.y -= 1.5;
          const dir = playerPos.clone().sub(origin).normalize();
          onEnemyFire(origin, dir);
        }

        if (e.hp <= 0) {
          this.bossActive = false;
          this.scene.remove(e.group);
          this.enemies.splice(i, 1);
          this.bossEnemy = null;
        }
        continue;
      }

      // A. Forward advance towards player
      e.group.position.z += e.speed * delta;

      // B. Lateral AI maneuvers (evasion, weaving, banking)
      e.swayPhase += e.swaySpeed * delta;
      const weaveOffset = Math.sin(e.swayPhase) * e.swayAmplitude;

      // Smooth horizontal target tracking
      const targetX = (e.id % 2 === 0 ? playerPos.x * 0.4 : -playerPos.x * 0.4) + weaveOffset;
      const dx = targetX - e.group.position.x;
      e.group.position.x += dx * (2.2 * delta);

      // C. Bank into turns
      const targetRoll = Math.max(-0.6, Math.min(0.6, (dx / 6) * 0.8));
      e.roll += (targetRoll - e.roll) * (5.0 * delta);
      e.group.rotation.z = e.roll;

      // Slight nose-down dive when approaching
      e.group.rotation.x = 0.08;

      // D. Enemy Plasma Cannon firing
      // Fires if enemy is in front of player (Z between -450 and -60)
      if (
        e.group.position.z > -450 &&
        e.group.position.z < -60 &&
        now - e.lastFireTime > e.fireCooldown
      ) {
        e.lastFireTime = now;
        const origin = e.group.position.clone().add(new THREE.Vector3(0, -0.4, 2.5));
        const dir = playerPos.clone().sub(origin).normalize();
        onEnemyFire(origin, dir);
      }

      // E. Remove if flown past player camera (+50)
      if (e.group.position.z > 50) {
        this.scene.remove(e.group);
        this.enemies.splice(i, 1);
      }
    }
  }

  public removeEnemy(id: number) {
    const idx = this.enemies.findIndex((e) => e.id === id);
    if (idx !== -1) {
      const e = this.enemies[idx];
      this.scene.remove(e.group);
      this.enemies.splice(idx, 1);
      if (e.type === 'SWARM_QUEEN') {
        this.bossActive = false;
        this.bossEnemy = null;
      }
    }
  }
}
