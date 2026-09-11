# ✈️ Webcam Hand-Gesture Controlled Airplane Shooter

A retro-arcade 2D airplane combat game written in **Python 3**, using **Pygame** for rendering, **OpenCV** for live webcam video capture, and **Google MediaPipe Hands** for real-time 21-landmark hand tracking and finger counting.

---

## 🎮 Game Controls & Hand Gestures

Control your fighter aircraft naturally using your laptop or desktop webcam:

| Hand Gesture | Action | In-Game Effect |
| :--- | :--- | :--- |
| **Move Hand Left / Right** | **Airplane Steering** | The plane smoothly follows your palm horizontally across the screen |
| **1 Finger Raised (Index)** | **Normal Shoot** | Fires high-velocity plasma laser bolts (1 enemy destroyed per hit) |
| **2 Fingers Raised (Peace / V Sign)** | **Special Bomb Attack** | Launches a heavy missile with a massive circular **Area-of-Effect (AOE)** shockwave that destroys all nearby enemies |
| **Closed Fist (0 Fingers)** | **Hold Fire / Cruise** | Pauses weapon fire to conserve weapon cooldowns and avoid accidental shots |
| **Open Hand / Palm (4-5 Fingers)** | **Defensive Energy Shield** | Deploys a cyan forcefield around your jet that absorbs incoming damage and missile impacts |

### ⚡ Power-Up Drops (Intercept Falling Capsules):
- **⚡ Rapid Fire (Amber Capsule)**: Accelerates plasma laser fire rate to 2.2x speed for 12 seconds with glowing wingtip plasma conduits.
- **3X Triple Shot (Cyan Capsule)**: Upgrades cannon to a 3-way spread volley for 12 seconds, wiping out full waves simultaneously.
- **🛡️ Shield Boost (Emerald Capsule)**: Restores +50% shield forcefield energy and repairs aircraft hull integrity (+25 HP).

> **Backup Controls:** You can also use `A` / `D` or `Left` / `Right` arrows to steer, `Spacebar` to shoot, `B` to launch bombs, `S` for shield, and `R` to restart if no webcam is connected.

---

## 📁 Project Architecture & File Breakdown

The project is structured into clean, modular, beginner-friendly files:

1. **`main.py`**:
   - Initializes the 60 FPS Pygame display window and game clock.
   - Coordinates the main game loop, event polling, weapon cooldown timers, and game-over state.
   - Houses the `draw_hud` function which draws the Score, Health Bar, Lives icons, Mini Webcam Picture-in-Picture (PIP) screen with hand skeleton tracking, and the active Gesture status card.

2. **`hand_detector.py`**:
   - Encapsulates `cv2.VideoCapture` and Google MediaPipe Hands (`mp.solutions.hands.Hands`).
   - Mirrors the video feed with `cv2.flip(frame, 1)` so moving your physical hand to the right moves your plane to the right on screen.
   - Implements the finger counting algorithm comparing fingertip vertical position (`landmark.y`) with knuckle PIP positions.
   - Renders landmark bone skeleton connections and converts OpenCV RGB frames into Pygame surfaces for the HUD preview.

3. **`game.py`**:
   - **`Player`**: Fighter aircraft with vector rendering, engine exhaust particle animation, health/lives management, and smooth linear interpolation (`lerp`) toward hand coordinates.
   - **`Bullet`**: High-velocity laser projectiles with glowing tail and single-target impact logic.
   - **`Bomb` & `BombExplosion`**: Heavy missile and circular expanding shockwave calculating Euclidean distance (`math.hypot`) to damage multiple enemies simultaneously.
   - **`Enemy`**: Scout ships and Heavy Cruiser ships entering from the top with oscillating wave movement.
   - **`Starfield`**: 3-layer parallax scrolling star background creating high-speed vertical flight illusion.
   - **`Explosion` & `Particle`**: Dynamic multi-colored explosion physics and expanding shockwave rings.

4. **`settings.py`**:
   - Centralized configuration file for screen dimensions (840x700), colors, weapon speeds, cooldown durations, spawn rates, and gesture text mappings.

5. **`requirements.txt`**:
   - Dependencies with pinned versions: `pygame`, `opencv-python`, `mediapipe`, `numpy`.

6. **`run.bat`**:
   - Automated 1-click Windows launcher that creates a virtual environment, installs requirements, and launches the game.

---

## 💻 How to Run on Windows (Step-by-Step)

### Step 1: Install Python
1. Download **Python 3.10** or **Python 3.11** (64-bit) from [python.org](https://www.python.org/downloads/).
2. **CRITICAL**: During the Windows installer setup, check the box:
   ☑️ **"Add python.exe to PATH"**
   *(If this is not checked, Windows Command Prompt will not recognize the `python` command).*

### Step 2: Open Command Prompt or Terminal
1. Open the folder containing the project files.
2. In the folder address bar at the top of File Explorer, type `cmd` and press **Enter**.

### Step 3: Create a Virtual Environment (Recommended)
```cmd
python -m venv venv
venv\Scripts\activate
```

### Step 4: Install Required Packages
```cmd
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Step 5: Start the Game!
```cmd
python main.py
```
*(Or simply double-click `run.bat`!)*

---

## ⚠️ MediaPipe Compatibility Solutions

If you encounter errors during `pip install mediapipe` or when launching:

### Issue 1: "Could not find a version that satisfies the requirement mediapipe"
- **Cause**: MediaPipe only publishes pre-built binary wheels for **64-bit Python** and Python versions up to **Python 3.11**. If you have 32-bit Python or the newly released Python 3.12/3.13, pip may not find pre-built wheels.
- **Solution**:
  1. Check your Python architecture in CMD:
     ```cmd
     python -c "import struct; print(struct.calcsize('P') * 8)"
     ```
     If this prints `32`, uninstall Python and install the **Windows x86-64 executable installer**.
  2. If running Python 3.12, install Python 3.10 or 3.11:
     ```cmd
     # Or if you have Python Launcher (py):
     py -3.10 -m venv venv
     venv\Scripts\activate
     pip install -r requirements.txt
     ```

### Issue 2: Webcam Not Opening (Black Screen / Error)
- **Cause**: Windows camera privacy settings or multiple camera devices (e.g. virtual cameras like OBS, external USB cams).
- **Solution**:
  1. Open Windows **Settings > Privacy & Security > Camera** and make sure "Let desktop apps access your camera" is **ON**.
  2. In `settings.py`, change `CAMERA_INDEX = 0` to `CAMERA_INDEX = 1` or `2` if you have an external webcam plugged in.

---

## 💡 How the Hand Detection Algorithm Works

MediaPipe Hands returns 21 3D coordinates $(x, y, z)$ normalized between $0.0$ and $1.0$:
- **Wrist**: Landmark 0
- **Thumb**: Tip 4, IP 3, MCP 2
- **Index**: Tip 8, DIP 7, PIP 6, MCP 5
- **Middle**: Tip 12, DIP 11, PIP 10, MCP 9
- **Ring**: Tip 16, DIP 15, PIP 14, MCP 13
- **Pinky**: Tip 20, DIP 19, PIP 18, MCP 17

Because the screen coordinate system has $(0, 0)$ in the top-left corner, smaller $y$ values represent higher positions on screen.
Therefore:
$$\text{Finger is UP} \iff \text{Tip.y} < \text{PIP.y}$$
By counting which fingers are extended:
- `fingers == [0, 1, 0, 0, 0]` $\rightarrow$ **1 Finger Raised** $\rightarrow$ **Shoot**
- `fingers == [0, 1, 1, 0, 0]` $\rightarrow$ **2 Fingers (Peace Sign)** $\rightarrow$ **Special Bomb**
- `sum(fingers) == 0` $\rightarrow$ **Closed Fist** $\rightarrow$ **Cease Fire**
- `sum(fingers) >= 4` $\rightarrow$ **Open Palm** $\rightarrow$ **Energy Shield**
