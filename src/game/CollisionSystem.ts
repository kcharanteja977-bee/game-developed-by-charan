/**
 * CollisionSystem.ts - 3D Spatial Collision Detection & Damage Resolution
 * Computes spherical bounding collisions for:
 * - Player plasma bolts vs. Enemy aircraft
 * - Sidewinder missiles vs. Enemy aircraft (with multi-target AOE shockwaves)
 * - Enemy aircraft & plasma bolts vs. Player aircraft and Energy Shield
 */

import * as THREE from 'three';
import { PlayerAircraft } from './PlayerAircraft';
import { EnemyManager, EnemyAircraft3D } from './EnemyManager';
import { ProjectileManager } from './ProjectileManager';
import { EffectsManager } from '../three/effectsManager';
import { AudioManager } from '../audio/AudioManager';
import { CameraController } from '../rendering/CameraController';

export interface CollisionResults {
  scoreGained: number;
  enemiesKilled: number;
  playerDamaged: boolean;
  damageAmount: number;
}

export class CollisionSystem {
  private effects: EffectsManager;
  private audio: AudioManager;
  private cameraCtrl: CameraController;

  constructor(effects: EffectsManager, cameraCtrl: CameraController) {
    this.effects = effects;
    this.audio = AudioManager.getInstance();
    this.cameraCtrl = cameraCtrl;
  }

  public checkCollisions(
    player: PlayerAircraft,
    enemyMgr: EnemyManager,
    projectileMgr: ProjectileManager,
    isShieldActive: boolean,
    shieldEnergy: number,
    onConsumeShield: (amount: number) => void
  ): CollisionResults {
    let scoreGained = 0;
    let enemiesKilled = 0;
    let playerDamaged = false;
    let damageAmount = 0;

    const playerPos = player.position;

    // 1. Player Lasers vs. Enemy Aircraft
    for (let lIdx = projectileMgr.playerLasers.length - 1; lIdx >= 0; lIdx--) {
      const laser = projectileMgr.playerLasers[lIdx];
      if (!laser.alive) continue;

      const laserPos = laser.mesh.position;

      for (let eIdx = enemyMgr.enemies.length - 1; eIdx >= 0; eIdx--) {
        const enemy = enemyMgr.enemies[eIdx];
        const dist = laserPos.distanceTo(enemy.group.position);

        if (dist < enemy.radius + 1.2) {
          laser.alive = false;
          enemy.hp -= laser.damage;

          // Impact sparks & smoke
          this.effects.createExplosion(laserPos.clone(), false);

          if (enemy.hp <= 0) {
            // Destroyed!
            scoreGained += enemy.scoreValue;
            enemiesKilled++;
            this.effects.createExplosion(enemy.group.position.clone(), enemy.type === 'GUNSHIP');
            this.audio.playExplosion(enemy.type === 'GUNSHIP');
            this.cameraCtrl.addTrauma(enemy.type === 'GUNSHIP' ? 0.35 : 0.15);
            enemyMgr.removeEnemy(enemy.id);
          }
          break;
        }
      }
    }

    // 2. Guided Missiles vs. Enemy Aircraft (AOE Detonation)
    for (let mIdx = projectileMgr.guidedMissiles.length - 1; mIdx >= 0; mIdx--) {
      const missile = projectileMgr.guidedMissiles[mIdx];
      if (!missile.alive) continue;

      const missilePos = missile.group.position;

      for (let eIdx = enemyMgr.enemies.length - 1; eIdx >= 0; eIdx--) {
        const enemy = enemyMgr.enemies[eIdx];
        const dist = missilePos.distanceTo(enemy.group.position);

        if (dist < enemy.radius + 3.0) {
          missile.alive = false;

          // Huge cinematic explosion
          this.effects.createExplosion(missilePos.clone(), true);
          this.audio.playExplosion(true);
          this.cameraCtrl.addTrauma(0.55);

          // AOE blast damage to nearby enemies
          for (let nearIdx = enemyMgr.enemies.length - 1; nearIdx >= 0; nearIdx--) {
            const nearEnemy = enemyMgr.enemies[nearIdx];
            const blastDist = missilePos.distanceTo(nearEnemy.group.position);
            if (blastDist <= missile.radius) {
              const falloff = 1 - blastDist / missile.radius;
              nearEnemy.hp -= missile.damage * falloff;
              if (nearEnemy.hp <= 0) {
                scoreGained += nearEnemy.scoreValue;
                enemiesKilled++;
                this.effects.createExplosion(nearEnemy.group.position.clone(), nearEnemy.type === 'GUNSHIP');
                enemyMgr.removeEnemy(nearEnemy.id);
              }
            }
          }
          break;
        }
      }
    }

    // 3. Enemy Aircraft vs. Player Aircraft & Shield
    for (let eIdx = enemyMgr.enemies.length - 1; eIdx >= 0; eIdx--) {
      const enemy = enemyMgr.enemies[eIdx];
      const dist = enemy.group.position.distanceTo(playerPos);
      const effectiveRadius = isShieldActive && shieldEnergy > 5 ? 5.2 : player.collisionRadius + enemy.radius;

      if (dist < effectiveRadius) {
        if (isShieldActive && shieldEnergy > 10) {
          // Shield absorbs and deflects impact!
          onConsumeShield(25);
          this.audio.playShieldDeflect();
          this.effects.createExplosion(enemy.group.position.clone(), false);
          this.cameraCtrl.addTrauma(0.2);
          enemy.hp -= 120;
          if (enemy.hp <= 0) {
            scoreGained += enemy.scoreValue;
            enemiesKilled++;
            enemyMgr.removeEnemy(enemy.id);
          }
        } else {
          // Direct hull collision
          playerDamaged = true;
          damageAmount += 30;
          this.effects.createExplosion(playerPos.clone(), true);
          this.audio.playExplosion(true);
          this.cameraCtrl.addTrauma(0.65);
          enemyMgr.removeEnemy(enemy.id);
        }
      }
    }

    // 4. Enemy Lasers vs. Player Aircraft & Shield
    for (let lIdx = projectileMgr.enemyLasers.length - 1; lIdx >= 0; lIdx--) {
      const laser = projectileMgr.enemyLasers[lIdx];
      if (!laser.alive) continue;

      const dist = laser.mesh.position.distanceTo(playerPos);
      const hitRadius = isShieldActive && shieldEnergy > 5 ? 4.8 : player.collisionRadius;

      if (dist < hitRadius) {
        laser.alive = false;
        if (isShieldActive && shieldEnergy > 5) {
          onConsumeShield(12);
          this.audio.playShieldDeflect();
          this.effects.createExplosion(laser.mesh.position.clone(), false);
        } else {
          playerDamaged = true;
          damageAmount += laser.damage;
          this.audio.playLaser(false);
          this.effects.createExplosion(laser.mesh.position.clone(), false);
          this.cameraCtrl.addTrauma(0.25);
        }
      }
    }

    return {
      scoreGained,
      enemiesKilled,
      playerDamaged,
      damageAmount,
    };
  }
}
