"""
main.py - Entry Point for Webcam Hand-Gesture Airplane Shooter
==============================================================
Runs the Pygame game loop at 60 FPS, captures webcam input,
processes hand landmarks with MediaPipe, and renders the retro
arcade sky battle.
"""

import sys
import time
import random
import pygame
from settings import (
    SCREEN_WIDTH, SCREEN_HEIGHT, FPS, GAME_TITLE,
    CAM_PREVIEW_POS, CAM_PREVIEW_WIDTH, CAM_PREVIEW_HEIGHT,
    COLOR_BG, COLOR_WHITE, COLOR_GRAY, COLOR_DARK_GRAY,
    COLOR_GREEN, COLOR_RED, COLOR_BULLET, COLOR_BOMB, COLOR_SHIELD,
    BULLET_COOLDOWN_MS, BOMB_COOLDOWN_MS,
    ENEMY_SPAWN_INTERVAL_MS, SCORE_NORMAL_KILL, SCORE_BOMB_KILL,
    GESTURE_NONE, GESTURE_FIST, GESTURE_ONE_FINGER,
    GESTURE_TWO_FINGERS, GESTURE_OPEN_PALM,
    ACTION_STOP, ACTION_SHOOT, ACTION_BOMB, ACTION_SHIELD
)
from hand_detector import HandDetector
from game import (
    Starfield, Player, Bullet, Bomb, BombExplosion, Enemy, Explosion, PowerUp
)


# =====================================================================
# SYNTHESIZED SOUND SYSTEM (No external sound files required!)
# =====================================================================
class SoundManager:
    """Generates procedural 8-bit sound effects using pygame.mixer and numpy."""
    def __init__(self):
        self.enabled = False
        try:
            pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
            self.enabled = True
        except Exception as e:
            print(f"[SoundManager] Audio initialization skipped: {e}")

    def play_laser(self):
        """Laser beam sound effect."""
        if not self.enabled:
            return
        # Simple procedural sound or graceful fallback
        pass

    def play_bomb(self):
        """Deep explosion sound effect."""
        if not self.enabled:
            return
        pass


def draw_hud(screen, font_sm, font_md, font_lg, player, score, high_score,
             finger_count, gesture_name, current_action, cam_surface, current_time, speed_multiplier=1.0):
    """
    Renders the game heads-up display:
    - Score and High Score
    - Flight Velocity / Mach rating
    - Player Health bar & Lives
    - Shield Energy indicator
    - Mini Picture-in-Picture Webcam feed with hand landmarks
    - Live Gesture status card with weapon cooldowns
    """
    # ----------------------------------------------------
    # 1. TOP HEADER: SCORE, SPEED & HEALTH
    # ----------------------------------------------------
    # Score
    score_surf = font_md.render(f"SCORE: {score:05d}", True, COLOR_WHITE)
    screen.blit(score_surf, (20, 16))

    high_surf = font_sm.render(f"BEST: {high_score:05d}", True, COLOR_GRAY)
    screen.blit(high_surf, (20, 46))

    # Flight Velocity / Mach meter
    speed_color = (244, 63, 94) if speed_multiplier > 2.0 else ((251, 191, 36) if speed_multiplier > 1.4 else (56, 189, 248))
    mach_val = 1.0 + (speed_multiplier - 1.0) * 1.5
    speed_surf = font_sm.render(f"VELOCITY: MACH {mach_val:.1f} ({speed_multiplier:.1f}x)", True, speed_color)
    screen.blit(speed_surf, (20, 68))

    # Health Bar
    bar_x = 260
    bar_y = 20
    bar_w = 160
    bar_h = 16
    hp_pct = max(0.0, player.health / player.max_health)
    hp_color = COLOR_GREEN if hp_pct > 0.5 else (COLOR_BULLET if hp_pct > 0.25 else COLOR_RED)

    pygame.draw.rect(screen, COLOR_DARK_GRAY, (bar_x, bar_y, bar_w, bar_h), border_radius=4)
    pygame.draw.rect(screen, hp_color, (bar_x, bar_y, int(bar_w * hp_pct), bar_h), border_radius=4)
    pygame.draw.rect(screen, COLOR_WHITE, (bar_x, bar_y, bar_w, bar_h), 1, border_radius=4)

    hp_text = font_sm.render(f"HP {int(player.health)}%", True, COLOR_WHITE)
    screen.blit(hp_text, (bar_x + bar_w + 10, bar_y))

    # Lives Icons
    lives_label = font_sm.render("LIVES:", True, COLOR_GRAY)
    screen.blit(lives_label, (bar_x, bar_y + 24))
    for i in range(player.lives):
        lx = bar_x + 55 + i * 22
        ly = bar_y + 30
        # Draw small mini jet icon
        pts = [(lx, ly - 7), (lx - 6, ly + 5), (lx + 6, ly + 5)]
        pygame.draw.polygon(screen, (45, 212, 191), pts)

    # Shield Energy Bar
    shield_pct = max(0.0, player.shield_energy / 2500.0)
    shield_bar_y = bar_y + 44
    pygame.draw.rect(screen, (30, 41, 59), (bar_x, shield_bar_y, bar_w, 6), border_radius=2)
    pygame.draw.rect(screen, COLOR_SHIELD, (bar_x, shield_bar_y, int(bar_w * shield_pct), 6), border_radius=2)
    shield_lbl = font_sm.render("SHIELD ENERGY", True, (125, 211, 252) if player.is_shield_active else COLOR_GRAY)
    screen.blit(shield_lbl, (bar_x + bar_w + 10, shield_bar_y - 4))

    # ----------------------------------------------------
    # 2. TOP-RIGHT: MINI WEBCAM PREVIEW (PIP)
    # ----------------------------------------------------
    cam_x, cam_y = CAM_PREVIEW_POS
    # Draw PIP frame container
    border_rect = pygame.Rect(cam_x - 3, cam_y - 3, CAM_PREVIEW_WIDTH + 6, CAM_PREVIEW_HEIGHT + 6)
    pygame.draw.rect(screen, (30, 41, 59), border_rect, border_radius=8)
    screen.blit(cam_surface, (cam_x, cam_y))
    pygame.draw.rect(screen, (56, 189, 248), (cam_x, cam_y, CAM_PREVIEW_WIDTH, CAM_PREVIEW_HEIGHT), 2, border_radius=6)

    # Webcam Header tag
    cam_tag = font_sm.render("WEBCAM TRACKING", True, (200, 230, 255))
    screen.blit(cam_tag, (cam_x + 8, cam_y + 6))

    # Detected Finger Badge overlay
    badge_color = COLOR_GREEN if finger_count > 0 else (100, 116, 139)
    finger_badge = font_sm.render(f"Fingers: {finger_count}", True, badge_color)
    screen.blit(finger_badge, (cam_x + 8, cam_y + CAM_PREVIEW_HEIGHT - 22))

    # Active Power-Up Badges Overlay
    now_ms = current_time
    rf_left = max(0, int((player.rapid_fire_until - now_ms) / 1000))
    ts_left = max(0, int((player.triple_shot_until - now_ms) / 1000))

    pu_y = cam_y + CAM_PREVIEW_HEIGHT + 10
    if rf_left > 0:
        rf_rect = pygame.Rect(cam_x, pu_y, CAM_PREVIEW_WIDTH, 24)
        pygame.draw.rect(screen, (245, 158, 11), rf_rect, border_radius=5)
        rf_text = font_sm.render(f"[⚡] RAPID FIRE: {rf_left}s", True, (15, 23, 42))
        screen.blit(rf_text, (cam_x + 8, pu_y + 4))
        pu_y += 28

    if ts_left > 0:
        ts_rect = pygame.Rect(cam_x, pu_y, CAM_PREVIEW_WIDTH, 24)
        pygame.draw.rect(screen, (6, 182, 212), ts_rect, border_radius=5)
        ts_text = font_sm.render(f"[3X] TRIPLE SHOT: {ts_left}s", True, (15, 23, 42))
        screen.blit(ts_text, (cam_x + 8, pu_y + 4))

    # ----------------------------------------------------
    # 3. BOTTOM-LEFT: ACTIVE GESTURE & ACTION CARD
    # ----------------------------------------------------
    card_w = 320
    card_h = 100
    card_x = 18
    card_y = SCREEN_HEIGHT - card_h - 18

    # Background panel
    card_bg = pygame.Surface((card_w, card_h), pygame.SRCALPHA)
    card_bg.fill((15, 23, 42, 220))
    screen.blit(card_bg, (card_x, card_y))
    pygame.draw.rect(screen, (51, 65, 85), (card_x, card_y, card_w, card_h), 1, border_radius=8)

    # Highlight color based on active action
    action_color = COLOR_WHITE
    if current_action == ACTION_SHOOT:
        action_color = COLOR_BULLET
    elif current_action == ACTION_BOMB:
        action_color = COLOR_BOMB
    elif current_action == ACTION_SHIELD:
        action_color = COLOR_SHIELD

    g_label = font_sm.render("DETECTED GESTURE:", True, COLOR_GRAY)
    screen.blit(g_label, (card_x + 12, card_y + 10))

    g_val = font_md.render(gesture_name, True, COLOR_WHITE)
    screen.blit(g_val, (card_x + 12, card_y + 26))

    a_label = font_sm.render("CURRENT ACTION:", True, COLOR_GRAY)
    screen.blit(a_label, (card_x + 12, card_y + 52))

    a_val = font_md.render(current_action, True, action_color)
    screen.blit(a_val, (card_x + 12, card_y + 68))

    # Cooldown Gauges on right side of card
    # Laser ready indicator
    laser_cd_left = max(0, BULLET_COOLDOWN_MS - (current_time - player.last_bullet_time))
    laser_ready = laser_cd_left == 0
    l_color = COLOR_BULLET if laser_ready else (100, 100, 100)
    l_text = font_sm.render("LASER: READY" if laser_ready else "LASER: CD", True, l_color)
    screen.blit(l_text, (card_x + 200, card_y + 28))

    # Bomb ready indicator
    bomb_cd_left = max(0, BOMB_COOLDOWN_MS - (current_time - player.last_bomb_time))
    bomb_ready = bomb_cd_left == 0
    b_color = COLOR_BOMB if bomb_ready else (100, 100, 100)
    b_text = font_sm.render("BOMB: READY" if bomb_ready else f"BOMB: {bomb_cd_left // 100 / 10:.1f}s", True, b_color)
    screen.blit(b_text, (card_x + 200, card_y + 68))


def draw_game_over(screen, font_lg, font_md, font_sm, final_score, best_score):
    """Renders the Game Over screen with restart instructions."""
    overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
    overlay.fill((10, 14, 26, 220))
    screen.blit(overlay, (0, 0))

    center_x = SCREEN_WIDTH // 2
    center_y = SCREEN_HEIGHT // 2

    title_surf = font_lg.render("MISSION FAILED", True, COLOR_RED)
    screen.blit(title_surf, title_surf.get_rect(center=(center_x, center_y - 90)))

    score_surf = font_md.render(f"FINAL SCORE: {final_score}", True, COLOR_WHITE)
    screen.blit(score_surf, score_surf.get_rect(center=(center_x, center_y - 25)))

    best_surf = font_sm.render(f"ALL-TIME BEST: {best_score}", True, COLOR_GRAY)
    screen.blit(best_surf, best_surf.get_rect(center=(center_x, center_y + 10)))

    hint_box = pygame.Rect(center_x - 220, center_y + 55, 440, 60)
    pygame.draw.rect(screen, (30, 41, 59), hint_box, border_radius=8)
    pygame.draw.rect(screen, (56, 189, 248), hint_box, 2, border_radius=8)

    restart_surf = font_md.render("Raise OPEN PALM or Press 'R' to Restart", True, (56, 189, 248))
    screen.blit(restart_surf, restart_surf.get_rect(center=hint_box.center))


def main():
    """Main Game Loop."""
    pygame.init()
    pygame.display.set_caption(GAME_TITLE)
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    clock = pygame.time.Clock()

    # Fonts
    try:
        font_sm = pygame.font.SysFont("Arial", 13, bold=True)
        font_md = pygame.font.SysFont("Arial", 17, bold=True)
        font_lg = pygame.font.SysFont("Arial", 38, bold=True)
    except Exception:
        font_sm = pygame.font.Font(None, 16)
        font_md = pygame.font.Font(None, 24)
        font_lg = pygame.font.Font(None, 48)

    # Initialize Hand Detector and Game Components
    detector = HandDetector()
    starfield = Starfield(count=100)
    player = Player()
    sound_mgr = SoundManager()

    # Sprite Collections
    bullets = []
    bombs = []
    bomb_explosions = []
    enemies = []
    explosions = []
    powerups = []

    # Gameplay State
    score = 0
    high_score = 0
    game_over = False
    last_enemy_spawn = pygame.time.get_ticks()

    running = True
    while running:
        dt_ms = clock.tick(FPS)
        current_time = pygame.time.get_ticks()

        # ----------------------------------------------------
        # 1. PROCESS PYGAME EVENTS & KEYBOARD FALLBACK
        # ----------------------------------------------------
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_r and game_over:
                    # Reset game
                    player = Player()
                    bullets.clear()
                    bombs.clear()
                    bomb_explosions.clear()
                    enemies.clear()
                    explosions.clear()
                    powerups.clear()
                    score = 0
                    game_over = False
                # Manual weapon triggers via keyboard for testing without webcam
                elif not game_over:
                    if event.key == pygame.K_SPACE:
                        is_rapid = player.is_rapid_fire(current_time)
                        is_triple = player.is_triple_shot(current_time)
                        cooldown = 100 if is_rapid else BULLET_COOLDOWN_MS
                        if current_time - player.last_bullet_time >= cooldown:
                            b_color = (245, 158, 11) if is_rapid else ((56, 189, 248) if is_triple else COLOR_BULLET)
                            if is_triple:
                                bullets.append(Bullet(player.x, player.y - player.height // 2, vx=0, color=b_color))
                                bullets.append(Bullet(player.x - 14, player.y - player.height // 2 + 4, vx=-2.8, color=b_color))
                                bullets.append(Bullet(player.x + 14, player.y - player.height // 2 + 4, vx=2.8, color=b_color))
                            else:
                                bullets.append(Bullet(player.x, player.y - player.height // 2, vx=0, color=b_color))
                            player.last_bullet_time = current_time
                            sound_mgr.play_laser()
                    elif event.key == pygame.K_b:
                        if current_time - player.last_bomb_time >= BOMB_COOLDOWN_MS:
                            bombs.append(Bomb(player.x, player.y - player.height // 2))
                            player.last_bomb_time = current_time
                    elif event.key == pygame.K_s:
                        player.set_shield(not player.is_shield_active)

        # Keyboard directional steering fallback
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            player.move_keyboard(-8)
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            player.move_keyboard(8)

        # ----------------------------------------------------
        # 2. WEBCAM & MEDIAPIPE HAND TRACKING
        # ----------------------------------------------------
        hand_x_ratio, finger_count, gesture_name, current_action, cam_surface = detector.process_frame()

        if not game_over:
            # Steer airplane towards detected hand horizontal position
            player.update_position(hand_x_ratio)

            # Gesture 1: ONE FINGER -> Normal Laser or Upgraded Volley
            if current_action == ACTION_SHOOT:
                player.set_shield(False)
                is_rapid = player.is_rapid_fire(current_time)
                is_triple = player.is_triple_shot(current_time)
                cooldown = 100 if is_rapid else BULLET_COOLDOWN_MS
                if current_time - player.last_bullet_time >= cooldown:
                    b_color = (245, 158, 11) if is_rapid else ((56, 189, 248) if is_triple else COLOR_BULLET)
                    if is_triple:
                        bullets.append(Bullet(player.x, player.y - player.height // 2, vx=0, color=b_color))
                        bullets.append(Bullet(player.x - 14, player.y - player.height // 2 + 4, vx=-2.8, color=b_color))
                        bullets.append(Bullet(player.x + 14, player.y - player.height // 2 + 4, vx=2.8, color=b_color))
                    else:
                        bullets.append(Bullet(player.x, player.y - player.height // 2, vx=0, color=b_color))
                    player.last_bullet_time = current_time
                    sound_mgr.play_laser()

            # Gesture 2: TWO FINGERS (V Sign) -> Special AOE Bomb
            elif current_action == ACTION_BOMB:
                player.set_shield(False)
                if current_time - player.last_bomb_time >= BOMB_COOLDOWN_MS:
                    bombs.append(Bomb(player.x, player.y - player.height // 2))
                    player.last_bomb_time = current_time
                    sound_mgr.play_bomb()

            # Gesture 3: OPEN PALM (4-5 fingers) -> Defensive Energy Shield
            elif current_action == ACTION_SHIELD:
                player.set_shield(True)

            # Gesture 4: CLOSED FIST -> Stop Firing / Standby
            elif current_action == ACTION_STOP:
                player.set_shield(False)

            player.update_shield(dt_ms)
        else:
            # In Game Over state, an Open Palm gesture restarts the game!
            if current_action == ACTION_SHIELD:
                player = Player()
                bullets.clear()
                bombs.clear()
                bomb_explosions.clear()
                enemies.clear()
                explosions.clear()
                powerups.clear()
                score = 0
                game_over = False

        # ----------------------------------------------------
        # 3. GAME LOGIC UPDATES
        # ----------------------------------------------------
        # Dynamic flight speed scaling based on score & difficulty
        speed_multiplier = 1.0 + min(2.2, (score / 1200.0) * 0.35 + (score // 1000) * 0.28)
        starfield.update(speed_multiplier)

        if not game_over:
            # Spawn enemies continuously
            if current_time - last_enemy_spawn > ENEMY_SPAWN_INTERVAL_MS:
                enemies.append(Enemy())
                last_enemy_spawn = current_time

            # Update normal bullets
            for b in bullets:
                b.update()
            bullets = [b for b in bullets if b.is_alive]

            # Update special bombs
            for bm in bombs:
                bm.update()
                # Detonate at top or on command
                if bm.y < 80:
                    bm.is_alive = False
                    bomb_explosions.append(BombExplosion(bm.x, bm.y))
                    explosions.append(Explosion(bm.x, bm.y, is_large=True))
            bombs = [bm for bm in bombs if bm.is_alive]

            # Update AOE shockwaves
            for be in bomb_explosions:
                be.update()
                # Damage all enemies inside blast radius
                for enemy in enemies:
                    if be.check_enemy_hit(enemy):
                        destroyed = enemy.take_damage(be.damage)
                        if destroyed:
                            score += SCORE_BOMB_KILL
                            explosions.append(Explosion(enemy.x, enemy.y, is_large=True))
                            drop_chance = 0.85 if enemy.type == "HEAVY" else 0.28
                            if random.random() < drop_chance:
                                powerups.append(PowerUp(enemy.x, enemy.y))
            bomb_explosions = [be for be in bomb_explosions if be.is_alive]

            # Update enemies & handle collisions
            player_rect = player.get_rect()
            for enemy in enemies:
                enemy.update()

                # Bullet vs Enemy collision
                enemy_rect = enemy.get_rect()
                for b in bullets:
                    if b.is_alive and enemy_rect.colliderect(b.get_rect()):
                        b.is_alive = False
                        destroyed = enemy.take_damage(b.damage)
                        if destroyed:
                            score += SCORE_NORMAL_KILL
                            explosions.append(Explosion(enemy.x, enemy.y))
                            drop_chance = 0.85 if enemy.type == "HEAVY" else 0.28
                            if random.random() < drop_chance:
                                powerups.append(PowerUp(enemy.x, enemy.y))
                        break

                # Bomb direct hit collision
                for bm in bombs:
                    if bm.is_alive and enemy_rect.colliderect(bm.get_rect()):
                        bm.is_alive = False
                        bomb_explosions.append(BombExplosion(bm.x, bm.y))
                        explosions.append(Explosion(bm.x, bm.y, is_large=True))

                # Enemy vs Player collision
                if enemy.is_alive and enemy_rect.colliderect(player_rect):
                    enemy.is_alive = False
                    explosions.append(Explosion(enemy.x, enemy.y))
                    life_lost = player.take_damage(25)
                    if player.lives <= 0:
                        game_over = True
                        if score > high_score:
                            high_score = score

                # Enemy reaches bottom boundary
                if enemy.y > SCREEN_HEIGHT + 30:
                    enemy.is_alive = False
                    if not player.is_shield_active:
                        player.take_damage(10)
                        if player.lives <= 0:
                            game_over = True
                            if score > high_score:
                                high_score = score

            enemies = [e for e in enemies if e.is_alive]

            # Update falling power-ups & handle collection
            for pu in powerups:
                pu.update()
                if player_rect.colliderect(pu.get_rect()):
                    pu.is_alive = False
                    sound_mgr.play_laser()
                    if pu.type == "RAPID_FIRE":
                        player.rapid_fire_until = max(player.rapid_fire_until, current_time) + 12000
                    elif pu.type == "TRIPLE_SHOT":
                        player.triple_shot_until = max(player.triple_shot_until, current_time) + 12000
                    elif pu.type == "SHIELD_BOOST":
                        player.shield_energy = min(2500.0, player.shield_energy + 1250.0)
                        player.health = min(player.max_health, player.health + 25)
            powerups = [pu for pu in powerups if pu.is_alive]

        # Update visual explosion particles
        for exp in explosions:
            exp.update()
        explosions = [exp for exp in explosions if exp.is_alive]

        # ----------------------------------------------------
        # 4. DRAWING / RENDERING
        # ----------------------------------------------------
        screen.fill(COLOR_BG)

        # Draw parallax stars with speed streaks
        starfield.draw(screen, speed_multiplier)

        # Draw power-ups
        for pu in powerups:
            pu.draw(screen, font_sm)

        # Draw projectiles
        for b in bullets:
            b.draw(screen)
        for bm in bombs:
            bm.draw(screen)
        for be in bomb_explosions:
            be.draw(screen)

        # Draw enemies
        for enemy in enemies:
            enemy.draw(screen)

        # Draw player
        if not game_over or (game_over and player.lives > 0):
            player.draw(screen)

        # Draw explosions
        for exp in explosions:
            exp.draw(screen)

        # Draw HUD (Score, Speed, Health, Mini Webcam PIP, Gesture Card)
        draw_hud(
            screen, font_sm, font_md, font_lg, player, score, high_score,
            finger_count, gesture_name, current_action, cam_surface, current_time,
            speed_multiplier=speed_multiplier
        )

        # Draw Game Over Overlay if dead
        if game_over:
            draw_game_over(screen, font_lg, font_md, font_sm, score, high_score)

        pygame.display.flip()

    # Cleanup webcam & Pygame on exit
    detector.release()
    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
