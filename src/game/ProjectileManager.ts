/**
 * ProjectileManager.ts - 3D Ballistics, Twin Plasma Cannons, & Homing Missiles
 * Handles:
 * - Alternating wing hardpoint firing with realistic muzzle flash
 * - High-velocity 3D plasma projectiles with perspective scaling
 * - Sidewinder guided missiles with target lead pursuit and smoke trails
 * - Enemy incoming plasma fire
 */

import * as THREE from 'three';
import { createMissileModel } from '../three/aircraftModels';
import { EffectsManager } from '../three/effectsManager';

export interface PlayerLaser3D {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  alive: boolean;
  age: number;
  radius?: number;
}

export interface GuidedMissile3D {
  group: THREE.Group;
  velocity: THREE.Vector3;
  targetEnemyId: number | null;
  speed: number;
  turnRate: number;
  damage: number;
  radius: number;
  alive: boolean;
  age: number;
  lastSmokeTime: number;
}

export interface EnemyLaser3D {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  alive: boolean;
  age: number;
}

export class ProjectileManager {
  private scene: THREE.Scene;
  private effects: EffectsManager;

  public playerLasers: PlayerLaser3D[] = [];
  public guidedMissiles: GuidedMissile3D[] = [];
  public enemyLasers: EnemyLaser3D[] = [];

  // Alternating cannon wing state
  private wingToggle: boolean = false;
  private laserMatCyan: THREE.MeshBasicMaterial;
  private laserMatAmber: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene, effects: EffectsManager) {
    this.scene = scene;
    this.effects = effects;

    this.laserMatCyan = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
    });

    this.laserMatAmber = new THREE.MeshBasicMaterial({
      color: 0xf43f5e, // Crimson enemy laser
      transparent: true,
      opacity: 0.95,
    });
  }

  public reset() {
    for (const l of this.playerLasers) this.scene.remove(l.mesh);
    for (const m of this.guidedMissiles) this.scene.remove(m.group);
    for (const e of this.enemyLasers) this.scene.remove(e.mesh);
    this.playerLasers = [];
    this.guidedMissiles = [];
    this.enemyLasers = [];
  }

  /**
   * Fires twin plasma cannon bolts from wing hardpoints
   */
  public fireLaser(
    leftCannonPos: THREE.Vector3,
    rightCannonPos: THREE.Vector3,
    isTriple: boolean = false
  ) {
    this.wingToggle = !this.wingToggle;
    const origin = this.wingToggle ? rightCannonPos : leftCannonPos;

    const geo = new THREE.CylinderGeometry(0.1, 0.1, 4.0, 6);
    geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, this.laserMatCyan);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    this.playerLasers.push({
      mesh,
      velocity: new THREE.Vector3(0, 0, -420), // High-velocity forward plasma
      damage: 35,
      alive: true,
      age: 0,
    });

    if (isTriple) {
      // Flank spread bolts
      const leftMesh = new THREE.Mesh(geo, this.laserMatCyan);
      leftMesh.position.copy(leftCannonPos);
      this.scene.add(leftMesh);
      this.playerLasers.push({
        mesh: leftMesh,
        velocity: new THREE.Vector3(-18, 0, -420),
        damage: 25,
        alive: true,
        age: 0,
      });

      const rightMesh = new THREE.Mesh(geo, this.laserMatCyan);
      rightMesh.position.copy(rightCannonPos);
      this.scene.add(rightMesh);
      this.playerLasers.push({
        mesh: rightMesh,
        velocity: new THREE.Vector3(18, 0, -420),
        damage: 25,
        alive: true,
        age: 0,
      });
    }
  }

  /**
   * Fires a single high-velocity armor-piercing kinetic bullet down the center axis (1 Finger)
   */
  public fireSingleBullet(origin: THREE.Vector3) {
    const geo = new THREE.CylinderGeometry(0.14, 0.14, 5.5, 6);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    this.playerLasers.push({
      mesh,
      velocity: new THREE.Vector3(0, 0, -560),
      damage: 75,
      alive: true,
      age: 0,
      radius: 1.4,
    });
  }

  /**
   * Fires an energized glowing plasma sphere that causes large AOE damage (3 Fingers)
   */
  public firePlasmaSphere(origin: THREE.Vector3) {
    const geo = new THREE.SphereGeometry(1.6, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    this.playerLasers.push({
      mesh,
      velocity: new THREE.Vector3(0, 0, -320),
      damage: 180,
      alive: true,
      age: 0,
      radius: 4.8,
    });
  }

  /**
   * Fires a concentrated piercing hyper laser beam (5 Fingers)
   */
  public fireLaserBeam(leftPos: THREE.Vector3, rightPos: THREE.Vector3) {
    const center = leftPos.clone().lerp(rightPos, 0.5);
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 30, 8);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(center);
    mesh.position.z -= 15;
    this.scene.add(mesh);

    this.playerLasers.push({
      mesh,
      velocity: new THREE.Vector3(0, 0, -680),
      damage: 110,
      alive: true,
      age: 0,
      radius: 2.8,
    });
  }

  /**
   * Launches a Sidewinder guided missile with target seeking
   */
  public fireMissile(origin: THREE.Vector3, targetEnemyId: number | null) {
    const group = createMissileModel();
    group.position.copy(origin);
    group.position.y -= 0.6;
    this.scene.add(group);

    this.guidedMissiles.push({
      group,
      velocity: new THREE.Vector3(0, -2, -180), // Initial drop then booster ignite
      targetEnemyId,
      speed: 260,
      turnRate: 3.5,
      damage: 250,
      radius: 18.0, // Large AOE detonation blast radius
      alive: true,
      age: 0,
      lastSmokeTime: 0,
    });
  }

  /**
   * Spawns incoming enemy plasma fire
   */
  public spawnEnemyLaser(origin: THREE.Vector3, dir: THREE.Vector3) {
    const geo = new THREE.CylinderGeometry(0.12, 0.12, 3.2, 6);
    geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, this.laserMatAmber);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    this.enemyLasers.push({
      mesh,
      velocity: dir.clone().multiplyScalar(190),
      damage: 18,
      alive: true,
      age: 0,
    });
  }

  /**
   * Updates all projectiles in flight
   */
  public update(
    delta: number,
    getEnemyPos: (id: number) => THREE.Vector3 | null
  ) {
    const now = performance.now();

    // 1. Update Player Lasers
    for (let i = this.playerLasers.length - 1; i >= 0; i--) {
      const l = this.playerLasers[i];
      l.mesh.position.addScaledVector(l.velocity, delta);
      l.age += delta;

      if (l.mesh.position.z < -800 || l.age > 2.5 || !l.alive) {
        this.scene.remove(l.mesh);
        this.playerLasers.splice(i, 1);
      }
    }

    // 2. Update Guided Missiles
    for (let i = this.guidedMissiles.length - 1; i >= 0; i--) {
      const m = this.guidedMissiles[i];
      m.age += delta;

      // Homing guidance logic
      if (m.targetEnemyId !== null) {
        const targetPos = getEnemyPos(m.targetEnemyId);
        if (targetPos) {
          const desiredDir = targetPos.clone().sub(m.group.position).normalize();
          m.velocity.lerp(desiredDir.multiplyScalar(m.speed), m.turnRate * delta);
          m.group.lookAt(m.group.position.clone().add(m.velocity));
        }
      }

      m.group.position.addScaledVector(m.velocity, delta);

      // Emit rocket smoke trail
      if (now - m.lastSmokeTime > 40) {
        m.lastSmokeTime = now;
        this.effects.spawnSmoke(m.group.position.clone(), 0xd1d5db, 0.4);
      }

      if (m.group.position.z < -850 || m.age > 4.0 || !m.alive) {
        this.scene.remove(m.group);
        this.guidedMissiles.splice(i, 1);
      }
    }

    // 3. Update Enemy Lasers
    for (let i = this.enemyLasers.length - 1; i >= 0; i--) {
      const e = this.enemyLasers[i];
      e.mesh.position.addScaledVector(e.velocity, delta);
      e.age += delta;

      if (e.mesh.position.z > 50 || e.age > 3.0 || !e.alive) {
        this.scene.remove(e.mesh);
        this.enemyLasers.splice(i, 1);
      }
    }
  }
}
