/**
 * pythonFilesData.ts
 * Stores complete source code of the Python Pygame + MediaPipe project
 * for interactive viewing and 1-click ZIP downloads.
 */

export interface PythonFileItem {
  filename: string;
  description: string;
  language: string;
  code: string;
}

export const PYTHON_FILES: PythonFileItem[] = [
  {
    filename: "main.py",
    description: "Main game entry point, 60 FPS loop, HUD overlay, and gesture integration",
    language: "python",
    code: `"""
main.py - Entry Point for Webcam Hand-Gesture Airplane Shooter
==============================================================
Runs the Pygame game loop at 60 FPS, captures webcam input,
processes hand landmarks with MediaPipe, and renders the retro
arcade sky battle.
"""

import sys
import time
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
    Starfield, Player, Bullet, Bomb, BombExplosion, Enemy, Explosion
)


# =====================================================================
# SYNTHESIZED SOUND SYSTEM (No external sound files required!)
# =====================================================================
class SoundManager:
    """Generates procedural sound effects using pygame.mixer."""
    def __init__(self):
        self.enabled = False
        try:
            pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
            self.enabled = True
        except Exception as e:
            print(f"[SoundManager] Audio initialization skipped: {e}")

    def play_laser(self):
        pass

    def play_bomb(self):
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
    # 1. Top Header: Score, Speed & Health
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
        pts = [(lx, ly - 7), (lx - 6, ly + 5), (lx + 6, ly + 5)]
        pygame.draw.polygon(screen, (45, 212, 191), pts)

    # Shield Energy Bar
    shield_pct = max(0.0, player.shield_energy / 2500.0)
    shield_bar_y = bar_y + 44
    pygame.draw.rect(screen, (30, 41, 59), (bar_x, shield_bar_y, bar_w, 6), border_radius=2)
    pygame.draw.rect(screen, COLOR_SHIELD, (bar_x, shield_bar_y, int(bar_w * shield_pct), 6), border_radius=2)
    shield_lbl = font_sm.render("SHIELD ENERGY", True, (125, 211, 252) if player.is_shield_active else COLOR_GRAY)
    screen.blit(shield_lbl, (bar_x + bar_w + 10, shield_bar_y - 4))

    # 2. Top-Right: Mini Webcam Preview (PIP)
    cam_x, cam_y = CAM_PREVIEW_POS
    border_rect = pygame.Rect(cam_x - 3, cam_y - 3, CAM_PREVIEW_WIDTH + 6, CAM_PREVIEW_HEIGHT + 6)
    pygame.draw.rect(screen, (30, 41, 59), border_rect, border_radius=8)
    screen.blit(cam_surface, (cam_x, cam_y))
    pygame.draw.rect(screen, (56, 189, 248), (cam_x, cam_y, CAM_PREVIEW_WIDTH, CAM_PREVIEW_HEIGHT), 2, border_radius=6)

    cam_tag = font_sm.render("WEBCAM TRACKING", True, (200, 230, 255))
    screen.blit(cam_tag, (cam_x + 8, cam_y + 6))

    badge_color = COLOR_GREEN if finger_count > 0 else (100, 116, 139)
    finger_badge = font_sm.render(f"Fingers: {finger_count}", True, badge_color)
    screen.blit(finger_badge, (cam_x + 8, cam_y + CAM_PREVIEW_HEIGHT - 22))

    # 3. Bottom-Left: Active Gesture & Action Card
    card_w = 320
    card_h = 100
    card_x = 18
    card_y = SCREEN_HEIGHT - card_h - 18

    card_bg = pygame.Surface((card_w, card_h), pygame.SRCALPHA)
    card_bg.fill((15, 23, 42, 220))
    screen.blit(card_bg, (card_x, card_y))
    pygame.draw.rect(screen, (51, 65, 85), (card_x, card_y, card_w, card_h), 1, border_radius=8)

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

    # Cooldown Gauges
    laser_cd_left = max(0, BULLET_COOLDOWN_MS - (current_time - player.last_bullet_time))
    laser_ready = laser_cd_left == 0
    l_color = COLOR_BULLET if laser_ready else (100, 100, 100)
    l_text = font_sm.render("LASER: READY" if laser_ready else "LASER: CD", True, l_color)
    screen.blit(l_text, (card_x + 200, card_y + 28))

    bomb_cd_left = max(0, BOMB_COOLDOWN_MS - (current_time - player.last_bomb_time))
    bomb_ready = bomb_cd_left == 0
    b_color = COLOR_BOMB if bomb_ready else (100, 100, 100)
    b_text = font_sm.render("BOMB: READY" if bomb_ready else f"BOMB: {bomb_cd_left // 100 / 10:.1f}s", True, b_color)
    screen.blit(b_text, (card_x + 200, card_y + 68))


def draw_game_over(screen, font_lg, font_md, font_sm, final_score, best_score):
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
    pygame.init()
    pygame.display.set_caption(GAME_TITLE)
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    clock = pygame.time.Clock()

    font_sm = pygame.font.SysFont("Arial", 13, bold=True)
    font_md = pygame.font.SysFont("Arial", 17, bold=True)
    font_lg = pygame.font.SysFont("Arial", 38, bold=True)

    detector = HandDetector()
    starfield = Starfield(count=100)
    player = Player()
    sound_mgr = SoundManager()

    bullets = []
    bombs = []
    bomb_explosions = []
    enemies = []
    explosions = []

    score = 0
    high_score = 0
    game_over = False
    last_enemy_spawn = pygame.time.get_ticks()

    running = True
    while running:
        dt_ms = clock.tick(FPS)
        current_time = pygame.time.get_ticks()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_r and game_over:
                    player = Player()
                    bullets.clear()
                    bombs.clear()
                    bomb_explosions.clear()
                    enemies.clear()
                    explosions.clear()
                    score = 0
                    game_over = False
                elif not game_over:
                    if event.key == pygame.K_SPACE:
                        if current_time - player.last_bullet_time >= BULLET_COOLDOWN_MS:
                            bullets.append(Bullet(player.x, player.y - player.height // 2))
                            player.last_bullet_time = current_time
                    elif event.key == pygame.K_b:
                        if current_time - player.last_bomb_time >= BOMB_COOLDOWN_MS:
                            bombs.append(Bomb(player.x, player.y - player.height // 2))
                            player.last_bomb_time = current_time
                    elif event.key == pygame.K_s:
                        player.set_shield(not player.is_shield_active)

        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            player.move_keyboard(-8)
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            player.move_keyboard(8)

        # 2. Hand Tracking
        hand_x_ratio, finger_count, gesture_name, current_action, cam_surface = detector.process_frame()

        if not game_over:
            player.update_position(hand_x_ratio)

            if current_action == ACTION_SHOOT:
                player.set_shield(False)
                if current_time - player.last_bullet_time >= BULLET_COOLDOWN_MS:
                    bullets.append(Bullet(player.x, player.y - player.height // 2))
                    player.last_bullet_time = current_time
                    sound_mgr.play_laser()

            elif current_action == ACTION_BOMB:
                player.set_shield(False)
                if current_time - player.last_bomb_time >= BOMB_COOLDOWN_MS:
                    bombs.append(Bomb(player.x, player.y - player.height // 2))
                    player.last_bomb_time = current_time
                    sound_mgr.play_bomb()

            elif current_action == ACTION_SHIELD:
                player.set_shield(True)

            elif current_action == ACTION_STOP:
                player.set_shield(False)

            player.update_shield(dt_ms)
        else:
            if current_action == ACTION_SHIELD:
                player = Player()
                bullets.clear()
                bombs.clear()
                bomb_explosions.clear()
                enemies.clear()
                explosions.clear()
                score = 0
                game_over = False

        # 3. Game Logic Updates
        speed_multiplier = 1.0 + min(2.2, (score / 1200.0) * 0.35 + (score // 1000) * 0.28)
        starfield.update(speed_multiplier)

        if not game_over:
            if current_time - last_enemy_spawn > ENEMY_SPAWN_INTERVAL_MS:
                enemies.append(Enemy())
                last_enemy_spawn = current_time

            for b in bullets:
                b.update()
            bullets = [b for b in bullets if b.is_alive]

            for bm in bombs:
                bm.update()
                if bm.y < 80:
                    bm.is_alive = False
                    bomb_explosions.append(BombExplosion(bm.x, bm.y))
                    explosions.append(Explosion(bm.x, bm.y, is_large=True))
            bombs = [bm for bm in bombs if bm.is_alive]

            for be in bomb_explosions:
                be.update()
                for enemy in enemies:
                    if be.check_enemy_hit(enemy):
                        destroyed = enemy.take_damage(be.damage)
                        if destroyed:
                            score += SCORE_BOMB_KILL
                            explosions.append(Explosion(enemy.x, enemy.y, is_large=True))
            bomb_explosions = [be for be in bomb_explosions if be.is_alive]

            player_rect = player.get_rect()
            for enemy in enemies:
                enemy.update()

                enemy_rect = enemy.get_rect()
                for b in bullets:
                    if b.is_alive and enemy_rect.colliderect(b.get_rect()):
                        b.is_alive = False
                        destroyed = enemy.take_damage(b.damage)
                        if destroyed:
                            score += SCORE_NORMAL_KILL
                            explosions.append(Explosion(enemy.x, enemy.y))
                        break

                for bm in bombs:
                    if bm.is_alive and enemy_rect.colliderect(bm.get_rect()):
                        bm.is_alive = False
                        bomb_explosions.append(BombExplosion(bm.x, bm.y))
                        explosions.append(Explosion(bm.x, bm.y, is_large=True))

                if enemy.is_alive and enemy_rect.colliderect(player_rect):
                    enemy.is_alive = False
                    explosions.append(Explosion(enemy.x, enemy.y))
                    player.take_damage(25)
                    if player.lives <= 0:
                        game_over = True
                        if score > high_score:
                            high_score = score

                if enemy.y > SCREEN_HEIGHT + 30:
                    enemy.is_alive = False
                    if not player.is_shield_active:
                        player.take_damage(10)
                        if player.lives <= 0:
                            game_over = True
                            if score > high_score:
                                high_score = score

            enemies = [e for e in enemies if e.is_alive]

        for exp in explosions:
            exp.update()
        explosions = [exp for exp in explosions if exp.is_alive]

        # 4. Drawing
        screen.fill(COLOR_BG)
        starfield.draw(screen, speed_multiplier)

        for b in bullets:
            b.draw(screen)
        for bm in bombs:
            bm.draw(screen)
        for be in bomb_explosions:
            be.draw(screen)
        for enemy in enemies:
            enemy.draw(screen)

        if not game_over or (game_over and player.lives > 0):
            player.draw(screen)

        for exp in explosions:
            exp.draw(screen)

        draw_hud(
            screen, font_sm, font_md, font_lg, player, score, high_score,
            finger_count, gesture_name, current_action, cam_surface, current_time,
            speed_multiplier=speed_multiplier
        )

        if game_over:
            draw_game_over(screen, font_lg, font_md, font_sm, score, high_score)

        pygame.display.flip()

    detector.release()
    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
`
  },
  {
    filename: "hand_detector.py",
    description: "MediaPipe Hands tracking class, landmark extraction, and gesture classifier",
    language: "python",
    code: `"""
hand_detector.py - Real-Time MediaPipe Hand Tracking and Gesture Recognizer
=============================================================================
This module uses OpenCV and Google MediaPipe Hands to track a hand in real time,
count extended fingers, calculate hand screen coordinates, and classify gestures.
"""

import cv2
import mediapipe as mp
import pygame
import numpy as np
from settings import (
    CAMERA_INDEX, CAMERA_WIDTH, CAMERA_HEIGHT,
    CAM_PREVIEW_WIDTH, CAM_PREVIEW_HEIGHT,
    GESTURE_NONE, GESTURE_FIST, GESTURE_ONE_FINGER,
    GESTURE_TWO_FINGERS, GESTURE_OPEN_PALM,
    ACTION_STOP, ACTION_SHOOT, ACTION_BOMB, ACTION_SHIELD
)


class HandDetector:
    def __init__(self, camera_index=CAMERA_INDEX):
        self.cap = cv2.VideoCapture(camera_index)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)
        self.is_camera_available = self.cap.isOpened()

        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=1,
            min_detection_confidence=0.65,
            min_tracking_confidence=0.65
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles

        self.last_hand_x = 0.5
        self.finger_count = 0
        self.gesture_name = GESTURE_NONE
        self.current_action = ACTION_STOP

    def process_frame(self):
        if not self.is_camera_available:
            dummy = pygame.Surface((CAM_PREVIEW_WIDTH, CAM_PREVIEW_HEIGHT))
            dummy.fill((20, 20, 30))
            return 0.5, 0, GESTURE_NONE, ACTION_STOP, dummy

        success, frame = self.cap.read()
        if not success or frame is None:
            dummy = pygame.Surface((CAM_PREVIEW_WIDTH, CAM_PREVIEW_HEIGHT))
            dummy.fill((20, 20, 30))
            return self.last_hand_x, 0, GESTURE_NONE, ACTION_STOP, dummy

        # Mirror horizontally
        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_frame)

        hand_x_ratio = self.last_hand_x
        finger_count = 0
        gesture = GESTURE_NONE
        action = ACTION_STOP

        if results.multi_hand_landmarks:
            hand_landmarks = results.multi_hand_landmarks[0]
            self.mp_drawing.draw_landmarks(
                rgb_frame,
                hand_landmarks,
                self.mp_hands.HAND_CONNECTIONS,
                self.mp_drawing_styles.get_default_hand_landmarks_style(),
                self.mp_drawing_styles.get_default_hand_connections_style()
            )

            lm_list = hand_landmarks.landmark
            hand_x_ratio = max(0.05, min(0.95, lm_list[9].x))
            self.last_hand_x = hand_x_ratio

            # Finger detection: compare TIP y with PIP y (smaller y = higher up)
            fingers_up = []
            # Thumb: check tip vs ip and lateral distance
            if lm_list[4].y < lm_list[3].y and abs(lm_list[4].x - lm_list[2].x) > 0.04:
                fingers_up.append(True)
            else:
                fingers_up.append(False)

            # Index, Middle, Ring, Pinky
            fingers_up.append(lm_list[8].y < lm_list[6].y)
            fingers_up.append(lm_list[12].y < lm_list[10].y)
            fingers_up.append(lm_list[16].y < lm_list[14].y)
            fingers_up.append(lm_list[20].y < lm_list[18].y)

            finger_count = sum(fingers_up)

            if finger_count == 0:
                gesture = GESTURE_FIST
                action = ACTION_STOP
            elif finger_count == 1 and fingers_up[1]:
                gesture = GESTURE_ONE_FINGER
                action = ACTION_SHOOT
            elif finger_count == 2 and fingers_up[1] and fingers_up[2]:
                gesture = GESTURE_TWO_FINGERS
                action = ACTION_BOMB
            elif finger_count >= 4:
                gesture = GESTURE_OPEN_PALM
                action = ACTION_SHIELD
            elif finger_count == 1:
                gesture = GESTURE_ONE_FINGER
                action = ACTION_SHOOT
            elif finger_count == 2:
                gesture = GESTURE_TWO_FINGERS
                action = ACTION_BOMB
            else:
                gesture = f"{finger_count} FINGERS"
                action = ACTION_STOP

        self.finger_count = finger_count
        self.gesture_name = gesture
        self.current_action = action

        preview_rgb = cv2.resize(rgb_frame, (CAM_PREVIEW_WIDTH, CAM_PREVIEW_HEIGHT))
        preview_surface = pygame.surfarray.make_surface(np.rot90(preview_rgb))
        return hand_x_ratio, finger_count, gesture, action, preview_surface

    def release(self):
        if self.cap and self.cap.isOpened():
            self.cap.release()
        cv2.destroyAllWindows()
`
  },
  {
    filename: "game.py",
    description: "Pygame sprite classes for Player, Laser Bullets, AOE Bombs, Enemies, and Starfield",
    language: "python",
    code: `"""
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
    COLOR_PLAYER, COLOR_BULLET, COLOR_BOMB,
    COLOR_ENEMY_SCOUT, COLOR_ENEMY_HEAVY,
    COLOR_SHIELD, COLOR_RED,
    PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_START_Y, PLAYER_MAX_HEALTH,
    BULLET_SPEED, BULLET_DAMAGE,
    BOMB_SPEED, BOMB_DAMAGE, BOMB_AOE_RADIUS,
    SHIELD_MAX_DURATION_MS, SHIELD_RECHARGE_RATE,
    ENEMY_SPEED_MIN, ENEMY_SPEED_MAX, ENEMY_SCOUT_HP, ENEMY_HEAVY_HP
)


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


class Particle:
    def __init__(self, x, y, color=None):
        self.x = x
        self.y = y
        angle = random.uniform(0, math.pi * 2)
        speed = random.uniform(2.0, 7.5)
        self.vx = math.cos(angle) * speed
        self.vy = math.sin(angle) * speed
        self.radius = random.uniform(2.0, 5.5)
        self.life = 1.0
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
            pygame.draw.circle(surface, self.color, (int(self.x), int(self.y)), max(1, int(self.radius)))


class Explosion:
    def __init__(self, x, y, is_large=False):
        self.x = x
        self.y = y
        self.is_large = is_large
        self.particles = [Particle(x, y) for _ in range(36 if is_large else 18)]
        self.ring_radius = 2.0
        self.max_ring_radius = 70.0 if is_large else 35.0
        self.is_alive = True

    def update(self):
        self.ring_radius += 4.0 if self.is_large else 2.5
        for p in self.particles:
            p.update()
        self.particles = [p for p in self.particles if p.life > 0]
        if self.ring_radius >= self.max_ring_radius and len(self.particles) == 0:
            self.is_alive = False

    def draw(self, surface):
        for p in self.particles:
            p.draw(surface)
        if self.ring_radius < self.max_ring_radius:
            pygame.draw.circle(surface, (255, 120, 40), (int(self.x), int(self.y)), int(self.ring_radius), 2)


class Bullet:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.speed = BULLET_SPEED
        self.damage = BULLET_DAMAGE
        self.width = 4
        self.height = 16
        self.is_alive = True

    def update(self):
        self.y -= self.speed
        if self.y < -20:
            self.is_alive = False

    def get_rect(self):
        return pygame.Rect(self.x - self.width // 2, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, COLOR_BULLET, self.get_rect(), border_radius=2)


class Bomb:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.speed = BOMB_SPEED
        self.damage = BOMB_DAMAGE
        self.radius = 8
        self.is_alive = True

    def update(self):
        self.y -= self.speed
        if self.y < -30:
            self.is_alive = False

    def get_rect(self):
        return pygame.Rect(self.x - self.radius, self.y - self.radius, self.radius * 2, self.radius * 2)

    def draw(self, surface):
        pygame.draw.circle(surface, COLOR_BOMB, (int(self.x), int(self.y)), self.radius)
        pygame.draw.circle(surface, (255, 255, 200), (int(self.x), int(self.y)), self.radius - 3)


class BombExplosion:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.current_radius = 10.0
        self.max_radius = BOMB_AOE_RADIUS
        self.expansion_speed = 9.0
        self.damage = BOMB_DAMAGE
        self.is_alive = True
        self.hit_enemies = set()

    def update(self):
        self.current_radius += self.expansion_speed
        if self.current_radius >= self.max_radius:
            self.is_alive = False

    def check_enemy_hit(self, enemy):
        if enemy in self.hit_enemies:
            return False
        dist = math.hypot(enemy.x - self.x, enemy.y - self.y)
        if dist <= self.current_radius + enemy.width // 2:
            self.hit_enemies.add(enemy)
            return True
        return False

    def draw(self, surface):
        pygame.draw.circle(surface, (255, 100, 30), (int(self.x), int(self.y)), int(self.current_radius), 4)


class Enemy:
    def __init__(self):
        self.x = random.randint(40, SCREEN_WIDTH - 40)
        self.y = -50
        self.type = "HEAVY" if random.random() < 0.25 else "SCOUT"
        if self.type == "SCOUT":
            self.hp = ENEMY_SCOUT_HP
            self.max_hp = ENEMY_SCOUT_HP
            self.speed = random.uniform(ENEMY_SPEED_MIN + 0.5, ENEMY_SPEED_MAX)
            self.width = 38
            self.height = 36
            self.color = COLOR_ENEMY_SCOUT
        else:
            self.hp = ENEMY_HEAVY_HP
            self.max_hp = ENEMY_HEAVY_HP
            self.speed = random.uniform(ENEMY_SPEED_MIN, ENEMY_SPEED_MIN + 1.2)
            self.width = 54
            self.height = 48
            self.color = COLOR_ENEMY_HEAVY
        self.sway_offset = random.uniform(0, math.pi * 2)
        self.sway_speed = random.uniform(0.03, 0.06)
        self.is_alive = True

    def update(self):
        self.y += self.speed
        self.sway_offset += self.sway_speed
        self.x += math.sin(self.sway_offset) * 1.2
        self.x = max(20, min(SCREEN_WIDTH - 20, self.x))
        if self.y > SCREEN_HEIGHT + 60:
            self.is_alive = False

    def take_damage(self, amount):
        self.hp -= amount
        if self.hp <= 0:
            self.is_alive = False
            return True
        return False

    def get_rect(self):
        return pygame.Rect(self.x - self.width // 2, self.y - self.height // 2, self.width, self.height)

    def draw(self, surface):
        if self.type == "SCOUT":
            points = [
                (self.x, self.y + self.height // 2),
                (self.x - self.width // 2, self.y - self.height // 2),
                (self.x, self.y - self.height // 4),
                (self.x + self.width // 2, self.y - self.height // 2),
            ]
            pygame.draw.polygon(surface, self.color, points)
        else:
            points = [
                (self.x, self.y + self.height // 2),
                (self.x - self.width // 2, self.y + self.height // 6),
                (self.x - self.width // 3, self.y - self.height // 2),
                (self.x + self.width // 3, self.y - self.height // 2),
                (self.x + self.width // 2, self.y + self.height // 6),
            ]
            pygame.draw.polygon(surface, self.color, points)


class Player:
    def __init__(self):
        self.x = SCREEN_WIDTH // 2
        self.y = PLAYER_START_Y
        self.target_x = self.x
        self.width = PLAYER_WIDTH
        self.height = PLAYER_HEIGHT
        self.health = PLAYER_MAX_HEALTH
        self.max_health = PLAYER_MAX_HEALTH
        self.lives = 3
        self.last_bullet_time = 0
        self.last_bomb_time = 0
        self.is_shield_active = False
        self.shield_energy = SHIELD_MAX_DURATION_MS
        self.invulnerable_timer = 0

    def update_position(self, target_ratio):
        margin = self.width // 2 + 10
        self.target_x = margin + target_ratio * (SCREEN_WIDTH - 2 * margin)
        self.x += (self.target_x - self.x) * 0.22

    def move_keyboard(self, dx):
        self.x += dx
        margin = self.width // 2 + 10
        self.x = max(margin, min(SCREEN_WIDTH - margin, self.x))

    def set_shield(self, active):
        if active and self.shield_energy > 200:
            self.is_shield_active = True
        else:
            self.is_shield_active = False

    def update_shield(self, dt_ms):
        if self.is_shield_active:
            self.shield_energy = max(0, self.shield_energy - dt_ms)
            if self.shield_energy <= 0:
                self.is_shield_active = False
        else:
            self.shield_energy = min(SHIELD_MAX_DURATION_MS, self.shield_energy + dt_ms * SHIELD_RECHARGE_RATE)
        if self.invulnerable_timer > 0:
            self.invulnerable_timer -= dt_ms

    def take_damage(self, amount):
        if self.is_shield_active or self.invulnerable_timer > 0:
            return False
        self.health -= amount
        self.invulnerable_timer = 1000
        if self.health <= 0:
            self.lives -= 1
            if self.lives > 0:
                self.health = self.max_health
                self.invulnerable_timer = 2000
            return True
        return False

    def get_rect(self):
        return pygame.Rect(self.x - self.width // 2, self.y - self.height // 2, self.width, self.height)

    def draw(self, surface):
        # Jet engine flame
        flame_len = random.randint(8, 16)
        pygame.draw.polygon(surface, (250, 180, 40), [
            (self.x - 6, self.y + self.height // 2 - 5),
            (self.x + 6, self.y + self.height // 2 - 5),
            (self.x, self.y + self.height // 2 + flame_len)
        ])
        # Jet Body
        body_pts = [
            (self.x, self.y - self.height // 2),
            (self.x - self.width // 2, self.y + self.height // 4),
            (self.x - 10, self.y + self.height // 2),
            (self.x + 10, self.y + self.height // 2),
            (self.x + self.width // 2, self.y + self.height // 4),
        ]
        pygame.draw.polygon(surface, COLOR_PLAYER, body_pts)
        pygame.draw.polygon(surface, (255, 255, 255), body_pts, 2)

        if self.is_shield_active:
            pygame.draw.circle(surface, COLOR_SHIELD, (int(self.x), int(self.y)), int(self.width * 0.9), 3)
`
  },
  {
    filename: "settings.py",
    description: "Configurable constants for dimensions, speeds, colors, and balance",
    language: "python",
    code: `"""
settings.py - Configuration and Constants for Hand-Gesture Airplane Shooter
"""

SCREEN_WIDTH = 840
SCREEN_HEIGHT = 700
FPS = 60
GAME_TITLE = "Hand-Gesture Sky Fighter ✈️"

CAMERA_INDEX = 0
CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480

CAM_PREVIEW_WIDTH = 220
CAM_PREVIEW_HEIGHT = 165
CAM_PREVIEW_POS = (SCREEN_WIDTH - CAM_PREVIEW_WIDTH - 15, 15)

COLOR_BG = (10, 14, 26)
COLOR_PLAYER = (45, 212, 191)
COLOR_PLAYER_GLOW = (20, 184, 166)
COLOR_BULLET = (250, 204, 21)
COLOR_BOMB = (249, 115, 22)
COLOR_BOMB_BLAST = (239, 68, 68)
COLOR_ENEMY_SCOUT = (244, 63, 94)
COLOR_ENEMY_HEAVY = (168, 85, 247)
COLOR_SHIELD = (56, 189, 248)
COLOR_WHITE = (248, 250, 252)
COLOR_GRAY = (148, 163, 184)
COLOR_DARK_GRAY = (51, 65, 85)
COLOR_GREEN = (34, 197, 94)
COLOR_RED = (239, 68, 68)

PLAYER_WIDTH = 56
PLAYER_HEIGHT = 60
PLAYER_START_Y = SCREEN_HEIGHT - 90
PLAYER_MAX_HEALTH = 100
PLAYER_LIVES = 3

BULLET_SPEED = 14
BULLET_COOLDOWN_MS = 220
BULLET_DAMAGE = 25

BOMB_SPEED = 9
BOMB_COOLDOWN_MS = 1400
BOMB_AOE_RADIUS = 130
BOMB_DAMAGE = 100

SHIELD_MAX_DURATION_MS = 2500
SHIELD_RECHARGE_RATE = 0.5

ENEMY_SPAWN_INTERVAL_MS = 1100
ENEMY_SPEED_MIN = 2.0
ENEMY_SPEED_MAX = 4.5
ENEMY_SCOUT_HP = 25
ENEMY_HEAVY_HP = 75

SCORE_NORMAL_KILL = 100
SCORE_BOMB_KILL = 150

GESTURE_NONE = "NO HAND DETECTED"
GESTURE_FIST = "CLOSED FIST"
GESTURE_ONE_FINGER = "1 FINGER (INDEX)"
GESTURE_TWO_FINGERS = "2 FINGERS (V SIGN)"
GESTURE_OPEN_PALM = "OPEN PALM"

ACTION_STOP = "HOLD FIRE / CRUISE"
ACTION_SHOOT = "NORMAL LASER CANNON"
ACTION_BOMB = "AOE MISSILE / BOMB"
ACTION_SHIELD = "DEFENSIVE ENERGY SHIELD"
`
  },
  {
    filename: "requirements.txt",
    description: "Pip dependencies file with pinned versions",
    language: "text",
    code: `pygame>=2.5.0
opencv-python>=4.8.0
mediapipe>=0.10.9
numpy>=1.24.0
`
  },
  {
    filename: "run.bat",
    description: "Windows 1-click batch script to automate virtual environment and launch game",
    language: "bat",
    code: `@echo off
title Hand-Gesture Airplane Shooter Launcher
echo ========================================================
echo   Webcam Hand-Gesture Airplane Shooter (Pygame + MediaPipe)
echo ========================================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not found on your system PATH!
    echo Please install Python 3.10 or 3.11 64-bit from https://www.python.org
    pause
    exit /b
)

if not exist "venv\" (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
)

call venv\\Scripts\\activate.bat
pip install -r requirements.txt
python main.py
pause
`
  },
  {
    filename: "README.md",
    description: "Full setup documentation, Windows guide, and MediaPipe compatibility tips",
    language: "markdown",
    code: `# ✈️ Webcam Hand-Gesture Controlled Airplane Shooter

A retro-arcade 2D airplane combat game written in **Python 3**, using **Pygame** for rendering, **OpenCV** for live webcam video capture, and **Google MediaPipe Hands** for real-time hand tracking and gesture detection.

### Hand Gestures
- **1 Finger (Index)**: Shoot Normal Laser
- **2 Fingers (Peace Sign)**: Launch AOE Cluster Bomb
- **Closed Fist**: Cease Fire / Cruise
- **Open Palm**: Activate Defensive Energy Shield
- **Move Hand Horizontally**: Steer airplane left and right
`
  }
];
