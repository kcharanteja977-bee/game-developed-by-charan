"""
game.py - Game Sprites, Mechanics, and Physics for Airplane Shooter
=====================================================================
Contains all Pygame sprite classes:
- Starfield (3-layer parallax moving background)
- Player (fighter jet with smooth gesture steering & engine particles)
- Bullet (normal single-target laser)
- Bomb (special missile with expanding Area-of-Effect shockwave)
- BombExplosion (circular AOE blast wave that hits multiple enemies)
- Enemy (Scout and Heavy enemy aircraft)
- Particle & Explosion (visual destruction effects)
"""

import math
import random
import pygame
from settings import (
    SCREEN_WIDTH, SCREEN_HEIGHT,
    COLOR_PLAYER, COLOR_PLAYER_GLOW, COLOR_BULLET, COLOR_BOMB,
    COLOR_BOMB_BLAST, COLOR_ENEMY_SCOUT, COLOR_ENEMY_HEAVY,
    COLOR_SHIELD, COLOR_WHITE, COLOR_RED,
    PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_START_Y, PLAYER_MAX_HEALTH,
    BULLET_SPEED, BULLET_DAMAGE,
    BOMB_SPEED, BOMB_DAMAGE, BOMB_AOE_RADIUS,
    SHIELD_MAX_DURATION_MS, SHIELD_RECHARGE_RATE,
    ENEMY_SPEED_MIN, ENEMY_SPEED_MAX, ENEMY_SCOUT_HP, ENEMY_HEAVY_HP
)


# =====================================================================
# 1. PARALLAX STARFIELD (MOVING SKY BACKGROUND)
# =====================================================================
class Star:
    """Individual star for vertical parallax flight illusion with dynamic speed streaks."""
    def __init__(self):
        # Multi-layer parallax depth:
        # Layer 0: Distant micro stellar dust (slow, small)
        # Layer 1: Mid stellar plane (medium)
        # Layer 2: Foreground hyper-speed stars (fast, stretch into streaks)
        self.layer = random.choices([0, 1, 2], weights=[0.45, 0.35, 0.20])[0]
        self.x = random.randint(0, SCREEN_WIDTH)
        self.y = random.randint(0, SCREEN_HEIGHT)
        if self.layer == 0:
            self.base_speed = random.uniform(0.7, 1.3)
            self.size = 1
            self.brightness = random.randint(140, 190)
            self.color = (self.brightness, self.brightness, min(255, self.brightness + 45))
        elif self.layer == 1:
            self.base_speed = random.uniform(2.0, 3.5)
            self.size = random.choice([1, 2])
            self.brightness = random.randint(190, 235)
            self.color = (min(255, self.brightness + 10), min(255, self.brightness + 20), 255)
        else:
            self.base_speed = random.uniform(4.8, 8.0)
            self.size = random.choice([2, 3])
            self.brightness = random.randint(240, 255)
            self.color = (255, 255, 255)
        self.speed = self.base_speed

    def update(self, speed_multiplier=1.0):
        self.speed = self.base_speed * speed_multiplier
        self.y += self.speed
        if self.y > SCREEN_HEIGHT + 25:
            self.y = -10
            self.x = random.randint(0, SCREEN_WIDTH)

    def draw(self, surface, speed_multiplier=1.0):
        # When flying at high speed, foreground stars stretch into light streaks
        if self.layer == 2 and speed_multiplier > 1.15:
            streak_len = min(45, int(self.speed * 2.2 * (0.8 + (speed_multiplier - 1.0) * 0.8)))
            start_pos = (int(self.x), max(0, int(self.y - streak_len)))
            end_pos = (int(self.x), int(self.y))
            pygame.draw.line(surface, (186, 230, 253), start_pos, end_pos, max(1, self.size - 1))
            pygame.draw.circle(surface, (255, 255, 255), (int(self.x), int(self.y)), self.size)
        elif self.layer == 1 and speed_multiplier > 1.7:
            streak_len = min(16, int(self.speed * 1.3))
            start_pos = (int(self.x), max(0, int(self.y - streak_len)))
            end_pos = (int(self.x), int(self.y))
            pygame.draw.line(surface, self.color, start_pos, end_pos, 1)
        else:
            pygame.draw.circle(surface, self.color, (int(self.x), int(self.y)), self.size)


class Starfield:
    """Manages multi-layer parallax starfield that accelerates with mission difficulty."""
    def __init__(self, count=120):
        self.stars = [Star() for _ in range(count)]

    def update(self, speed_multiplier=1.0):
        for star in self.stars:
            star.update(speed_multiplier)

    def draw(self, surface, speed_multiplier=1.0):
        for star in self.stars:
            star.draw(surface, speed_multiplier)


# =====================================================================
# 2. PARTICLES AND EXPLOSIONS
# =====================================================================
class Particle:
    """Small glowing debris particle from an explosion."""
    def __init__(self, x, y, color=None):
        self.x = x
        self.y = y
        angle = random.uniform(0, math.pi * 2)
        speed = random.uniform(2.0, 7.5)
        self.vx = math.cos(angle) * speed
        self.vy = math.sin(angle) * speed
        self.radius = random.uniform(2.0, 5.5)
        self.life = 1.0  # 1.0 -> 0.0
        self.decay = random.uniform(0.025, 0.055)
        self.color = color if color else random.choice([(255, 200, 50), (255, 100, 30), (255, 50, 50)])

    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.vx *= 0.94
        self.vy *= 0.94
        self.life -= self.decay
        self.radius = max(0.5, self.radius * 0.96)

    def draw(self, surface):
        if self.life > 0:
            alpha_radius = max(1, int(self.radius))
            pygame.draw.circle(surface, self.color, (int(self.x), int(self.y)), alpha_radius)


class Explosion:
    """Multi-stage explosion effect with particles and expanding blast ring."""
    def __init__(self, x, y, is_large=False):
        self.x = x
        self.y = y
        self.is_large = is_large
        count = 36 if is_large else 18
        self.particles = [Particle(x, y) for _ in range(count)]
        self.ring_radius = 2.0
        self.max_ring_radius = 70.0 if is_large else 35.0
        self.ring_alpha = 255
        self.is_alive = True

    def update(self):
        self.ring_radius += 4.0 if self.is_large else 2.5
        self.ring_alpha = max(0, int(255 * (1.0 - (self.ring_radius / self.max_ring_radius))))

        for p in self.particles:
            p.update()
        self.particles = [p for p in self.particles if p.life > 0]

        if self.ring_radius >= self.max_ring_radius and len(self.particles) == 0:
            self.is_alive = False

    def draw(self, surface):
        for p in self.particles:
            p.draw(surface)

        if self.ring_alpha > 10 and self.ring_radius < self.max_ring_radius:
            ring_color = (255, 140, 40) if not self.is_large else (255, 80, 40)
            pygame.draw.circle(surface, ring_color, (int(self.x), int(self.y)), int(self.ring_radius), 2)


# =====================================================================
# 3. PROJECTILES (NORMAL BULLET & SPECIAL AOE BOMB)
# =====================================================================
class Bullet:
    """Normal rapid-fire projectile (1 finger raised) or upgraded power-up shots."""
    def __init__(self, x, y, vx=0, color=None):
        self.x = x
        self.y = y
        self.vx = vx
        self.speed = BULLET_SPEED
        self.damage = BULLET_DAMAGE
        self.width = 4
        self.height = 16
        self.color = color if color else COLOR_BULLET
        self.is_alive = True

    def update(self):
        self.y -= self.speed
        self.x += self.vx
        if self.y < -30 or self.x < -30 or self.x > SCREEN_WIDTH + 30:
            self.is_alive = False

    def draw(self, surface):
        rect = pygame.Rect(int(self.x - self.width // 2), int(self.y), self.width, self.height)
        pygame.draw.rect(surface, self.color, rect)
        pygame.draw.circle(surface, (255, 255, 255), (int(self.x), int(self.y)), 2)


class PowerUp:
    """Power-up item dropped by defeated enemy aircraft."""
    def __init__(self, x, y, p_type=None):
        self.x = x
        self.y = y
        if not p_type:
            p_type = random.choices(["RAPID_FIRE", "TRIPLE_SHOT", "SHIELD_BOOST"], weights=[0.45, 0.45, 0.10])[0]
        self.type = p_type
        self.vy = random.uniform(1.4, 2.0)
        self.bob_offset = random.uniform(0, math.pi * 2)
        self.width = 32
        self.height = 32
        self.is_alive = True

        if self.type == "RAPID_FIRE":
            self.color = (245, 158, 11)   # Amber
            self.label = "R"
            self.name = "RAPID FIRE"
        elif self.type == "TRIPLE_SHOT":
            self.color = (6, 182, 212)    # Cyan
            self.label = "3x"
            self.name = "TRIPLE SHOT"
        else:
            self.color = (16, 185, 129)   # Emerald
            self.label = "S"
            self.name = "SHIELD+"

    def update(self):
        self.y += self.vy
        self.bob_offset += 0.055
        self.x += math.sin(self.bob_offset) * 0.75
        self.x = max(20, min(SCREEN_WIDTH - 20, self.x))
        if self.y > SCREEN_HEIGHT + 40:
            self.is_alive = False

    def get_rect(self):
        return pygame.Rect(int(self.x - 16), int(self.y - 16), 32, 32)

    def draw(self, surface, font=None):
        pulse = math.sin(pygame.time.get_ticks() * 0.008) * 3
        # Outer glowing halo ring
        pygame.draw.circle(surface, self.color, (int(self.x), int(self.y)), int(16 + pulse), 2)
        # Inner pod
        pygame.draw.circle(surface, (15, 23, 42), (int(self.x), int(self.y)), 13)
        pygame.draw.circle(surface, self.color, (int(self.x), int(self.y)), 13, 2)
        # Center symbol
        if font:
            text_surf = font.render(self.label, True, self.color)
            text_rect = text_surf.get_rect(center=(int(self.x), int(self.y)))
            surface.blit(text_surf, text_rect)

    def get_rect(self):
        return pygame.Rect(self.x - self.width // 2, self.y, self.width, self.height)

    def draw(self, surface):
        # Bright yellow laser core with cyan glow
        rect = self.get_rect()
        pygame.draw.rect(surface, COLOR_BULLET, rect, border_radius=2)
        # Laser head tip
        pygame.draw.circle(surface, (255, 255, 255), (int(self.x), int(self.y)), 3)


class Bomb:
    """
    Special heavy missile (2 fingers / V sign).
    Launches toward enemies and triggers a devastating Area-of-Effect blast!
    """
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.speed = BOMB_SPEED
        self.damage = BOMB_DAMAGE
        self.radius = 8
        self.is_alive = True
        self.tail_timer = 0

    def update(self):
        self.y -= self.speed
        self.tail_timer += 1
        if self.y < -30:
            self.is_alive = False

    def get_rect(self):
        return pygame.Rect(self.x - self.radius, self.y - self.radius, self.radius * 2, self.radius * 2)

    def draw(self, surface):
        # Rocket body
        pygame.draw.circle(surface, COLOR_BOMB, (int(self.x), int(self.y)), self.radius)
        pygame.draw.circle(surface, (255, 255, 200), (int(self.x), int(self.y)), self.radius - 3)
        # Fiery missile exhaust tail
        flame_y = self.y + self.radius + random.randint(3, 10)
        pygame.draw.circle(surface, (255, 80, 20), (int(self.x), int(flame_y)), 4)


class BombExplosion:
    """
    Expanding Area-of-Effect shockwave that destroys multiple nearby enemies.
    """
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.current_radius = 10.0
        self.max_radius = BOMB_AOE_RADIUS
        self.expansion_speed = 9.0
        self.damage = BOMB_DAMAGE
        self.is_alive = True
        self.hit_enemies = set()  # Avoid multi-hitting same enemy every frame

    def update(self):
        self.current_radius += self.expansion_speed
        if self.current_radius >= self.max_radius:
            self.is_alive = False

    def check_enemy_hit(self, enemy):
        """Checks if enemy center falls within the expanding AOE blast radius."""
        if enemy in self.hit_enemies:
            return False
        dist = math.hypot(enemy.x - self.x, enemy.y - self.y)
        if dist <= self.current_radius + enemy.width // 2:
            self.hit_enemies.add(enemy)
            return True
        return False

    def draw(self, surface):
        # Draw concentric expanding rings (shockwave effect)
        progress = self.current_radius / self.max_radius
        alpha = max(0, int(255 * (1.0 - progress)))

        color1 = (255, 100, 30)
        color2 = (255, 220, 80)
        pygame.draw.circle(surface, color1, (int(self.x), int(self.y)), int(self.current_radius), 4)
        if self.current_radius > 15:
            pygame.draw.circle(surface, color2, (int(self.x), int(self.y)), int(self.current_radius - 12), 2)


# =====================================================================
# 4. ENEMY SHIPS
# =====================================================================
class Enemy:
    """Enemy fighter aircraft entering from top of the screen."""
    def __init__(self):
        self.x = random.randint(40, SCREEN_WIDTH - 40)
        self.y = -50
        # 75% Scout, 25% Heavy ship
        self.type = "HEAVY" if random.random() < 0.25 else "SCOUT"

        if self.type == "SCOUT":
            self.hp = ENEMY_SCOUT_HP
            self.max_hp = ENEMY_SCOUT_HP
            self.speed = random.uniform(ENEMY_SPEED_MIN + 0.5, ENEMY_SPEED_MAX)
            self.width = 38
            self.height = 36
            self.color = COLOR_ENEMY_SCOUT
            self.score_value = 100
        else:
            self.hp = ENEMY_HEAVY_HP
            self.max_hp = ENEMY_HEAVY_HP
            self.speed = random.uniform(ENEMY_SPEED_MIN, ENEMY_SPEED_MIN + 1.2)
            self.width = 54
            self.height = 48
            self.color = COLOR_ENEMY_HEAVY
            self.score_value = 250

        self.sway_offset = random.uniform(0, math.pi * 2)
        self.sway_speed = random.uniform(0.03, 0.06)
        self.is_alive = True

    def update(self):
        self.y += self.speed
        # Subtle horizontal swaying pattern
        self.sway_offset += self.sway_speed
        self.x += math.sin(self.sway_offset) * 1.2
        self.x = max(20, min(SCREEN_WIDTH - 20, self.x))

        if self.y > SCREEN_HEIGHT + 60:
            self.is_alive = False

    def take_damage(self, amount):
        self.hp -= amount
        if self.hp <= 0:
            self.is_alive = False
            return True  # Destroyed
        return False

    def get_rect(self):
        return pygame.Rect(self.x - self.width // 2, self.y - self.height // 2, self.width, self.height)

    def draw(self, surface):
        rect = self.get_rect()
        # Draw sleek vector enemy aircraft
        if self.type == "SCOUT":
            # Downward triangular wedge
            points = [
                (self.x, self.y + self.height // 2),                # Nose pointing down
                (self.x - self.width // 2, self.y - self.height // 2), # Left wing
                (self.x, self.y - self.height // 4),                # Rear center
                (self.x + self.width // 2, self.y - self.height // 2), # Right wing
            ]
            pygame.draw.polygon(surface, self.color, points)
            pygame.draw.polygon(surface, (255, 255, 255), points, 1)
        else:
            # Heavy Bomber / Battle Cruiser
            points = [
                (self.x, self.y + self.height // 2),
                (self.x - self.width // 2, self.y + self.height // 6),
                (self.x - self.width // 3, self.y - self.height // 2),
                (self.x + self.width // 3, self.y - self.height // 2),
                (self.x + self.width // 2, self.y + self.height // 6),
            ]
            pygame.draw.polygon(surface, self.color, points)
            pygame.draw.polygon(surface, (230, 200, 255), points, 2)
            # Cockpit gem
            pygame.draw.circle(surface, (239, 68, 68), (int(self.x), int(self.y)), 6)

        # Health bar for heavy enemies
        if self.type == "HEAVY" and self.hp < self.max_hp:
            bar_w = 40
            bar_h = 4
            pct = max(0.0, self.hp / self.max_hp)
            bar_x = self.x - bar_w // 2
            bar_y = self.y - self.height // 2 - 8
            pygame.draw.rect(surface, (40, 40, 50), (bar_x, bar_y, bar_w, bar_h))
            pygame.draw.rect(surface, COLOR_RED, (bar_x, bar_y, int(bar_w * pct), bar_h))


# =====================================================================
# 5. PLAYER AIRPLANE
# =====================================================================
class Player:
    """Player fighter jet controlled by hand movement & gestures."""
    def __init__(self):
        self.x = SCREEN_WIDTH // 2
        self.y = PLAYER_START_Y
        self.target_x = self.x
        self.width = PLAYER_WIDTH
        self.height = PLAYER_HEIGHT

        self.health = PLAYER_MAX_HEALTH
        self.max_health = PLAYER_MAX_HEALTH
        self.lives = 3

        # Weapons cooldown timers (clock ticks)
        self.last_bullet_time = 0
        self.last_bomb_time = 0

        # Power-Up duration timestamps (milliseconds)
        self.rapid_fire_until = 0
        self.triple_shot_until = 0

        # Defensive Shield
        self.is_shield_active = False
        self.shield_energy = SHIELD_MAX_DURATION_MS
        self.shield_pulse = 0.0

        # Invulnerability frames after being hit
        self.invulnerable_timer = 0

    def is_rapid_fire(self, current_time):
        return current_time < self.rapid_fire_until

    def is_triple_shot(self, current_time):
        return current_time < self.triple_shot_until

    def update_position(self, target_ratio):
        """
        Takes normalized hand x (0.0 to 1.0) and interpolates player position smoothly.
        """
        # Map ratio to playable screen area (with margin)
        margin = self.width // 2 + 10
        self.target_x = margin + target_ratio * (SCREEN_WIDTH - 2 * margin)
        # Smooth lerp
        self.x += (self.target_x - self.x) * 0.22

    def move_keyboard(self, dx):
        """Keyboard fallback movement."""
        self.x += dx
        margin = self.width // 2 + 10
        self.x = max(margin, min(SCREEN_WIDTH - margin, self.x))

    def set_shield(self, active):
        """Turns shield on or off based on Open Palm gesture."""
        if active and self.shield_energy > 200:
            self.is_shield_active = True
        else:
            self.is_shield_active = False

    def update_shield(self, dt_ms):
        """Drains energy while shield is active, recharges when off."""
        if self.is_shield_active:
            self.shield_energy = max(0, self.shield_energy - dt_ms)
            if self.shield_energy <= 0:
                self.is_shield_active = False
            self.shield_pulse += 0.15
        else:
            self.shield_energy = min(SHIELD_MAX_DURATION_MS, self.shield_energy + dt_ms * SHIELD_RECHARGE_RATE)

        if self.invulnerable_timer > 0:
            self.invulnerable_timer -= dt_ms

    def take_damage(self, amount):
        """Reduces player health unless shield is active or invulnerable."""
        if self.is_shield_active:
            # Shield completely absorbs damage!
            return False

        if self.invulnerable_timer > 0:
            return False

        self.health -= amount
        self.invulnerable_timer = 1000  # 1 second invulnerability

        if self.health <= 0:
            self.lives -= 1
            if self.lives > 0:
                self.health = self.max_health
                self.invulnerable_timer = 2000
            return True  # Life lost
        return False

    def get_rect(self):
        return pygame.Rect(self.x - self.width // 2, self.y - self.height // 2, self.width, self.height)

    def draw(self, surface):
        # Flicker if recently damaged
        if self.invulnerable_timer > 0 and (pygame.time.get_ticks() // 100) % 2 == 0:
            pass
        else:
            # 1. Jet Engine Exhaust Flames
            flame_len = random.randint(8, 18)
            flame_pts = [
                (self.x - 8, self.y + self.height // 2 - 5),
                (self.x + 8, self.y + self.height // 2 - 5),
                (self.x, self.y + self.height // 2 + flame_len),
            ]
            pygame.draw.polygon(surface, (250, 180, 40), flame_pts)
            pygame.draw.polygon(surface, (255, 255, 180), [
                (self.x - 4, self.y + self.height // 2 - 5),
                (self.x + 4, self.y + self.height // 2 - 5),
                (self.x, self.y + self.height // 2 + flame_len // 2),
            ])

            # 2. Sleek Fighter Jet Body (Cyan & White)
            body_pts = [
                (self.x, self.y - self.height // 2),                 # Nose tip
                (self.x - 12, self.y - self.height // 6),
                (self.x - self.width // 2, self.y + self.height // 4), # Left wingtip
                (self.x - 18, self.y + self.height // 3),
                (self.x - 10, self.y + self.height // 2),             # Left engine
                (self.x + 10, self.y + self.height // 2),             # Right engine
                (self.x + 18, self.y + self.height // 3),
                (self.x + self.width // 2, self.y + self.height // 4), # Right wingtip
                (self.x + 12, self.y - self.height // 6),
            ]
            pygame.draw.polygon(surface, COLOR_PLAYER, body_pts)
            pygame.draw.polygon(surface, (255, 255, 255), body_pts, 2)

            # Cockpit canopy
            canopy_pts = [
                (self.x, self.y - self.height // 3),
                (self.x - 5, self.y),
                (self.x + 5, self.y),
            ]
            pygame.draw.polygon(surface, (180, 240, 255), canopy_pts)

            # 3. Active Power-Up Visual Indicators on Aircraft
            now_ms = pygame.time.get_ticks()
            if self.is_rapid_fire(now_ms):
                amber_pulse = int(4 + math.sin(now_ms * 0.02) * 2)
                pygame.draw.circle(surface, (245, 158, 11), (int(self.x - self.width // 2), int(self.y + self.height // 4)), amber_pulse)
                pygame.draw.circle(surface, (245, 158, 11), (int(self.x + self.width // 2), int(self.y + self.height // 4)), amber_pulse)
                pygame.draw.circle(surface, (254, 240, 138), (int(self.x - self.width // 2), int(self.y + self.height // 4)), max(1, amber_pulse // 2))
                pygame.draw.circle(surface, (254, 240, 138), (int(self.x + self.width // 2), int(self.y + self.height // 4)), max(1, amber_pulse // 2))

            if self.is_triple_shot(now_ms):
                pygame.draw.rect(surface, (2, 132, 199), (int(self.x - 17), int(self.y + 2), 4, 12))
                pygame.draw.rect(surface, (2, 132, 199), (int(self.x + 13), int(self.y + 2), 4, 12))
                pygame.draw.circle(surface, (56, 189, 248), (int(self.x - 15), int(self.y + 1)), 2)
                pygame.draw.circle(surface, (56, 189, 248), (int(self.x + 15), int(self.y + 1)), 2)

        # 4. Draw Active Energy Shield (Open Palm Gesture)
        if self.is_shield_active:
            pulse_rad = int(self.width * 0.9 + math.sin(self.shield_pulse) * 3)
            # Outer forcefield aura
            pygame.draw.circle(surface, COLOR_SHIELD, (int(self.x), int(self.y)), pulse_rad, 3)
            pygame.draw.circle(surface, (200, 240, 255), (int(self.x), int(self.y)), pulse_rad - 4, 1)
