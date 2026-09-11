"""
settings.py - Configuration and Constants for Hand-Gesture Airplane Shooter
===========================================================================
This file contains all the constants, colors, display dimensions,
and gameplay balancing variables used across the game.
"""

# ==========================================
# WINDOW & DISPLAY SETTINGS
# ==========================================
SCREEN_WIDTH = 840
SCREEN_HEIGHT = 700
FPS = 60
GAME_TITLE = "Hand-Gesture Sky Fighter ✈️"

# ==========================================
# WEBCAM & HAND TRACKING SETTINGS
# ==========================================
CAMERA_INDEX = 0          # Default laptop webcam (usually 0)
CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480

# Mini webcam preview window in the top-right corner of the game screen
CAM_PREVIEW_WIDTH = 220
CAM_PREVIEW_HEIGHT = 165
CAM_PREVIEW_POS = (SCREEN_WIDTH - CAM_PREVIEW_WIDTH - 15, 15)

# Sensitivity for moving airplane horizontally based on hand position (0.0 to 1.0)
HAND_SMOOTHING = 0.20     # Linear interpolation factor for smooth flight movement

# ==========================================
# COLOR PALETTE (RGB)
# ==========================================
COLOR_BG = (10, 14, 26)             # Deep space navy blue
COLOR_PLAYER = (45, 212, 191)       # Neon cyan / teal
COLOR_PLAYER_GLOW = (20, 184, 166)  # Subtle glow
COLOR_BULLET = (250, 204, 21)       # Bright laser yellow
COLOR_BOMB = (249, 115, 22)         # Fiery orange missile
COLOR_BOMB_BLAST = (239, 68, 68)    # Explosion red/orange
COLOR_ENEMY_SCOUT = (244, 63, 94)   # Rose red scout
COLOR_ENEMY_HEAVY = (168, 85, 247)  # Royal purple heavy ship
COLOR_SHIELD = (56, 189, 248)       # Electric cyan energy shield
COLOR_HUD_BG = (15, 23, 42, 210)    # Semi-transparent dark slate
COLOR_WHITE = (248, 250, 252)
COLOR_GRAY = (148, 163, 184)
COLOR_DARK_GRAY = (51, 65, 85)
COLOR_GREEN = (34, 197, 94)
COLOR_RED = (239, 68, 68)

# ==========================================
# PLAYER CONFIGURATION
# ==========================================
PLAYER_WIDTH = 56
PLAYER_HEIGHT = 60
PLAYER_START_Y = SCREEN_HEIGHT - 90
PLAYER_MAX_HEALTH = 100
PLAYER_LIVES = 3

# ==========================================
# WEAPONS & COOLDOWNS (in milliseconds)
# ==========================================
BULLET_SPEED = 14
BULLET_COOLDOWN_MS = 220       # ~4 shots per second max
BULLET_DAMAGE = 25

BOMB_SPEED = 9
BOMB_COOLDOWN_MS = 1400        # Powerful AOE bomb has a longer cooldown
BOMB_AOE_RADIUS = 130          # Blast radius destroying all enemies inside
BOMB_DAMAGE = 100

SHIELD_MAX_DURATION_MS = 2500  # Shield can stay up for 2.5s continuously
SHIELD_RECHARGE_RATE = 0.5     # Recharge rate when shield is not active

# ==========================================
# ENEMY CONFIGURATION
# ==========================================
ENEMY_SPAWN_INTERVAL_MS = 1100 # Spawns a new enemy every 1.1 seconds
ENEMY_SPEED_MIN = 2.0
ENEMY_SPEED_MAX = 4.5
ENEMY_SCOUT_HP = 25
ENEMY_HEAVY_HP = 75

# ==========================================
# SCORING
# ==========================================
SCORE_NORMAL_KILL = 100
SCORE_BOMB_KILL = 150
SCORE_WAVE_BONUS = 500

# ==========================================
# GESTURE LABELS & ACTION MAPPINGS
# ==========================================
GESTURE_NONE = "NO HAND DETECTED"
GESTURE_FIST = "CLOSED FIST"
GESTURE_ONE_FINGER = "1 FINGER (INDEX)"
GESTURE_TWO_FINGERS = "2 FINGERS (V SIGN)"
GESTURE_OPEN_PALM = "OPEN PALM"

ACTION_STOP = "HOLD FIRE / CRUISE"
ACTION_SHOOT = "NORMAL LASER CANNON"
ACTION_BOMB = "AOE MISSILE / BOMB"
ACTION_SHIELD = "DEFENSIVE ENERGY SHIELD"
