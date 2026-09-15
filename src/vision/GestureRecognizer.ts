/**
 * GestureRecognizer.ts - 3D Angle-Invariant Hand Gesture Classifier
 * Mathematically analyzes finger bone straightness, axial projection along the palm,
 * and joint-to-wrist Euclidean distances to reliably classify hand gestures regardless
 * of banking roll, climb pitch, camera tilt, or distance.
 */

import { GestureType, ActionType, HandLandmark } from '../types';

export interface GestureResult {
  gesture: GestureType;
  action: ActionType;
  confidence: number;
  fingerCount: number;
  extended: boolean[]; // [thumb, index, middle, ring, pinky]
}

export class GestureRecognizer {
  private history: GestureType[] = [];
  private historyLength: number = 3;

  /**
   * Euclidean distance between two 3D landmarks
   */
  private getDist(p1: HandLandmark, p2: HandLandmark): number {
    if (!p1 || !p2) return 0;
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = ((p1.z || 0) - (p2.z || 0)) * 0.4;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Classify 21 MediaPipe hand landmarks into flight combat gestures
   */
  public classify(lm: HandLandmark[]): GestureResult {
    if (!lm || lm.length < 21) {
      return {
        gesture: 'NONE',
        action: 'HOLD FIRE',
        confidence: 0,
        fingerCount: 0,
        extended: [false, false, false, false, false],
      };
    }

    const wrist = lm[0];

    // 1. Hand Palm Orientation Vector: wrist (0) -> middle MCP (9)
    const ux = lm[9].x - wrist.x;
    const uy = lm[9].y - wrist.y;
    const uz = ((lm[9].z || 0) - (wrist.z || 0)) * 0.4;
    const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
    const dirX = ux / uLen;
    const dirY = uy / uLen;

    /**
     * Evaluates finger extension using dual anatomical metrics:
     * A. Segment straightness (distance MCP to TIP divided by sum of phalanx lengths)
     * B. Longitudinal projection along palm axis (TIP position vs PIP position)
     */
    const checkFingerExtended = (mcpIdx: number, pipIdx: number, dipIdx: number, tipIdx: number): boolean => {
      const mcp = lm[mcpIdx];
      const pip = lm[pipIdx];
      const dip = lm[dipIdx];
      const tip = lm[tipIdx];

      // Phalanx segment lengths
      const seg1 = this.getDist(mcp, pip);
      const seg2 = this.getDist(pip, dip);
      const seg3 = this.getDist(dip, tip);
      const totalPhalanxLen = seg1 + seg2 + seg3;

      // Straight-line distance from MCP to Tip
      const straightDist = this.getDist(mcp, tip);
      const straightness = straightDist / Math.max(0.001, totalPhalanxLen);

      // Distance to wrist
      const tipDistWrist = this.getDist(tip, wrist);
      const pipDistWrist = this.getDist(pip, wrist);

      // Projection along the hand's longitudinal direction
      const projTip = (tip.x - mcp.x) * dirX + (tip.y - mcp.y) * dirY;
      const projPip = (pip.x - mcp.x) * dirX + (pip.y - mcp.y) * dirY;

      // A finger is extended if straightness is high and tip is further out than PIP
      if (straightness > 0.72) return true;
      if (straightness < 0.50) return false;

      // In ambiguous angles, verify tip is further from wrist and projected along hand axis
      return (tipDistWrist > pipDistWrist * 0.98) && (projTip > projPip - 0.015);
    };

    // 1. Index Finger (MCP 5, PIP 6, DIP 7, TIP 8)
    const indexUp = checkFingerExtended(5, 6, 7, 8);

    // 2. Middle Finger (MCP 9, PIP 10, DIP 11, TIP 12)
    const middleUp = checkFingerExtended(9, 10, 11, 12);

    // 3. Ring Finger (MCP 13, PIP 14, DIP 15, TIP 16)
    const ringUp = checkFingerExtended(13, 14, 15, 16);

    // 4. Pinky Finger (MCP 17, PIP 18, DIP 19, TIP 20)
    const pinkyUp = checkFingerExtended(17, 18, 19, 20);

    // 5. Thumb (MCP 2, IP 3, TIP 4)
    const thumbDistPinky = this.getDist(lm[4], lm[17]);
    const thumbMcpDistPinky = this.getDist(lm[2], lm[17]);
    const thumbDistIndexMcp = this.getDist(lm[4], lm[5]);
    const thumbIpDistIndexMcp = this.getDist(lm[3], lm[5]);
    const thumbSeg1 = this.getDist(lm[2], lm[3]);
    const thumbSeg2 = this.getDist(lm[3], lm[4]);
    const thumbStraightness = this.getDist(lm[2], lm[4]) / Math.max(0.001, thumbSeg1 + thumbSeg2);

    const thumbUp =
      thumbStraightness > 0.68 &&
      thumbDistPinky > thumbMcpDistPinky * 1.10 &&
      thumbDistIndexMcp > thumbIpDistIndexMcp * 0.95;

    const extended = [thumbUp, indexUp, middleUp, ringUp, pinkyUp];
    const mainFingersCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
    const totalFingerCount = extended.filter(Boolean).length;

    // Natural Human Combat Gestures for Drone Piloting
    let rawGesture: GestureType = 'NONE';
    let rawAction: ActionType = 'HOVER / MOVE';

    if (totalFingerCount === 0 || mainFingersCount === 0) {
      rawGesture = 'FIST';
      rawAction = 'HOVER / MOVE';
    } else if (totalFingerCount === 1 || mainFingersCount === 1) {
      rawGesture = 'ONE_FINGER';
      rawAction = 'SINGLE BULLET';
    } else if (totalFingerCount === 2 || mainFingersCount === 2) {
      rawGesture = 'TWO_FINGERS';
      rawAction = 'RAPID STREAM';
    } else if (totalFingerCount === 3 || mainFingersCount === 3) {
      rawGesture = 'THREE_FINGERS';
      rawAction = 'PLASMA SPHERE';
    } else if (totalFingerCount === 4 || mainFingersCount === 4) {
      rawGesture = 'FOUR_FINGERS';
      rawAction = 'ESCORT DRONES';
    } else {
      rawGesture = 'FIVE_FINGERS';
      rawAction = 'LASER BEAM';
    }

    // Temporal Hysteresis Filter (prevents frame-to-frame flickering)
    this.history.push(rawGesture);
    if (this.history.length > this.historyLength) {
      this.history.shift();
    }

    const votes: Record<string, number> = {};
    for (const g of this.history) {
      votes[g] = (votes[g] || 0) + 1;
    }

    let stableGesture: GestureType = rawGesture;
    for (const [g, count] of Object.entries(votes)) {
      if (count >= 2) {
        stableGesture = g as GestureType;
        break;
      }
    }

    let finalAction: ActionType = 'HOVER / MOVE';
    if (stableGesture === 'FIST') finalAction = 'HOVER / MOVE';
    else if (stableGesture === 'ONE_FINGER') finalAction = 'SINGLE BULLET';
    else if (stableGesture === 'TWO_FINGERS') finalAction = 'RAPID STREAM';
    else if (stableGesture === 'THREE_FINGERS') finalAction = 'PLASMA SPHERE';
    else if (stableGesture === 'FOUR_FINGERS') finalAction = 'ESCORT DRONES';
    else if (stableGesture === 'FIVE_FINGERS' || stableGesture === 'OPEN_PALM') finalAction = 'LASER BEAM';

    return {
      gesture: stableGesture,
      action: finalAction,
      confidence: 0.96,
      fingerCount: totalFingerCount,
      extended,
    };
  }
}
