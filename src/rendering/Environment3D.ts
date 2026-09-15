/**
 * Environment3D.ts - Architectural Drone Flight Testing Arena
 * Replicates the modernist brutalist sci-fi testing corridor:
 * - Warm ivory/cream architectural walls with vertical seams and monolithic pillars
 * - Pale composite testing floor with circular green helipad zone and bold black "H"
 * - Directional runway markings, alignment hash marks, and daylight sun highlights
 * - High-speed speedlines and atmospheric depth
 */

import * as THREE from 'three';

export class Environment3D {
  private scene: THREE.Scene;
  public group: THREE.Group;

  // Floor and architectural corridor
  private floorSegment1: THREE.Group;
  private floorSegment2: THREE.Group;
  private segmentLength: number = 800;

  // Monolithic pillars flanking corridor
  private pillarsGroup: THREE.Group;
  private pillars: THREE.Mesh[] = [];

  // Supersonic vapor lines
  private streakPoints: THREE.LineSegments;
  private streakPositions: Float32Array;
  private streakSpeeds: Float32Array;
  private streakCount: number = 240;

  // Lighting
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // 1. Warm Off-White / Cream Architectural Atmosphere & Fog
    const horizonColor = 0xf5efe6; // Warm architectural ivory
    this.scene.background = new THREE.Color(horizonColor);
    this.scene.fog = new THREE.FogExp2(horizonColor, 0.0018);

    // 2. Daylight Lighting Setup
    this.sunLight = new THREE.DirectionalLight(0xfff8ee, 2.6);
    this.sunLight.position.set(60, 120, -60);
    this.group.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xd4cbbd, 1.6);
    this.group.add(this.hemiLight);

    // 3. Build Scrolling Floor Segments with Helipad "H" and Green Border
    this.floorSegment1 = this.createCorridorSegment(0);
    this.floorSegment2 = this.createCorridorSegment(-this.segmentLength);
    this.group.add(this.floorSegment1);
    this.group.add(this.floorSegment2);

    // 4. Monolithic Structural Pillars flanking the arena
    this.pillarsGroup = new THREE.Group();
    this.createPillars();
    this.group.add(this.pillarsGroup);

    // 5. High-speed streak lines
    this.streakPositions = new Float32Array(this.streakCount * 6);
    this.streakSpeeds = new Float32Array(this.streakCount);

    for (let i = 0; i < this.streakCount; i++) {
      const x = (Math.random() - 0.5) * 120;
      const y = (Math.random() - 0.5) * 60 + 5;
      const z = Math.random() * -800 + 40;
      const len = Math.random() * 14 + 8;

      const idx = i * 6;
      this.streakPositions[idx] = x;
      this.streakPositions[idx + 1] = y;
      this.streakPositions[idx + 2] = z;

      this.streakPositions[idx + 3] = x;
      this.streakPositions[idx + 4] = y;
      this.streakPositions[idx + 5] = z + len;

      this.streakSpeeds[i] = Math.random() * 120 + 260;
    }

    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute('position', new THREE.BufferAttribute(this.streakPositions, 3));

    const streakMat = new THREE.LineBasicMaterial({
      color: 0xc4b5a0,
      transparent: true,
      opacity: 0.45,
    });

    this.streakPoints = new THREE.LineSegments(streakGeo, streakMat);
    this.group.add(this.streakPoints);
  }

  /**
   * Builds an 800m corridor segment with walls and helipad markings
   */
  private createCorridorSegment(startZ: number): THREE.Group {
    const segment = new THREE.Group();
    segment.position.set(0, -10, startZ);

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xede6db, // Pale composite ground
      roughness: 0.65,
      metalness: 0.15,
      flatShading: true,
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf5efe6, // Warm cream architectural wall
      roughness: 0.7,
      metalness: 0.1,
      flatShading: true,
    });

    // Floor Mesh
    const floorGeo = new THREE.PlaneGeometry(160, this.segmentLength);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, 0, -this.segmentLength / 2);
    segment.add(floor);

    // Left Wall
    const leftWallGeo = new THREE.BoxGeometry(6, 90, this.segmentLength);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-36, 40, -this.segmentLength / 2);
    segment.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(leftWallGeo, wallMat);
    rightWall.position.set(36, 40, -this.segmentLength / 2);
    segment.add(rightWall);

    // Wall Horizontal Accent Grooves
    const grooveMat = new THREE.MeshBasicMaterial({ color: 0xd6cdbe });
    const grooveGeo = new THREE.BoxGeometry(0.2, 0.6, this.segmentLength);

    const gL1 = new THREE.Mesh(grooveGeo, grooveMat);
    gL1.position.set(-32.9, 15, -this.segmentLength / 2);
    segment.add(gL1);

    const gL2 = new THREE.Mesh(grooveGeo, grooveMat);
    gL2.position.set(-32.9, 35, -this.segmentLength / 2);
    segment.add(gL2);

    const gR1 = new THREE.Mesh(grooveGeo, grooveMat);
    gR1.position.set(32.9, 15, -this.segmentLength / 2);
    segment.add(gR1);

    const gR2 = new THREE.Mesh(grooveGeo, grooveMat);
    gR2.position.set(32.9, 35, -this.segmentLength / 2);
    segment.add(gR2);

    // Helipad Landing Zones on the floor (Every 400m)
    [-180, -580].forEach((padZ) => {
      // 1. Dark Green Circular Border Arc
      const ringGeo = new THREE.RingGeometry(18, 20.5, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x166534, // Dark forest green ring
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, 0.05, padZ);
      segment.add(ring);

      // Inner dashed alignment ring
      const innerRingGeo = new THREE.RingGeometry(14, 14.8, 36);
      innerRingGeo.rotateX(-Math.PI / 2);
      const innerRingMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.6 });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRing.position.set(0, 0.06, padZ);
      segment.add(innerRing);

      // 2. Bold Black Helipad "H" Marking
      const hMat = new THREE.MeshBasicMaterial({ color: 0x18181b }); // Solid black

      // Left bar of H
      const hBarGeo = new THREE.PlaneGeometry(2.4, 14);
      hBarGeo.rotateX(-Math.PI / 2);
      const hLeft = new THREE.Mesh(hBarGeo, hMat);
      hLeft.position.set(-4.5, 0.08, padZ);
      segment.add(hLeft);

      // Right bar of H
      const hRight = new THREE.Mesh(hBarGeo, hMat);
      hRight.position.set(4.5, 0.08, padZ);
      segment.add(hRight);

      // Center crossbar of H
      const hCrossGeo = new THREE.PlaneGeometry(9, 2.4);
      hCrossGeo.rotateX(-Math.PI / 2);
      const hCross = new THREE.Mesh(hCrossGeo, hMat);
      hCross.position.set(0, 0.09, padZ);
      segment.add(hCross);

      // 3. Red/Orange Alignment Marks
      const markMat = new THREE.MeshBasicMaterial({ color: 0xea580c });
      [-26, 26].forEach((xOffset) => {
        const markGeo = new THREE.PlaneGeometry(1.2, 8);
        markGeo.rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(markGeo, markMat);
        m.position.set(xOffset, 0.07, padZ);
        segment.add(m);
      });
    });

    // Centerline runway dashes
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    for (let z = -20; z > -this.segmentLength; z -= 30) {
      const dashGeo = new THREE.PlaneGeometry(0.8, 12);
      dashGeo.rotateX(-Math.PI / 2);
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.position.set(0, 0.04, z);
      segment.add(dash);
    }

    return segment;
  }

  /**
   * Spawns tall monolithic architectural pillars along corridor sides
   */
  private createPillars() {
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xe5dfd3,
      roughness: 0.6,
      metalness: 0.2,
      flatShading: true,
    });

    const pillarGeo = new THREE.BoxGeometry(4.5, 75, 4.5);

    for (let i = 0; i < 18; i++) {
      const z = -i * 55;

      // Left Pillar
      const pL = new THREE.Mesh(pillarGeo, pillarMat);
      pL.position.set(-33, 27.5, z);
      this.pillarsGroup.add(pL);
      this.pillars.push(pL);

      // Right Pillar
      const pR = new THREE.Mesh(pillarGeo, pillarMat);
      pR.position.set(33, 27.5, z);
      this.pillarsGroup.add(pR);
      this.pillars.push(pR);
    }
  }

  /**
   * Updates scrolling corridor and pillars
   */
  public update(speedMultiplier: number, delta: number) {
    const forwardSpeed = 120 * speedMultiplier;
    const scroll = forwardSpeed * delta;

    // 1. Scroll floor corridor segments
    this.floorSegment1.position.z += scroll;
    this.floorSegment2.position.z += scroll;

    if (this.floorSegment1.position.z > this.segmentLength) {
      this.floorSegment1.position.z = this.floorSegment2.position.z - this.segmentLength;
    }
    if (this.floorSegment2.position.z > this.segmentLength) {
      this.floorSegment2.position.z = this.floorSegment1.position.z - this.segmentLength;
    }

    // 2. Scroll Pillars
    for (const p of this.pillars) {
      p.position.z += scroll;
      if (p.position.z > 60) {
        p.position.z -= 18 * 55;
      }
    }

    // 3. Supersonic vapor streak lines
    const posAttr = this.streakPoints.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < this.streakCount; i++) {
      const idx = i * 6;
      const speed = this.streakSpeeds[i] * speedMultiplier * delta;

      arr[idx + 2] += speed;
      arr[idx + 5] += speed;

      if (arr[idx + 2] > 60) {
        const resetZ = Math.random() * -800 - 60;
        const len = Math.random() * 14 + 8;
        const x = (Math.random() - 0.5) * 120;
        const y = (Math.random() - 0.5) * 60 + 5;

        arr[idx] = x;
        arr[idx + 1] = y;
        arr[idx + 2] = resetZ;

        arr[idx + 3] = x;
        arr[idx + 4] = y;
        arr[idx + 5] = resetZ + len;
      }
    }
    posAttr.needsUpdate = true;
  }

  public dispose() {
    this.scene.remove(this.group);
  }
}
