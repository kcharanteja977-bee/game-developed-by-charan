/**
 * HandSmoother.ts - Zero-Jitter Adaptive Hand Position & Kinematics Filter
 * Combines exponential moving average (EMA) with adaptive deadbanding
 * to eliminate sensor jitter while preserving lightning-fast twitch reflexes.
 */

export class HandSmoother {
  private smoothX: number = 0.5;
  private smoothY: number = 0.5;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private lastTime: number = 0;
  private initialized: boolean = false;

  private alpha: number = 0.38; // Base smoothing factor
  private deadzone: number = 0.003; // Ignore micro-jitters below 0.3% of viewport

  public reset() {
    this.initialized = false;
    this.smoothX = 0.5;
    this.smoothY = 0.5;
    this.velocityX = 0;
    this.velocityY = 0;
  }

  public update(rawX: number, rawY: number, now: number = performance.now()): {
    x: number;
    y: number;
    vx: number;
    vy: number;
  } {
    if (!this.initialized) {
      this.smoothX = rawX;
      this.smoothY = rawY;
      this.lastTime = now;
      this.initialized = true;
      return { x: this.smoothX, y: this.smoothY, vx: 0, vy: 0 };
    }

    const dt = Math.max(0.001, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // Calculate displacement
    const dx = rawX - this.smoothX;
    const dy = rawY - this.smoothY;

    // Apply adaptive alpha: faster movement requires higher responsiveness (less lag)
    const speed = Math.hypot(dx, dy);
    const dynamicAlpha = Math.min(0.85, this.alpha + speed * 1.5);

    // Apply deadzone for stationary hand stability
    if (Math.abs(dx) > this.deadzone) {
      this.smoothX += dx * dynamicAlpha;
    }
    if (Math.abs(dy) > this.deadzone) {
      this.smoothY += dy * dynamicAlpha;
    }

    // Compute velocity for aircraft banking physics
    this.velocityX = (dx * dynamicAlpha) / dt;
    this.velocityY = (dy * dynamicAlpha) / dt;

    return {
      x: Math.max(0.02, Math.min(0.98, this.smoothX)),
      y: Math.max(0.02, Math.min(0.98, this.smoothY)),
      vx: this.velocityX,
      vy: this.velocityY,
    };
  }
}
