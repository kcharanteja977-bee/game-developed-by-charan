/**
 * GameCanvas.tsx - Real-time 60 FPS HTML5 Canvas Airplane Combat Engine
 * Replicates the exact mechanics, physics, and visual aesthetics of the Pygame version.
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, RotateCcw, Volume2, VolumeX, Shield, 
  Flame, Crosshair, HelpCircle, Hand, Award, Zap, Sparkles, ChevronsUp
} from 'lucide-react';
import { HandState, Bullet, Bomb, BombExplosion, Enemy, Particle, Shockwave, Star, PowerUp, FloatingText } from '../types';
import { sounds } from '../audio';

interface GameCanvasProps {
  handState: HandState;
  onSimulateGesture: (action: 'SHOOT' | 'BOMB' | 'SHIELD' | 'STOP') => void;
}

const CANVAS_WIDTH = 840;
const CANVAS_HEIGHT = 650;

export const GameCanvas: React.FC<GameCanvasProps> = ({ handState, onSimulateGesture }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [lives, setLives] = useState(3);
  const [shieldEnergy, setShieldEnergy] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [wave, setWave] = useState(1);
  const [enemiesDestroyed, setEnemiesDestroyed] = useState(0);
  const [flightSpeed, setFlightSpeed] = useState(1.0);
  const [rapidFireSeconds, setRapidFireSeconds] = useState(0);
  const [tripleShotSeconds, setTripleShotSeconds] = useState(0);

  // Refs for animation loop
  const stateRef = useRef({
    score: 0,
    highScore: 0,
    health: 100,
    lives: 3,
    shieldEnergy: 100,
    shieldActive: false,
    gameOver: false,
    playerX: CANVAS_WIDTH / 2,
    playerTargetX: CANVAS_WIDTH / 2,
    playerY: CANVAS_HEIGHT - 80,
    lastBulletTime: 0,
    lastBombTime: 0,
    lastEnemySpawn: 0,
    invulnerableUntil: 0,
    rapidFireUntil: 0,
    tripleShotUntil: 0,
    currentSpeedMultiplier: 1.0,
    targetSpeedMultiplier: 1.0,
    handState,
    bullets: [] as Bullet[],
    bombs: [] as Bomb[],
    bombExplosions: [] as BombExplosion[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    shockwaves: [] as Shockwave[],
    stars: [] as Star[],
    powerUps: [] as PowerUp[],
    floatingTexts: [] as FloatingText[],
    nebulae: [
      { x: CANVAS_WIDTH * 0.25, y: 150, radius: 240, color: 'rgba(99, 102, 241, 0.04)', speed: 0.18 },
      { x: CANVAS_WIDTH * 0.72, y: 440, radius: 280, color: 'rgba(56, 189, 248, 0.035)', speed: 0.24 },
      { x: CANVAS_WIDTH * 0.48, y: -60, radius: 220, color: 'rgba(168, 85, 247, 0.04)', speed: 0.15 },
    ],
    nextId: 1,
    enemiesKilled: 0,
  });

  // Keep ref synced with props
  useEffect(() => {
    stateRef.current.handState = handState;
  }, [handState]);

  // Sound mute toggle
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.setMuted(next);
  };

  // Initialize multi-layer parallax stars on mount
  useEffect(() => {
    const stars: Star[] = [];

    // Layer 0: Distant micro stellar dust (65 stars)
    for (let i = 0; i < 65; i++) {
      const baseSpeed = 0.6 + Math.random() * 0.8;
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        speed: baseSpeed,
        baseSpeed,
        size: 0.9 + Math.random() * 0.4,
        brightness: 130 + Math.floor(Math.random() * 60),
        layer: 0,
        color: ['#93c5fd', '#c4b5fd', '#fde68a', '#94a3b8'][Math.floor(Math.random() * 4)],
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.002 + Math.random() * 0.004,
      });
    }

    // Layer 1: Mid-distance stellar plane (55 stars)
    for (let i = 0; i < 55; i++) {
      const baseSpeed = 1.8 + Math.random() * 1.5;
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        speed: baseSpeed,
        baseSpeed,
        size: 1.5 + Math.random() * 0.8,
        brightness: 200 + Math.floor(Math.random() * 45),
        layer: 1,
        color: ['#ffffff', '#bae6fd', '#e0f2fe'][Math.floor(Math.random() * 3)],
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.003 + Math.random() * 0.003,
      });
    }

    // Layer 2: Foreground high-speed stars with motion streaks (30 stars)
    for (let i = 0; i < 30; i++) {
      const baseSpeed = 4.6 + Math.random() * 3.4;
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        speed: baseSpeed,
        baseSpeed,
        size: 2.4 + Math.random() * 1.0,
        brightness: 245 + Math.floor(Math.random() * 10),
        layer: 2,
        color: '#ffffff',
      });
    }

    stateRef.current.stars = stars;
  }, []);

  // Main Game Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const dt = Math.min(64, timestamp - lastTimestamp);
      lastTimestamp = timestamp;

      const state = stateRef.current;

      // ----------------------------------------------------
      // 1. INPUT HANDLING & GESTURES
      // ----------------------------------------------------
      const hs = state.handState;

      if (!state.gameOver) {
        // Horizontal steering: smoothly interpolate player position toward hand target X
        const margin = 40;
        state.playerTargetX = margin + hs.handX * (CANVAS_WIDTH - 2 * margin);
        state.playerX += (state.playerTargetX - state.playerX) * 0.22;

        // Weapon Actions
        if (hs.action === 'SHOOT LASER') {
          state.shieldActive = false;
          // Check active power-ups
          const isRapid = timestamp < state.rapidFireUntil;
          const isTriple = timestamp < state.tripleShotUntil;
          const bulletCooldown = isRapid ? 95 : 220;

          if (timestamp - state.lastBulletTime >= bulletCooldown) {
            const bulletColor = isRapid ? '#f59e0b' : (isTriple ? '#38bdf8' : '#facc15');

            if (isTriple) {
              // Center laser
              state.bullets.push({
                id: state.nextId++,
                x: state.playerX,
                y: state.playerY - 26,
                speed: isRapid ? 16 : 14.5,
                damage: 25,
                width: isRapid ? 5 : 4,
                height: 18,
                vx: 0,
                color: bulletColor,
              });
              // Left angled laser
              state.bullets.push({
                id: state.nextId++,
                x: state.playerX - 16,
                y: state.playerY - 18,
                speed: isRapid ? 15 : 13.5,
                damage: 22,
                width: isRapid ? 5 : 4,
                height: 16,
                vx: -2.8,
                color: bulletColor,
              });
              // Right angled laser
              state.bullets.push({
                id: state.nextId++,
                x: state.playerX + 16,
                y: state.playerY - 18,
                speed: isRapid ? 15 : 13.5,
                damage: 22,
                width: isRapid ? 5 : 4,
                height: 16,
                vx: 2.8,
                color: bulletColor,
              });
            } else {
              // Standard or Rapid single laser
              state.bullets.push({
                id: state.nextId++,
                x: state.playerX,
                y: state.playerY - 24,
                speed: isRapid ? 16 : 14,
                damage: 25,
                width: isRapid ? 5 : 4,
                height: isRapid ? 22 : 18,
                vx: 0,
                color: bulletColor,
              });
            }
            state.lastBulletTime = timestamp;
            sounds.playLaser();
          }
        } else if (hs.action === 'AOE BOMB') {
          state.shieldActive = false;
          // Special bomb firing (1400ms cooldown)
          if (timestamp - state.lastBombTime >= 1400) {
            state.bombs.push({
              id: state.nextId++,
              x: state.playerX,
              y: state.playerY - 24,
              speed: 8.5,
              damage: 100,
              radius: 9,
            });
            state.lastBombTime = timestamp;
            sounds.playBombLaunch();
          }
        } else if (hs.action === 'ENERGY SHIELD') {
          if (state.shieldEnergy > 5) {
            state.shieldActive = true;
          } else {
            state.shieldActive = false;
          }
        } else {
          // Closed fist or none -> Hold fire
          state.shieldActive = false;
        }

        // Shield energy charge/drain
        if (state.shieldActive) {
          state.shieldEnergy = Math.max(0, state.shieldEnergy - dt * 0.04);
          if (state.shieldEnergy <= 0) {
            state.shieldActive = false;
          }
        } else {
          state.shieldEnergy = Math.min(100, state.shieldEnergy + dt * 0.025);
        }
      } else {
        // If game over, Open Palm gesture restarts!
        if (hs.action === 'ENERGY SHIELD') {
          resetGame();
        }
      }

      // ----------------------------------------------------
      // 2. PHYSICS & SPAWN UPDATES
      // ----------------------------------------------------
      // Difficulty flight speed scaling based on score, wave, and kills
      const targetSpeedMult = 1.0 + Math.min(2.2, (state.score / 1200) * 0.35 + (Math.floor(state.score / 1000)) * 0.3 + (state.enemiesKilled * 0.015));
      state.currentSpeedMultiplier += (targetSpeedMult - state.currentSpeedMultiplier) * 0.05;
      const speedMult = state.currentSpeedMultiplier;

      // Update multi-layer parallax stars with speed multiplier
      for (const star of state.stars) {
        star.speed = star.baseSpeed * speedMult;
        star.y += star.speed;
        if (star.y > CANVAS_HEIGHT + 40) {
          star.y = -20;
          star.x = Math.random() * CANVAS_WIDTH;
        }
      }

      // Update cosmic nebula clouds drifting in deep background
      for (const neb of state.nebulae) {
        neb.y += neb.speed * speedMult;
        if (neb.y - neb.radius > CANVAS_HEIGHT) {
          neb.y = -neb.radius;
          neb.x = Math.random() * CANVAS_WIDTH;
        }
      }

      if (!state.gameOver) {
        // Enemy spawning
        const spawnInterval = Math.max(700, 1200 - Math.floor(state.score / 600) * 100);
        if (timestamp - state.lastEnemySpawn > spawnInterval) {
          const isHeavy = Math.random() < 0.28;
          state.enemies.push({
            id: state.nextId++,
            x: 40 + Math.random() * (CANVAS_WIDTH - 80),
            y: -50,
            type: isHeavy ? 'HEAVY' : 'SCOUT',
            hp: isHeavy ? 75 : 25,
            maxHp: isHeavy ? 75 : 25,
            speed: isHeavy ? 2.0 + Math.random() * 0.8 : 3.0 + Math.random() * 1.5,
            width: isHeavy ? 54 : 38,
            height: isHeavy ? 46 : 34,
            swayOffset: Math.random() * Math.PI * 2,
            swaySpeed: 0.03 + Math.random() * 0.03,
            scoreValue: isHeavy ? 250 : 100,
          });
          state.lastEnemySpawn = timestamp;
        }

        // Update normal bullets
        for (let i = state.bullets.length - 1; i >= 0; i--) {
          const b = state.bullets[i];
          b.y -= b.speed;
          if (b.vx) {
            b.x += b.vx;
          }
          if (b.y < -30 || b.x < -30 || b.x > CANVAS_WIDTH + 30) {
            state.bullets.splice(i, 1);
          }
        }

        // Update bombs
        for (let i = state.bombs.length - 1; i >= 0; i--) {
          const bm = state.bombs[i];
          bm.y -= bm.speed;

          // Detonate when high up or triggered
          if (bm.y < 80) {
            detonateBomb(bm.x, bm.y);
            state.bombs.splice(i, 1);
          }
        }

        // Update AOE Bomb Explosions
        for (let i = state.bombExplosions.length - 1; i >= 0; i--) {
          const be = state.bombExplosions[i];
          be.currentRadius += 8.5;

          // Hit detection against all active enemies inside blast radius
          for (const enemy of state.enemies) {
            if (!be.hitEnemies.has(enemy.id)) {
              const dist = Math.hypot(enemy.x - be.x, enemy.y - be.y);
              if (dist <= be.currentRadius + enemy.width / 2) {
                be.hitEnemies.add(enemy.id);
                enemy.hp -= be.damage;
                createSparks(enemy.x, enemy.y, '#f97316', 10);
                if (enemy.hp <= 0) {
                  triggerEnemyKill(enemy, true);
                }
              }
            }
          }

          if (be.currentRadius >= be.maxRadius) {
            state.bombExplosions.splice(i, 1);
          }
        }

        // Update Enemies & Collisions
        for (let i = state.enemies.length - 1; i >= 0; i--) {
          const enemy = state.enemies[i];
          enemy.y += enemy.speed;
          enemy.swayOffset += enemy.swaySpeed;
          enemy.x += Math.sin(enemy.swayOffset) * 1.2;

          // Collision with Bullets
          for (let j = state.bullets.length - 1; j >= 0; j--) {
            const b = state.bullets[j];
            if (
              b.x >= enemy.x - enemy.width / 2 &&
              b.x <= enemy.x + enemy.width / 2 &&
              b.y >= enemy.y - enemy.height / 2 &&
              b.y <= enemy.y + enemy.height / 2
            ) {
              // Bullet hit!
              state.bullets.splice(j, 1);
              enemy.hp -= b.damage;
              createSparks(b.x, b.y, '#facc15', 6);
              sounds.playEnemyHit();

              if (enemy.hp <= 0) {
                triggerEnemyKill(enemy, false);
                break;
              }
            }
          }

          // Collision with direct Bomb rocket
          for (let j = state.bombs.length - 1; j >= 0; j--) {
            const bm = state.bombs[j];
            const dist = Math.hypot(enemy.x - bm.x, enemy.y - bm.y);
            if (dist < enemy.width / 2 + bm.radius) {
              detonateBomb(bm.x, bm.y);
              state.bombs.splice(j, 1);
              break;
            }
          }

          // Collision with Player
          if (enemy.hp > 0) {
            const distToPlayer = Math.hypot(enemy.x - state.playerX, enemy.y - state.playerY);
            if (distToPlayer < 42) {
              // Enemy crashes into player
              createExplosion(enemy.x, enemy.y, true);
              enemy.hp = 0;
              state.enemies.splice(i, 1);

              if (state.shieldActive) {
                sounds.playShieldHum();
                createShockwave(state.playerX, state.playerY, 50, '#38bdf8');
              } else {
                takePlayerDamage(25);
              }
              continue;
            }
          }

          // Enemy reaches bottom edge
          if (enemy.y > CANVAS_HEIGHT + 40) {
            state.enemies.splice(i, 1);
            if (!state.shieldActive) {
              takePlayerDamage(10);
            }
          }
        }

        // Filter destroyed enemies
        state.enemies = state.enemies.filter((e) => e.hp > 0);
      }

      // Update particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          state.particles.splice(i, 1);
        }
      }

      // Update shockwaves
      for (let i = state.shockwaves.length - 1; i >= 0; i--) {
        const sw = state.shockwaves[i];
        sw.radius += 5.5;
        sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
        if (sw.radius >= sw.maxRadius) {
          state.shockwaves.splice(i, 1);
        }
      }

      // Update Power-Ups and Check Collection with Player Airplane
      for (let i = state.powerUps.length - 1; i >= 0; i--) {
        const pu = state.powerUps[i];
        pu.y += pu.vy;
        pu.bobPhase += 0.055;
        pu.x += Math.sin(pu.bobPhase) * 0.75;
        pu.x = Math.max(25, Math.min(CANVAS_WIDTH - 25, pu.x));

        // Check if player aircraft intercepts the power-up item
        if (!state.gameOver) {
          const distToPlayer = Math.hypot(pu.x - state.playerX, pu.y - state.playerY);
          if (distToPlayer < 40) {
            sounds.playPowerUp();
            const powerColor = pu.type === 'RAPID_FIRE' ? '#f59e0b' : (pu.type === 'TRIPLE_SHOT' ? '#06b6d4' : '#10b981');
            createShockwave(state.playerX, state.playerY, 80, powerColor);
            createSparks(pu.x, pu.y, powerColor, 22);

            if (pu.type === 'RAPID_FIRE') {
              state.rapidFireUntil = Math.max(state.rapidFireUntil, timestamp) + 12000;
              state.floatingTexts.push({
                id: state.nextId++,
                x: state.playerX,
                y: state.playerY - 45,
                text: '⚡ RAPID FIRE (12s)!',
                color: '#f59e0b',
                alpha: 1.0,
                vy: 1.2,
              });
            } else if (pu.type === 'TRIPLE_SHOT') {
              state.tripleShotUntil = Math.max(state.tripleShotUntil, timestamp) + 12000;
              state.floatingTexts.push({
                id: state.nextId++,
                x: state.playerX,
                y: state.playerY - 45,
                text: '🔱 TRIPLE SHOT (12s)!',
                color: '#38bdf8',
                alpha: 1.0,
                vy: 1.2,
              });
            } else if (pu.type === 'SHIELD_BOOST') {
              state.shieldEnergy = Math.min(100, state.shieldEnergy + 50);
              state.health = Math.min(100, state.health + 25);
              state.floatingTexts.push({
                id: state.nextId++,
                x: state.playerX,
                y: state.playerY - 45,
                text: '🛡️ SHIELD & REPAIR BOOST!',
                color: '#34d399',
                alpha: 1.0,
                vy: 1.2,
              });
            }

            state.powerUps.splice(i, 1);
            continue;
          }
        }

        // Drop out of screen
        if (pu.y > CANVAS_HEIGHT + 45) {
          state.powerUps.splice(i, 1);
        }
      }

      // Update Floating Combat / Announcement Texts
      for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.floatingTexts[i];
        ft.y -= ft.vy;
        ft.alpha -= 0.016;
        if (ft.alpha <= 0) {
          state.floatingTexts.splice(i, 1);
        }
      }

      // ----------------------------------------------------
      // 3. CANVAS RENDERING
      // ----------------------------------------------------
      // Deep space canvas background
      ctx.fillStyle = '#070b16';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw subtle drifting cosmic nebulae for spatial depth
      for (const neb of state.nebulae) {
        const grad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.radius);
        grad.addColorStop(0, neb.color);
        grad.addColorStop(1, 'rgba(7, 11, 22, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Multi-Layer Parallax Stars with high-speed flight streaks
      for (const star of state.stars) {
        const twinkle = star.twinkleSpeed
          ? Math.sin(timestamp * star.twinkleSpeed + (star.twinklePhase || 0)) * 0.25 + 0.75
          : 1;
        const alpha = Math.min(1, Math.max(0.2, (star.brightness / 255) * twinkle));

        if (star.layer === 2 && speedMult > 1.12) {
          // High-speed streak for foreground stars (stretches proportional to speed)
          const streakLen = Math.min(50, (star.speed * 2.2) * (0.8 + (speedMult - 1) * 0.85));
          const grad = ctx.createLinearGradient(star.x, star.y - streakLen, star.x, star.y);
          grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
          grad.addColorStop(0.5, `rgba(186, 230, 253, ${alpha * 0.7})`);
          grad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);

          ctx.save();
          ctx.strokeStyle = grad;
          ctx.lineWidth = Math.min(star.size, 2.6);
          ctx.beginPath();
          ctx.moveTo(star.x, star.y - streakLen);
          ctx.lineTo(star.x, star.y);
          ctx.stroke();

          // Star head point
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (star.layer === 1 && speedMult > 1.7) {
          // Subtle streak for mid-distance stars at hypersonic speed
          const streakLen = Math.min(18, star.speed * 1.3);
          ctx.save();
          ctx.strokeStyle = `rgba(224, 242, 254, ${alpha * 0.75})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(star.x, star.y - streakLen);
          ctx.lineTo(star.x, star.y);
          ctx.stroke();
          ctx.restore();
        } else {
          // Point stars with layer-specific coloring and twinkling
          ctx.save();
          ctx.fillStyle = star.color || `rgba(${star.brightness}, ${star.brightness}, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Draw Shockwaves
      for (const sw of state.shockwaves) {
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha;
        ctx.lineWidth = sw.lineWidth;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw AOE Bomb blast rings
      for (const be of state.bombExplosions) {
        ctx.save();
        const prog = be.currentRadius / be.maxRadius;
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 1 - prog;
        ctx.beginPath();
        ctx.arc(be.x, be.y, be.currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        if (be.currentRadius > 20) {
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(be.x, be.y, be.currentRadius - 15, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Power-Up Items (floating capsules with animated energy beacons)
      for (const pu of state.powerUps) {
        ctx.save();
        const pulse = Math.sin((timestamp + pu.id * 100) * 0.007) * 3;
        const color = pu.type === 'RAPID_FIRE' ? '#f59e0b' : (pu.type === 'TRIPLE_SHOT' ? '#06b6d4' : '#10b981');
        const secondaryColor = pu.type === 'RAPID_FIRE' ? '#fef3c7' : (pu.type === 'TRIPLE_SHOT' ? '#e0f2fe' : '#d1fae5');

        // Outer pulsing energy beacon halo
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 16 + pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glowing pod capsule
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icon symbol
        ctx.fillStyle = secondaryColor;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = pu.type === 'RAPID_FIRE' ? '⚡' : (pu.type === 'TRIPLE_SHOT' ? '3X' : '🛡');
        ctx.fillText(label, pu.x, pu.y);

        // Floating Title Pill underneath
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(pu.x - 26, pu.y + 17, 52, 14, 7);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textTag = pu.type === 'RAPID_FIRE' ? 'RAPID' : (pu.type === 'TRIPLE_SHOT' ? 'TRIPLE' : 'SHIELD');
        ctx.fillText(textTag, pu.x, pu.y + 24);

        ctx.restore();
      }

      // Draw Normal & Upgraded Bullets
      for (const b of state.bullets) {
        ctx.save();
        ctx.fillStyle = b.color || '#facc15';
        ctx.fillRect(b.x - b.width / 2, b.y, b.width, b.height);
        // Laser core glow
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Bombs
      for (const bm of state.bombs) {
        // Rocket head
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(bm.x, bm.y, bm.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(bm.x, bm.y, bm.radius - 3, 0, Math.PI * 2);
        ctx.fill();
        // Fiery exhaust
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(bm.x, bm.y + bm.radius + Math.random() * 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Enemies
      for (const enemy of state.enemies) {
        drawEnemy(ctx, enemy);
      }

      // Draw Player Fighter Jet
      if (!state.gameOver || (state.gameOver && state.lives > 0)) {
        const isInvulnerable = timestamp < state.invulnerableUntil;
        if (!isInvulnerable || Math.floor(timestamp / 100) % 2 === 0) {
          drawPlayer(ctx, state.playerX, state.playerY, state.shieldActive);
        }
      }

      // Draw Particles
      for (const p of state.particles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Floating Combat / Power-up Announcement Texts
      for (const ft of state.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = 'bold 13px ui-monospace, SFMono-Regular, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3.5;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      // Sync React HUD state periodically
      setScore(state.score);
      setHealth(Math.round(state.health));
      setLives(state.lives);
      setShieldEnergy(Math.round(state.shieldEnergy));
      setGameOver(state.gameOver);
      setWave(1 + Math.floor(state.score / 1000));
      setEnemiesDestroyed(state.enemiesKilled);
      setFlightSpeed(Number(state.currentSpeedMultiplier.toFixed(2)));

      // Sync power-up timer countdowns
      const rfRemaining = Math.max(0, Math.ceil((state.rapidFireUntil - timestamp) / 1000));
      const tsRemaining = Math.max(0, Math.ceil((state.tripleShotUntil - timestamp) / 1000));
      setRapidFireSeconds(rfRemaining);
      setTripleShotSeconds(tsRemaining);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const detonateBomb = (x: number, y: number) => {
    const state = stateRef.current;
    state.bombExplosions.push({
      id: state.nextId++,
      x,
      y,
      currentRadius: 10,
      maxRadius: 135,
      damage: 100,
      hitEnemies: new Set(),
    });
    createExplosion(x, y, true);
    createShockwave(x, y, 140, '#f97316');
    sounds.playBombExplosion();
  };

  const triggerEnemyKill = (enemy: Enemy, isBomb: boolean) => {
    const state = stateRef.current;
    const bonus = isBomb ? 50 : 0;
    state.score += enemy.scoreValue + bonus;
    state.enemiesKilled++;
    if (state.score > state.highScore) {
      state.highScore = state.score;
      setHighScore(state.score);
    }
    createExplosion(enemy.x, enemy.y, enemy.type === 'HEAVY');
    sounds.playBombExplosion();

    // Power-Up Drops: Destroying certain enemies drops items
    const dropProbability = enemy.type === 'HEAVY' ? 0.85 : 0.28;
    if (Math.random() < dropProbability) {
      const rand = Math.random();
      const pType = rand < 0.45 ? 'RAPID_FIRE' : (rand < 0.90 ? 'TRIPLE_SHOT' : 'SHIELD_BOOST');
      state.powerUps.push({
        id: state.nextId++,
        x: enemy.x,
        y: enemy.y,
        type: pType,
        vy: 1.5 + Math.random() * 0.5,
        width: 32,
        height: 32,
        spawnTime: performance.now(),
        bobPhase: Math.random() * Math.PI * 2,
      });

      const dropColor = pType === 'RAPID_FIRE' ? '#f59e0b' : (pType === 'TRIPLE_SHOT' ? '#06b6d4' : '#10b981');
      createSparks(enemy.x, enemy.y, dropColor, 8);
    }
  };

  const takePlayerDamage = (amount: number) => {
    const state = stateRef.current;
    const now = performance.now();
    if (now < state.invulnerableUntil) return;

    state.health -= amount;
    state.invulnerableUntil = now + 1200;

    if (state.health <= 0) {
      state.lives--;
      if (state.lives > 0) {
        state.health = 100;
        state.invulnerableUntil = now + 2000;
      } else {
        state.gameOver = true;
      }
    }
  };

  const createExplosion = (x: number, y: number, isLarge: boolean) => {
    const count = isLarge ? 32 : 18;
    const colors = isLarge
      ? ['#ef4444', '#f97316', '#facc15', '#ffffff']
      : ['#f97316', '#facc15', '#fdba74'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * (isLarge ? 6.5 : 4.2);
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * (isLarge ? 4 : 2.5),
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.03,
      });
    }
  };

  const createSparks = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 3.5;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 1.5,
        color,
        alpha: 1.0,
        decay: 0.04 + Math.random() * 0.05,
      });
    }
  };

  const createShockwave = (x: number, y: number, maxRadius: number, color: string) => {
    stateRef.current.shockwaves.push({
      x,
      y,
      radius: 6,
      maxRadius,
      color,
      lineWidth: 3,
      alpha: 1.0,
    });
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number, shieldActive: boolean) => {
    ctx.save();

    // 1. Engine exhaust flame (dynamically scales with flight speed)
    const flameSpeedScale = 0.85 + (stateRef.current.currentSpeedMultiplier || 1.0) * 0.25;
    const flameH = (8 + Math.random() * 12) * flameSpeedScale;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 24);
    ctx.lineTo(x + 6, y + 24);
    ctx.lineTo(x, y + 24 + flameH);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(x - 3, y + 24);
    ctx.lineTo(x + 3, y + 24);
    ctx.lineTo(x, y + 24 + flameH * 0.6);
    ctx.closePath();
    ctx.fill();

    // 2. Fighter Jet Body (Cyan & White)
    ctx.fillStyle = '#2dd4bf';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(x, y - 28);                  // Nose
    ctx.lineTo(x - 10, y - 10);
    ctx.lineTo(x - 26, y + 14);             // Left wingtip
    ctx.lineTo(x - 15, y + 20);
    ctx.lineTo(x - 8, y + 24);              // Left engine
    ctx.lineTo(x + 8, y + 24);              // Right engine
    ctx.lineTo(x + 15, y + 20);
    ctx.lineTo(x + 26, y + 14);             // Right wingtip
    ctx.lineTo(x + 10, y - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit Canopy
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x - 4, y);
    ctx.lineTo(x + 4, y);
    ctx.closePath();
    ctx.fill();

    // 3. Active Power-Up Visual Modifications on Aircraft
    const now = performance.now();
    const hasRapid = now < stateRef.current.rapidFireUntil;
    const hasTriple = now < stateRef.current.tripleShotUntil;

    // Rapid Fire wingtip plasma chargers
    if (hasRapid) {
      const amberPulse = 3.5 + Math.sin(now * 0.02) * 1.5;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(x - 26, y + 14, amberPulse, 0, Math.PI * 2);
      ctx.arc(x + 26, y + 14, amberPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x - 26, y + 14, amberPulse * 0.5, 0, Math.PI * 2);
      ctx.arc(x + 26, y + 14, amberPulse * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Triple Shot outboard weapon barrels with cyan target laser points
    if (hasTriple) {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(x - 17, y + 2, 4, 12);
      ctx.fillRect(x + 13, y + 2, 4, 12);
      // Ready indicator light
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(x - 15, y + 1, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 15, y + 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Defensive Energy Shield
    if (shieldActive) {
      const pulse = 28 + Math.sin(performance.now() * 0.01) * 3;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, pulse - 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy) => {
    ctx.save();
    const x = enemy.x;
    const y = enemy.y;

    if (enemy.type === 'SCOUT') {
      // Red Scout Jet (pointing downward)
      ctx.fillStyle = '#f43f5e';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.moveTo(x, y + enemy.height / 2);                  // Nose down
      ctx.lineTo(x - enemy.width / 2, y - enemy.height / 2); // Left wing
      ctx.lineTo(x, y - enemy.height / 4);
      ctx.lineTo(x + enemy.width / 2, y - enemy.height / 2); // Right wing
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Royal Purple Heavy Battle Cruiser
      ctx.fillStyle = '#a855f7';
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.moveTo(x, y + enemy.height / 2);
      ctx.lineTo(x - enemy.width / 2, y + enemy.height / 6);
      ctx.lineTo(x - enemy.width / 3, y - enemy.height / 2);
      ctx.lineTo(x + enemy.width / 3, y - enemy.height / 2);
      ctx.lineTo(x + enemy.width / 2, y + enemy.height / 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Red core
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Health bar
      if (enemy.hp < enemy.maxHp) {
        const barW = 36;
        const barH = 4;
        const pct = Math.max(0, enemy.hp / enemy.maxHp);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - barW / 2, y - enemy.height / 2 - 8, barW, barH);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x - barW / 2, y - enemy.height / 2 - 8, barW * pct, barH);
      }
    }

    ctx.restore();
  };

  const resetGame = () => {
    const state = stateRef.current;
    state.score = 0;
    state.health = 100;
    state.lives = 3;
    state.shieldEnergy = 100;
    state.gameOver = false;
    state.currentSpeedMultiplier = 1.0;
    state.targetSpeedMultiplier = 1.0;
    state.enemies = [];
    state.bullets = [];
    state.bombs = [];
    state.bombExplosions = [];
    state.particles = [];
    state.shockwaves = [];
    state.powerUps = [];
    state.floatingTexts = [];
    state.rapidFireUntil = 0;
    state.tripleShotUntil = 0;
    state.lastBulletTime = 0;
    state.lastBombTime = 0;
    state.lastEnemySpawn = performance.now();
    state.enemiesKilled = 0;
    setRapidFireSeconds(0);
    setTripleShotSeconds(0);
    setFlightSpeed(1.0);
    setGameOver(false);
  };

  // Mouse interaction fallback for steering
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0.05, Math.min(0.95, clientX / rect.width));
    stateRef.current.handState.handX = ratio;
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Top HUD Display Bar */}
      <div className="w-full max-w-[840px] bg-slate-900/95 border border-slate-700/80 rounded-t-xl px-4 py-2.5 flex items-center justify-between shadow-lg">
        {/* Score & Wave & Velocity */}
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[10px] tracking-wider uppercase text-slate-400 font-semibold">Score</div>
            <div className="text-xl font-mono font-black text-amber-400 tracking-tight">
              {score.toString().padStart(5, '0')}
            </div>
          </div>
          <div className="h-7 w-px bg-slate-700" />
          <div>
            <div className="text-[10px] tracking-wider uppercase text-slate-400 font-semibold">Wave</div>
            <div className="text-base font-mono font-bold text-cyan-400">0{wave}</div>
          </div>
          <div className="h-7 w-px bg-slate-700" />
          <div>
            <div className="text-[10px] tracking-wider uppercase text-slate-400 font-semibold flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              FLIGHT VELOCITY
            </div>
            <div className="text-base font-mono font-bold text-amber-300 flex items-center gap-1.5">
              <span>MACH {(1.0 + (flightSpeed - 1) * 1.5).toFixed(1)}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-semibold tracking-wide uppercase ${
                flightSpeed > 2.0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                  : flightSpeed > 1.4
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              }`}>
                {flightSpeed.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>

        {/* Health, Lives & Shield Gauge */}
        <div className="flex items-center gap-6">
          {/* Health Bar */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
              <span>HULL INTEGRITY</span>
              <span className={health > 40 ? 'text-emerald-400' : 'text-rose-400'}>{health}%</span>
            </div>
            <div className="w-36 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-150 rounded-full ${
                  health > 50 ? 'bg-emerald-400' : health > 25 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>

          {/* Lives remaining */}
          <div>
            <div className="text-[10px] text-slate-400 font-semibold mb-1">LIVES</div>
            <div className="flex items-center gap-1.5">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-sm flex items-center justify-center ${
                    i < lives ? 'text-teal-400' : 'text-slate-600 opacity-40'
                  }`}
                >
                  ▲
                </div>
              ))}
            </div>
          </div>

          {/* Shield Energy Gauge */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" />
                SHIELD
              </span>
              <span className="text-cyan-300">{shieldEnergy}%</span>
            </div>
            <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-cyan-400 transition-all duration-100 rounded-full"
                style={{ width: `${shieldEnergy}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Controls & Sound */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={resetGame}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Restart Mission"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div className="relative w-full max-w-[840px] aspect-[840/650] bg-slate-950 rounded-b-xl overflow-hidden border-x border-b border-slate-700 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Active Power-Up Badges Overlay (Top Right of Canvas) */}
        {(rapidFireSeconds > 0 || tripleShotSeconds > 0) && (
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10 pointer-events-none">
            {rapidFireSeconds > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.35)] animate-pulse">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <div>
                  <div className="text-[9px] uppercase font-bold text-amber-400 tracking-wider">
                    RAPID FIRE (2.2x FIRE RATE)
                  </div>
                  <div className="text-xs font-mono font-black text-amber-200">
                    {rapidFireSeconds}s REMAINING
                  </div>
                </div>
              </div>
            )}
            {tripleShotSeconds > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.35)] animate-pulse">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider">
                    TRIPLE SHOT (3-WAY VOLLEYS)
                  </div>
                  <div className="text-xs font-mono font-black text-cyan-200">
                    {tripleShotSeconds}s REMAINING
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Detected Gesture Indicator (Bottom Left) */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-xl max-w-xs pointer-events-none">
          <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Active Hand Gesture
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-lg">
              {handState.gesture === 'ONE_FINGER'
                ? '☝️'
                : handState.gesture === 'TWO_FINGERS'
                ? '✌️'
                : handState.gesture === 'OPEN_PALM'
                ? '✋'
                : handState.gesture === 'FIST'
                ? '✊'
                : '👋'}
            </span>
            <div>
              <div className="text-sm font-bold text-slate-100 font-mono">
                {handState.gesture === 'ONE_FINGER'
                  ? '1 Finger (Index)'
                  : handState.gesture === 'TWO_FINGERS'
                  ? '2 Fingers (Peace Sign)'
                  : handState.gesture === 'OPEN_PALM'
                  ? 'Open Palm'
                  : handState.gesture === 'FIST'
                  ? 'Closed Fist'
                  : 'No Hand Detected'}
              </div>
              <div
                className={`text-xs font-semibold uppercase ${
                  handState.action === 'SHOOT LASER'
                    ? 'text-yellow-400'
                    : handState.action === 'AOE BOMB'
                    ? 'text-orange-400'
                    : handState.action === 'ENERGY SHIELD'
                    ? 'text-cyan-400'
                    : 'text-slate-400'
                }`}
              >
                Action: {handState.action}
              </div>
            </div>
          </div>
        </div>

        {/* Game Over Modal Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-400">
              <Flame className="w-9 h-9" />
            </div>
            <h2 className="text-3xl font-black text-rose-400 tracking-tight mb-2">MISSION FAILED</h2>
            <p className="text-slate-400 text-sm max-w-sm mb-6">
              Your fighter jet took critical damage and could not sustain further enemy onslaught.
            </p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <div className="text-xs text-slate-400">Final Score</div>
                <div className="text-2xl font-mono font-bold text-amber-400">{score}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <div className="text-xs text-slate-400">Hostiles Destroyed</div>
                <div className="text-2xl font-mono font-bold text-cyan-400">{enemiesDestroyed}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={resetGame}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again (or Raise Open Palm ✋)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Quick Gesture Simulator Bar (for zero-setup instant testing) */}
      <div className="w-full max-w-[840px] mt-3 bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-300">Quick Test Controls:</span>
          <span className="text-slate-500 hidden sm:inline">(Click or use webcam gestures)</span>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => onSimulateGesture('SHOOT')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              handState.action === 'SHOOT LASER'
                ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300 ring-2 ring-yellow-500/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>☝️</span> 1 Finger: Laser
          </button>

          <button
            onClick={() => onSimulateGesture('BOMB')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              handState.action === 'AOE BOMB'
                ? 'bg-orange-500/20 border-orange-500/60 text-orange-300 ring-2 ring-orange-500/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>✌️</span> 2 Fingers: Bomb
          </button>

          <button
            onClick={() => onSimulateGesture('SHIELD')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              handState.action === 'ENERGY SHIELD'
                ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 ring-2 ring-cyan-500/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>✋</span> Open Palm: Shield
          </button>

          <button
            onClick={() => onSimulateGesture('STOP')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              handState.action === 'HOLD FIRE'
                ? 'bg-slate-700 border-slate-500 text-slate-200'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <span>✊</span> Fist: Stop
          </button>
        </div>
      </div>

      {/* Power-Up Drops Guide Card */}
      <div className="w-full max-w-[840px] mt-2.5 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2 flex items-center justify-between flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Enemy Power-Up Drops:</span>
        </div>
        <div className="flex items-center flex-wrap gap-4 text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/60 text-amber-400 font-bold flex items-center justify-center text-[9px]">
              ⚡
            </span>
            <span className="text-slate-300 font-medium"><strong className="text-amber-400">Rapid Fire</strong> (2.2x speed)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/60 text-cyan-400 font-bold flex items-center justify-center text-[9px]">
              3X
            </span>
            <span className="text-slate-300 font-medium"><strong className="text-cyan-400">Triple Shot</strong> (3-way spread)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/60 text-emerald-400 font-bold flex items-center justify-center text-[9px]">
              🛡
            </span>
            <span className="text-slate-300 font-medium"><strong className="text-emerald-400">Shield+</strong> (+50% & repair)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
