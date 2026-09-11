"""
hand_detector.py - Real-Time MediaPipe Hand Tracking and Gesture Recognizer
=============================================================================
This module uses OpenCV and Google MediaPipe Hands to track a hand in real time,
count extended fingers, calculate hand screen coordinates, and classify gestures:
- 1 Finger raised (Index) -> Normal Shoot
- 2 Fingers raised (Peace sign) -> Special AOE Bomb
- Closed fist (0 fingers) -> Cease fire / Standby
- Open palm (4-5 fingers) -> Energy Shield / Defensive Mode
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
    """
    Handles webcam capture and MediaPipe hand gesture analysis.
    """

    def __init__(self, camera_index=CAMERA_INDEX):
        """Initializes OpenCV video capture and MediaPipe Hands solution."""
        print(f"[HandDetector] Initializing webcam at index {camera_index}...")
        self.cap = cv2.VideoCapture(camera_index)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)

        self.is_camera_available = self.cap.isOpened()
        if not self.is_camera_available:
            print("[HandDetector] WARNING: Could not open camera. Game will support keyboard fallback!")

        # Initialize MediaPipe Hands
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=1,              # Track primary single hand for precision
            min_detection_confidence=0.65,
            min_tracking_confidence=0.65
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles

        # Tracking state
        self.last_hand_x = 0.5            # Centered by default (0.0 left to 1.0 right)
        self.finger_count = 0
        self.gesture_name = GESTURE_NONE
        self.current_action = ACTION_STOP

    def process_frame(self):
        """
        Reads one frame from the webcam, detects hand landmarks, counts fingers,
        and returns:
            hand_x_ratio (float): Normalized 0.0-1.0 horizontal position of the hand
            finger_count (int): Number of raised fingers (0 to 5)
            gesture_name (str): Recognized gesture name
            action_name (str): Action mapped to this gesture
            preview_surface (pygame.Surface): Pygame surface ready to blit onto HUD
        """
        if not self.is_camera_available:
            # Fallback black surface if no camera is plugged in
            dummy_surface = pygame.Surface((CAM_PREVIEW_WIDTH, CAM_PREVIEW_HEIGHT))
            dummy_surface.fill((20, 20, 30))
            return 0.5, 0, GESTURE_NONE, ACTION_STOP, dummy_surface

        success, frame = self.cap.read()
        if not success or frame is None:
            dummy_surface = pygame.Surface((CAM_PREVIEW_WIDTH, CAM_PREVIEW_HEIGHT))
            dummy_surface.fill((20, 20, 30))
            return self.last_hand_x, 0, GESTURE_NONE, ACTION_STOP, dummy_surface

        # 1. Flip horizontally so it acts like a natural mirror (move right -> plane moves right)
        frame = cv2.flip(frame, 1)

        # 2. Convert BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_frame)

        hand_x_ratio = self.last_hand_x
        finger_count = 0
        gesture = GESTURE_NONE
        action = ACTION_STOP

        if results.multi_hand_landmarks:
            hand_landmarks = results.multi_hand_landmarks[0]

            # Draw landmarks directly onto the RGB frame for the HUD preview
            self.mp_drawing.draw_landmarks(
                rgb_frame,
                hand_landmarks,
                self.mp_hands.HAND_CONNECTIONS,
                self.mp_drawing_styles.get_default_hand_landmarks_style(),
                self.mp_drawing_styles.get_default_hand_connections_style()
            )

            # Extract landmark coordinates (21 landmarks)
            lm_list = hand_landmarks.landmark

            # Horizontal steering: Landmark 9 is the middle finger MCP (palm center)
            hand_x_ratio = lm_list[9].x
            # Clamp to 0.0 - 1.0 range
            hand_x_ratio = max(0.05, min(0.95, hand_x_ratio))
            self.last_hand_x = hand_x_ratio

            # ----------------------------------------------------
            # FINGER DETECTION ALGORITHM
            # ----------------------------------------------------
            # For each finger, compare TIP y coordinate with PIP (knuckle) y coordinate.
            # In screen coordinates, a smaller y value means HIGHER up!
            fingers_up = []

            # 1. Thumb: Check distance from wrist or horizontal extension
            # For a general upright hand, thumb tip (4) is higher than MCP (2)
            # or thumb tip x is separated from index knuckle.
            # Robust vertical/lateral check:
            if lm_list[4].y < lm_list[3].y and abs(lm_list[4].x - lm_list[2].x) > 0.04:
                fingers_up.append(True)
            else:
                fingers_up.append(False)

            # 2. Index finger: Tip (8) vs PIP (6)
            fingers_up.append(lm_list[8].y < lm_list[6].y)

            # 3. Middle finger: Tip (12) vs PIP (10)
            fingers_up.append(lm_list[12].y < lm_list[10].y)

            # 4. Ring finger: Tip (16) vs PIP (14)
            fingers_up.append(lm_list[16].y < lm_list[14].y)

            # 5. Pinky finger: Tip (20) vs PIP (18)
            fingers_up.append(lm_list[20].y < lm_list[18].y)

            finger_count = sum(fingers_up)

            # ----------------------------------------------------
            # GESTURE CLASSIFICATION
            # ----------------------------------------------------
            # 1. Closed Fist: 0 fingers up
            if finger_count == 0:
                gesture = GESTURE_FIST
                action = ACTION_STOP

            # 2. Exactly 1 Finger raised (Index finger) -> Normal Laser Shoot
            elif finger_count == 1 and fingers_up[1]:
                gesture = GESTURE_ONE_FINGER
                action = ACTION_SHOOT

            # 3. Peace / V sign: Index and Middle up (2 fingers) -> Special AOE Bomb
            elif finger_count == 2 and fingers_up[1] and fingers_up[2]:
                gesture = GESTURE_TWO_FINGERS
                action = ACTION_BOMB

            # 4. Open Hand / Palm: 4 or 5 fingers extended -> Defensive Energy Shield
            elif finger_count >= 4:
                gesture = GESTURE_OPEN_PALM
                action = ACTION_SHIELD

            # Fallback matching based purely on finger count if angles are slight
            elif finger_count == 1:
                gesture = GESTURE_ONE_FINGER
                action = ACTION_SHOOT
            elif finger_count == 2:
                gesture = GESTURE_TWO_FINGERS
                action = ACTION_BOMB
            else:
                gesture = f"{finger_count} FINGERS"
                action = ACTION_STOP
        else:
            gesture = GESTURE_NONE
            action = ACTION_STOP

        self.finger_count = finger_count
        self.gesture_name = gesture
        self.current_action = action

        # ----------------------------------------------------
        # CONVERT FRAME TO PYGAME SURFACE FOR HUD PREVIEW
        # ----------------------------------------------------
        # Resize to the small preview dimension
        preview_rgb = cv2.resize(rgb_frame, (CAM_PREVIEW_WIDTH, CAM_PREVIEW_HEIGHT))

        # Rotate/swap axes for Pygame surface format (width, height, 3)
        # OpenCV uses (H, W, C), Pygame surface from buffer expects (W, H)
        preview_surface = pygame.surfarray.make_surface(np.rot90(preview_rgb))

        return hand_x_ratio, finger_count, gesture, action, preview_surface

    def release(self):
        """Releases the webcam hardware resource."""
        if self.cap and self.cap.isOpened():
            self.cap.release()
        cv2.destroyAllWindows()
