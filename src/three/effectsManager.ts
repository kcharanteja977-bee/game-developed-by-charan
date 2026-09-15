/**
 * effectsManager.ts - 3D Particle Systems, Explosions, Lasers, & Smoke Plumes
 * Provides visual effects for laser bolts, missile smoke trails, afterburner flames,
 * shockwaves, and multi-stage fireball explosions.
 */

import * as THREE from 'three';

export interface Explosion3D {
  group: THREE.Group;
  fireball: THREE.Mesh;
  shockwave: THREE.Mesh;
  sparks: THREE.Points;
  sparkVelocities: THREE.Vector3[];
  light: THREE.PointLight;
  age: number;
  maxAge: number;
  isLarge: boolean;
}

export interface Bullet3D {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  alive: boolean;
  age: number;
}

export interface Missile3D {
  group: THREE.Group;
  velocity: THREE.Vector3;
  targetEnemy: THREE.Group | null;
  alive: boolean;
  age: number;
}

export interface SmokeParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  scaleGrowth: number;
  age: number;
  maxAge: number;
}

export class EffectsManager {
  private scene: THREE.Scene;
  public explosions: Explosion3D[] = [];
  public bullets: Bullet3D[] = [];
  public missiles: Missile3D[] = [];
  public smokeParticles: SmokeParticle[] = [];

  // Shared reusable materials
  private laserMatCyan: THREE.MeshBasicMaterial;
  private laserMatAmber: THREE.MeshBasicMaterial;
  private smokeMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.laserMatCyan = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
    });

    this.laserMatAmber = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.95,
    });

    this.smokeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.6,
      roughness: 0.9,
      flatShading: true,
    });
  }

  /**
   * Spawns a high-velocity laser bolt with perspective length
   */
  public spawnBullet(
    origin: THREE.Vector3,
    velocity: THREE.Vector3,
    damage: number = 25,
    isAmber: boolean = false
  ): Bullet3D {
    const geo = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6);
    geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, isAmber ? this.laserMatAmber : this.laserMatCyan);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    const bullet: Bullet3D = {
      mesh,
      velocity,
      damage,
      alive: true,
      age: 0,
    };
    this.bullets.push(bullet);
    return bullet;
  }

  /**
   * Spawns a guided heavy missile with smoke trail
   */
  public spawnMissile(
    missileGroup: THREE.Group,
    origin: THREE.Vector3,
    target: THREE.Group | null
  ): Missile3D {
    missileGroup.position.copy(origin);
    this.scene.add(missileGroup);

    const missile: Missile3D = {
      group: missileGroup,
      velocity: new THREE.Vector3(0, 0, -180),
      targetEnemy: target,
      alive: true,
      age: 0,
    };
    this.missiles.push(missile);
    return missile;
  }

  /**
   * Spawns a smoke particle for missile trail or engine heat
   */
  public spawnSmoke(position: THREE.Vector3, color: number = 0x94a3b8, initialScale: number = 0.4) {
    const geo = new THREE.DodecahedronGeometry(initialScale, 0);
    const mat = this.smokeMat.clone();
    mat.color.setHex(color);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    this.scene.add(mesh);

    this.smokeParticles.push({
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2 + 1,
        Math.random() * 4 + 10 // Pushed back by forward airspeed
      ),
      scaleGrowth: 2.8,
      age: 0,
      maxAge: 0.45 + Math.random() * 0.25,
    });
  }

  /**
   * Creates a multi-stage 3D Explosion (Fireball + Shockwave ring + Sparks + Light Flash)
   */
  public createExplosion(position: THREE.Vector3, isLarge: boolean = false): Explosion3D {
    const group = new THREE.Group();
    group.position.copy(position);
    this.scene.add(group);

    // 1. Expanding Fireball Core
    const fireGeo = new THREE.IcosahedronGeometry(isLarge ? 4.5 : 2.5, 2);
    const fireMat = new THREE.MeshBasicMaterial({
      color: isLarge ? 0xff4500 : 0xff7700,
      wireframe: false,
    });
    const fireball = new THREE.Mesh(fireGeo, fireMat);
    group.add(fireball);

    // 2. Expanding Shockwave Ring
    const shockGeo = new THREE.RingGeometry(0.1, isLarge ? 1.5 : 0.8, 24);
    shockGeo.rotateX(Math.PI / 2);
    const shockMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a, // Bright yellow/white
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const shockwave = new THREE.Mesh(shockGeo, shockMat);
    group.add(shockwave);

    // 3. Glowing Sparks Particles
    const sparkCount = isLarge ? 45 : 24;
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities: THREE.Vector3[] = [];

    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = 0;
      sparkPositions[i * 3 + 1] = 0;
      sparkPositions[i * 3 + 2] = 0;

      const speed = (isLarge ? 40 : 25) + Math.random() * (isLarge ? 30 : 15);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      sparkVelocities.push(
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed,
          Math.cos(phi) * speed
        )
      );
    }

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: isLarge ? 0.8 : 0.5,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    group.add(sparks);

    // 4. Dynamic PointLight Flash
    const light = new THREE.PointLight(0xff6b00, isLarge ? 8 : 4, isLarge ? 120 : 60);
    group.add(light);

    const explosion: Explosion3D = {
      group,
      fireball,
      shockwave,
      sparks,
      sparkVelocities,
      light,
      age: 0,
      maxAge: isLarge ? 0.85 : 0.55,
      isLarge,
    };
    this.explosions.push(explosion);
    return explosion;
  }

  /**
   * Updates all active particles, explosions, bullets, and missiles
   */
  public update(delta: number) {
    // 1. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.mesh.position.addScaledVector(b.velocity, delta);
      b.age += delta;

      // Remove after travel distance or time
      if (b.mesh.position.z < -900 || b.age > 3.0 || !b.alive) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        this.bullets.splice(i, 1);
      }
    }

    // 2. Update Missiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.age += delta;

      // Homing steer toward target if available
      if (m.targetEnemy && m.targetEnemy.parent) {
        const targetPos = m.targetEnemy.position;
        const dir = new THREE.Vector3().subVectors(targetPos, m.group.position).normalize();
        m.velocity.lerp(dir.multiplyScalar(220), 0.08);
      }

      m.group.position.addScaledVector(m.velocity, delta);

      // Spawn rocket smoke puffs
      this.spawnSmoke(m.group.position, 0xf8fafc, 0.3);

      if (m.group.position.z < -900 || m.age > 4.5 || !m.alive) {
        this.scene.remove(m.group);
        this.missiles.splice(i, 1);
      }
    }

    // 3. Update Smoke Particles
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const s = this.smokeParticles[i];
      s.age += delta;
      s.mesh.position.addScaledVector(s.velocity, delta);
      const progress = s.age / s.maxAge;
      s.mesh.scale.addScalar(s.scaleGrowth * delta);
      (s.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.6 * (1 - progress));

      if (s.age >= s.maxAge) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        this.smokeParticles.splice(i, 1);
      }
    }

    // 4. Update Explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.age += delta;
      const progress = exp.age / exp.maxAge;

      // Expand fireball & fade
      const fireScale = 1 + progress * (exp.isLarge ? 5.5 : 3.5);
      exp.fireball.scale.set(fireScale, fireScale, fireScale);
      (exp.fireball.material as THREE.MeshBasicMaterial).color.setHSL(
        0.08 - progress * 0.08,
        1,
        Math.max(0.2, 0.8 - progress * 0.7)
      );

      // Expand shockwave
      const shockScale = 1 + progress * (exp.isLarge ? 24 : 14);
      exp.shockwave.scale.set(shockScale, shockScale, shockScale);
      (exp.shockwave.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * (1 - progress));

      // Move spark particles
      const positions = exp.sparks.geometry.attributes.position.array as Float32Array;
      for (let s = 0; s < exp.sparkVelocities.length; s++) {
        const vel = exp.sparkVelocities[s];
        positions[s * 3] += vel.x * delta;
        positions[s * 3 + 1] += vel.y * delta;
        positions[s * 3 + 2] += vel.z * delta;
        vel.y -= 12 * delta; // Gravity
      }
      exp.sparks.geometry.attributes.position.needsUpdate = true;
      (exp.sparks.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - progress);

      // Fade light
      exp.light.intensity = Math.max(0, (exp.isLarge ? 8 : 4) * (1 - progress));

      if (exp.age >= exp.maxAge) {
        this.scene.remove(exp.group);
        exp.fireball.geometry.dispose();
        (exp.fireball.material as THREE.Material).dispose();
        exp.shockwave.geometry.dispose();
        (exp.shockwave.material as THREE.Material).dispose();
        exp.sparks.geometry.dispose();
        (exp.sparks.material as THREE.Material).dispose();
        this.explosions.splice(i, 1);
      }
    }
  }

  public dispose() {
    this.bullets.forEach((b) => this.scene.remove(b.mesh));
    this.missiles.forEach((m) => this.scene.remove(m.group));
    this.smokeParticles.forEach((s) => this.scene.remove(s.mesh));
    this.explosions.forEach((e) => this.scene.remove(e.group));
    this.bullets = [];
    this.missiles = [];
    this.smokeParticles = [];
    this.explosions = [];
  }
}
