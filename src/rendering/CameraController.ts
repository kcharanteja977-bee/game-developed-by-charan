/**
 * CameraController.ts - Dynamic Cinematic 3rd-Person Chase Camera
 * Implements spring-damper tracking, bank-induced horizon roll,
 * FoV supersonic compression, engine vibration, and trauma-based 3D screen shake.
 */

import * as THREE from 'three';

export class CameraController {
  public camera: THREE.PerspectiveCamera;

  // Chase target offsets
  private offset: THREE.Vector3 = new THREE.Vector3(0, 4.2, 13.5);
  private lookOffset: THREE.Vector3 = new THREE.Vector3(0, 1.2, -18);

  // Trauma-based camera shake (0 to 1)
  private trauma: number = 0;
  private traumaDecay: number = 1.4;

  // Engine micro-vibration phase
  private shakePhase: number = 0;

  // Dynamic FoV
  private baseFov: number = 60;
  private targetFov: number = 60;

  constructor(fov: number = 60, aspect: number = 16 / 9, near: number = 0.1, far: number = 1800) {
    this.baseFov = fov;
    this.targetFov = fov;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(0, 5, 14);
  }

  public addTrauma(amount: number) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  public setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Updates camera position and orientation relative to player fighter jet
   */
  public update(
    playerPos: THREE.Vector3,
    playerRoll: number,
    playerPitch: number,
    speedMultiplier: number,
    delta: number
  ) {
    // 1. Decay trauma
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - this.traumaDecay * delta);
    }
    const shakeIntensity = this.trauma * this.trauma;

    this.shakePhase += delta * 24;
    const engineVibeX = Math.sin(this.shakePhase * 1.3) * 0.03 * speedMultiplier;
    const engineVibeY = Math.cos(this.shakePhase * 1.7) * 0.03 * speedMultiplier;

    const traumaShakeX = (Math.random() - 0.5) * 1.6 * shakeIntensity;
    const traumaShakeY = (Math.random() - 0.5) * 1.6 * shakeIntensity;
    const traumaShakeZ = (Math.random() - 0.5) * 0.8 * shakeIntensity;

    // 2. Dynamic chase position (spring lag behind aircraft with banking lean)
    const targetCamX = playerPos.x * 0.72 + this.offset.x + engineVibeX + traumaShakeX;
    const targetCamY = playerPos.y * 0.65 + this.offset.y + engineVibeY + traumaShakeY;
    const targetCamZ = playerPos.z + this.offset.z + traumaShakeZ;

    // Smooth camera damping
    this.camera.position.x += (targetCamX - this.camera.position.x) * (9.0 * delta);
    this.camera.position.y += (targetCamY - this.camera.position.y) * (8.0 * delta);
    this.camera.position.z += (targetCamZ - this.camera.position.z) * (10.0 * delta);

    // 3. Look-at point slightly ahead of aircraft nose
    const lookTarget = new THREE.Vector3(
      playerPos.x * 0.95 + this.lookOffset.x,
      playerPos.y * 0.9 + this.lookOffset.y,
      playerPos.z + this.lookOffset.z
    );
    this.camera.lookAt(lookTarget);

    // 4. Subtle horizon tilt during sharp banks (cinematic cockpit roll)
    const bankRoll = -playerRoll * 0.22;
    this.camera.rotation.z = bankRoll + (Math.random() - 0.5) * 0.08 * shakeIntensity;

    // 5. Dynamic FOV expansion at high Mach speeds (tunnel-vision warp)
    this.targetFov = this.baseFov + (speedMultiplier - 1.0) * 14;
    this.camera.fov += (this.targetFov - this.camera.fov) * (4.0 * delta);
    this.camera.updateProjectionMatrix();
  }
}
