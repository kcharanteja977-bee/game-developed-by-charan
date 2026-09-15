/**
 * PlayerAircraft.ts - Supersonic Fighter Jet Kinematics & 3D Flight Physics
 * Simulates realistic aerodynamic response:
 * - Damped positional tracking (never teleports)
 * - Coordinated banking roll (roll into turns)
 * - Elevator pitch up/down with canard deflection
 * - Afterburner flame length scaling with thrust
 * - Atmospheric wingtip contrail streamers
 * - Energy shield dome with impact distortion
 */

import * as THREE from 'three';
import { createPlayerFighter, createWingmanDrone } from '../three/aircraftModels';

export class PlayerAircraft {
  public group: THREE.Group;
  public fighterData: ReturnType<typeof createPlayerFighter>;

  // Kinematics state
  public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public targetX: number = 0;
  public targetY: number = 0;

  // Flight attitude angles (radians)
  public roll: number = 0;
  public pitch: number = 0;
  public yaw: number = 0;

  // Telemetry outputs
  public airspeedKmh: number = 5.0;
  public altitudeM: number = 2.4;
  public vsiMs: number = 0.0;
  public batteryPercent: number = 74;
  public thrustPercent: number = 45;

  // Bounding box for collisions
  public collisionRadius: number = 2.4;

  // Wingtip vapor contrails
  private leftContrailPoints: THREE.Vector3[] = [];
  private rightContrailPoints: THREE.Vector3[] = [];
  private contrailLineLeft: THREE.Line;
  private contrailLineRight: THREE.Line;
  private maxContrailHistory: number = 18;

  // Shield state
  public shieldActive: boolean = false;
  public shieldOpacity: number = 0;

  // Vibration & rotor phase
  private burnPhase: number = 0;
  private rotorAngle: number = 0;

  // Wingman Escort companion drones
  public escortActive: boolean = false;
  private wingmanLeft: ReturnType<typeof createWingmanDrone> | null = null;
  private wingmanRight: ReturnType<typeof createWingmanDrone> | null = null;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.fighterData = createPlayerFighter();
    this.group.add(this.fighterData.root);
    scene.add(this.group);

    // Build wingman escorts
    this.wingmanLeft = createWingmanDrone();
    this.wingmanRight = createWingmanDrone();
    this.wingmanLeft.group.visible = false;
    this.wingmanRight.group.visible = false;
    scene.add(this.wingmanLeft.group);
    scene.add(this.wingmanRight.group);

    // Build wingtip contrail geometry
    const contrailMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4,
    });

    const initPts = Array(this.maxContrailHistory).fill(new THREE.Vector3(0, 0, 0));
    const leftGeo = new THREE.BufferGeometry().setFromPoints(initPts);
    const rightGeo = new THREE.BufferGeometry().setFromPoints(initPts);

    this.contrailLineLeft = new THREE.Line(leftGeo, contrailMat);
    this.contrailLineRight = new THREE.Line(rightGeo, contrailMat);
    scene.add(this.contrailLineLeft);
    scene.add(this.contrailLineRight);
  }

  public setEscortActive(active: boolean) {
    this.escortActive = active;
    if (this.wingmanLeft) this.wingmanLeft.group.visible = active;
    if (this.wingmanRight) this.wingmanRight.group.visible = active;
  }

  public setTarget(normX: number, normY: number, boundsX: number = 14.5, boundsY: number = 9.0) {
    this.targetX = normX * boundsX;
    this.targetY = normY * boundsY;
  }

  /**
   * Primary flight kinematics tick
   */
  public update(delta: number, speedMultiplier: number = 1.0) {
    this.burnPhase += delta * 30;
    this.rotorAngle += delta * 60; // 3600 RPM high-speed rotor blur

    // 1. Aerodynamic positional damping (smooth inertia, zero teleportation)
    const lerpSpeed = 7.0;
    const dx = this.targetX - this.position.x;
    const dy = this.targetY - this.position.y;

    const prevY = this.position.y;
    this.position.x += dx * Math.min(1.0, lerpSpeed * delta);
    this.position.y += dy * Math.min(1.0, lerpSpeed * delta);

    // Compute velocity
    const vx = dx * lerpSpeed;
    const vy = (this.position.y - prevY) / Math.max(0.001, delta);
    this.velocity.set(vx, vy, 0);

    // Compute Telemetry (matching the screenshot's AIRSPEED 5 KM/H and ALTITUDE 2.4 M)
    const horizSpeed = Math.abs(vx);
    this.airspeedKmh = Math.round(5.0 + horizSpeed * 2.8);
    this.altitudeM = parseFloat((2.4 + (this.position.y + 4.0) * 0.35).toFixed(1));
    this.vsiMs = parseFloat((vy * 0.15).toFixed(1));
    this.thrustPercent = Math.min(99, Math.max(35, Math.round(45 + Math.abs(dy) * 6)));

    // 2. Drone Tilting Roll: drone banks into lateral drift
    const targetRoll = -Math.max(-0.6, Math.min(0.6, (dx / 10) * 0.9));
    this.roll += (targetRoll - this.roll) * (10.0 * delta);

    // 3. Drone Pitch: pitches forward when accelerating, pitches back when braking
    const targetPitch = Math.max(-0.4, Math.min(0.4, (dy / 7) * 0.6));
    this.pitch += (targetPitch - this.pitch) * (9.0 * delta);

    // 4. Subtle Rudder Yaw
    const targetYaw = -this.roll * 0.2;
    this.yaw += (targetYaw - this.yaw) * (6.0 * delta);

    // 5. Hovering micro-bobbing simulation
    const hoverBob = Math.sin(this.burnPhase * 0.4) * 0.08;
    const hoverWobble = Math.cos(this.burnPhase * 0.3) * 0.015;

    // Apply translation & rotation to 3D group
    this.group.position.set(this.position.x, this.position.y + hoverBob, this.position.z);
    this.group.rotation.set(
      this.pitch,
      this.yaw,
      this.roll + hoverWobble,
      'ZYX'
    );

    // 6. Spin Drone Rotors at 60 FPS
    if (this.fighterData.rotorBlades) {
      this.fighterData.rotorBlades.forEach((b, i) => {
        b.rotation.y = (i % 2 === 0 ? 1 : -1) * this.rotorAngle;
      });
    }
    if (this.fighterData.rotors) {
      this.fighterData.rotors.forEach((r, i) => {
        r.rotation.z = (i % 2 === 0 ? 1 : -1) * this.rotorAngle * 0.5;
      });
    }

    // 7. Update Wingman Companion Drones if active
    if (this.escortActive && this.wingmanLeft && this.wingmanRight) {
      const leftTargetX = this.position.x - 3.8;
      const rightTargetX = this.position.x + 3.8;
      const wingmanY = this.position.y + hoverBob * 0.8;
      const wingmanZ = this.position.z + 0.8;

      this.wingmanLeft.group.position.lerp(new THREE.Vector3(leftTargetX, wingmanY, wingmanZ), 0.12);
      this.wingmanRight.group.position.lerp(new THREE.Vector3(rightTargetX, wingmanY, wingmanZ), 0.12);

      this.wingmanLeft.rotors.forEach((r) => (r.rotation.z += delta * 30));
      this.wingmanRight.rotors.forEach((r) => (r.rotation.z += delta * 30));
    }

    // 8. Energy Shield opacity animation
    const targetShieldOpacity = this.shieldActive ? 0.85 : 0.0;
    this.shieldOpacity += (targetShieldOpacity - this.shieldOpacity) * (12.0 * delta);
    (this.fighterData.shieldMesh.material as THREE.MeshPhysicalMaterial).opacity = this.shieldOpacity;
    this.fighterData.shieldMesh.visible = this.shieldOpacity > 0.02;
    if (this.shieldActive) {
      this.fighterData.shieldMesh.rotation.y += delta * 2.5;
    }

    // 9. Update wingtip vapor contrails
    const leftTipWorld = this.group.localToWorld(this.fighterData.leftTrailPos.clone());
    const rightTipWorld = this.group.localToWorld(this.fighterData.rightTrailPos.clone());

    this.leftContrailPoints.unshift(leftTipWorld);
    this.rightContrailPoints.unshift(rightTipWorld);

    if (this.leftContrailPoints.length > this.maxContrailHistory) this.leftContrailPoints.pop();
    if (this.rightContrailPoints.length > this.maxContrailHistory) this.rightContrailPoints.pop();

    // Stream contrails backwards
    for (let i = 1; i < this.leftContrailPoints.length; i++) {
      this.leftContrailPoints[i].z += 100 * speedMultiplier * delta;
      this.rightContrailPoints[i].z += 100 * speedMultiplier * delta;
    }

    this.contrailLineLeft.geometry.setFromPoints(this.leftContrailPoints);
    this.contrailLineRight.geometry.setFromPoints(this.rightContrailPoints);
  }

  /**
   * Returns world space coordinates for twin forward pulse cannons
   */
  public getCannonMuzzleWorldPositions(): { left: THREE.Vector3; right: THREE.Vector3 } {
    const left = this.group.localToWorld(this.fighterData.leftCannonPos.clone());
    const right = this.group.localToWorld(this.fighterData.rightCannonPos.clone());
    return { left, right };
  }

  public dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    scene.remove(this.contrailLineLeft);
    scene.remove(this.contrailLineRight);
    if (this.wingmanLeft) scene.remove(this.wingmanLeft.group);
    if (this.wingmanRight) scene.remove(this.wingmanRight.group);
  }
}
