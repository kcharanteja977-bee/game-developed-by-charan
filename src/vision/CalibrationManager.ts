/**
 * CalibrationManager.ts - Natural Hand Control Range & Origin Calibrator
 * Adapts to any webcam angle, desk distance, or player arm length.
 */

import { CalibrationData } from '../types';

export class CalibrationManager {
  private data: CalibrationData = {
    minX: 0.25,
    maxX: 0.75,
    minY: 0.25,
    maxY: 0.75,
    centerX: 0.5,
    centerY: 0.5,
    isCalibrated: false,
    step: 'READY',
  };

  private autoAdapt: boolean = true;
  private sampleCount: number = 0;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('skyfighter_calibration');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.data = { ...this.data, ...parsed, isCalibrated: true };
      }
    } catch {
      // ignore
    }
  }

  public saveToStorage() {
    try {
      localStorage.setItem('skyfighter_calibration', JSON.stringify(this.data));
    } catch {
      // ignore
    }
  }

  public getData(): CalibrationData {
    return { ...this.data };
  }

  public setStep(step: CalibrationData['step']) {
    this.data.step = step;
  }

  public resetCalibration() {
    this.data = {
      minX: 0.28,
      maxX: 0.72,
      minY: 0.28,
      maxY: 0.72,
      centerX: 0.5,
      centerY: 0.5,
      isCalibrated: false,
      step: 'CENTER',
    };
    this.sampleCount = 0;
  }

  public recordSample(rawX: number, rawY: number) {
    if (this.autoAdapt) {
      // Gently expand bounds to player's natural reach
      this.data.minX = Math.min(this.data.minX, Math.max(0.08, rawX - 0.05));
      this.data.maxX = Math.max(this.data.maxX, Math.min(0.92, rawX + 0.05));
      this.data.minY = Math.min(this.data.minY, Math.max(0.08, rawY - 0.05));
      this.data.maxY = Math.max(this.data.maxY, Math.min(0.92, rawY + 0.05));
      this.sampleCount++;
      if (this.sampleCount > 30) {
        this.data.isCalibrated = true;
      }
    }
  }

  /**
   * Transforms raw webcam hand coordinate [0..1] into calibrated aircraft flight space [-1..1]
   */
  public normalize(rawX: number, rawY: number): { normX: number; normY: number } {
    this.recordSample(rawX, rawY);

    const rangeX = Math.max(0.2, this.data.maxX - this.data.minX);
    const rangeY = Math.max(0.2, this.data.maxY - this.data.minY);

    // Centered mapping [-1 .. +1]
    let nx = ((rawX - this.data.minX) / rangeX - 0.5) * 2;
    let ny = ((rawY - this.data.minY) / rangeY - 0.5) * 2;

    // Clamp to valid range with soft curve
    nx = Math.max(-1.15, Math.min(1.15, nx));
    ny = Math.max(-1.15, Math.min(1.15, ny));

    return { normX: nx, normY: ny };
  }
}
