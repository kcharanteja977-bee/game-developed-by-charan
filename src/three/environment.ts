/**
 * environment.ts - Dynamic Sky & High-Speed Atmospheric Flight Environment
 * Builds sky gradients, volumetric cloud clusters, scrolling lower cloud deck,
 * and high-velocity speed streaks / vapor lines for supersonic forward sensation.
 */

import * as THREE from 'three';

export interface SkyEnvironment {
  group: THREE.Group;
  update: (speedMultiplier: number, delta: number) => void;
  setSunIntensity: (intensity: number) => void;
}

export function createSkyEnvironment(scene: THREE.Scene): SkyEnvironment {
  const envGroup = new THREE.Group();
  scene.add(envGroup);

  // 1. Directional Sun Light with Specular Glint
  const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
  sunLight.position.set(40, 80, -60);
  scene.add(sunLight);

  // Sky ambient light & hemisphere fill
  const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 1.2);
  scene.add(hemiLight);

  // Atmospheric Fog (Deep twilight/stratosphere blue blending into horizon)
  scene.fog = new THREE.FogExp2(0x0a192f, 0.0018);

  // 2. High-Speed Atmospheric Speed Particles & Vapor Lines
  // Hundreds of 3D lines streaming from deep Z (-800) towards camera (+100)
  const streakCount = 450;
  const streakPositions = new Float32Array(streakCount * 6); // 2 vertices per line
  const streakSpeeds = new Float32Array(streakCount);

  for (let i = 0; i < streakCount; i++) {
    const x = (Math.random() - 0.5) * 140;
    const y = (Math.random() - 0.5) * 80 + 10;
    const z = Math.random() * -900 + 50;
    const len = Math.random() * 12 + 8;

    const idx = i * 6;
    streakPositions[idx] = x;
    streakPositions[idx + 1] = y;
    streakPositions[idx + 2] = z;

    streakPositions[idx + 3] = x;
    streakPositions[idx + 4] = y;
    streakPositions[idx + 5] = z + len;

    streakSpeeds[i] = Math.random() * 120 + 260; // Base forward flight speed
  }

  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));

  const streakMat = new THREE.LineBasicMaterial({
    color: 0x93c5fd, // Electric cyan/white air streaks
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
  });

  const speedStreakLines = new THREE.LineSegments(streakGeo, streakMat);
  envGroup.add(speedStreakLines);

  // 3. Volumetric Procedural Cloud Clusters (Flying through fluffy clouds!)
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0x64748b, // Atmospheric cloud slate/white
    roughness: 0.9,
    metalness: 0.1,
    transparent: true,
    opacity: 0.5,
    flatShading: true,
  });

  const cloudClusters: THREE.Group[] = [];
  const clusterCount = 28;

  for (let i = 0; i < clusterCount; i++) {
    const cluster = new THREE.Group();
    // Puff geometries assembled into a fluffy cumulus cloud
    const puffCount = 5 + Math.floor(Math.random() * 4);
    for (let p = 0; p < puffCount; p++) {
      const puffGeo = new THREE.DodecahedronGeometry(
        Math.random() * 7 + 6,
        1
      );
      const puff = new THREE.Mesh(puffGeo, cloudMat);
      puff.position.set(
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 18
      );
      puff.scale.set(
        Math.random() * 0.5 + 0.8,
        Math.random() * 0.4 + 0.5,
        Math.random() * 0.5 + 0.8
      );
      cluster.add(puff);
    }

    cluster.position.set(
      (Math.random() - 0.5) * 260,
      Math.random() * 60 - 25,
      Math.random() * -1100
    );
    envGroup.add(cluster);
    cloudClusters.push(cluster);
  }

  // 4. Distant Scrolling Lower Cloud Deck / Sea of Clouds below
  const deckShape = new THREE.PlaneGeometry(800, 1400, 24, 36);
  // Add gentle undulating terrain waves
  const posAttr = deckShape.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = Math.sin(x * 0.02) * Math.cos(y * 0.02) * 16;
    posAttr.setZ(i, z);
  }
  deckShape.computeVertexNormals();

  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
    metalness: 0.2,
    flatShading: true,
  });

  const cloudDeck = new THREE.Mesh(deckShape, deckMat);
  cloudDeck.rotation.x = -Math.PI / 2;
  cloudDeck.position.set(0, -65, -450);
  envGroup.add(cloudDeck);

  return {
    group: envGroup,
    setSunIntensity: (intensity: number) => {
      sunLight.intensity = intensity;
    },
    update: (speedMultiplier: number, delta: number) => {
      // 1. Move Speed Streaks toward camera (+Z)
      const positions = streakGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < streakCount; i++) {
        const idx = i * 6;
        const moveDist = streakSpeeds[i] * speedMultiplier * delta;
        positions[idx + 2] += moveDist;
        positions[idx + 5] += moveDist;

        // Wrap around when past camera
        if (positions[idx + 2] > 60) {
          const newZ = -850 - Math.random() * 200;
          const len = Math.random() * 15 + 10;
          positions[idx] = (Math.random() - 0.5) * 150;
          positions[idx + 1] = (Math.random() - 0.5) * 90 + 10;
          positions[idx + 2] = newZ;

          positions[idx + 3] = positions[idx];
          positions[idx + 4] = positions[idx + 1];
          positions[idx + 5] = newZ + len;
        }
      }
      streakGeo.attributes.position.needsUpdate = true;

      // 2. Move Volumetric Clouds toward camera
      const cloudSpeed = 160 * speedMultiplier * delta;
      for (let i = 0; i < cloudClusters.length; i++) {
        const c = cloudClusters[i];
        c.position.z += cloudSpeed;
        if (c.position.z > 80) {
          c.position.z = -1100 - Math.random() * 200;
          c.position.x = (Math.random() - 0.5) * 280;
          c.position.y = Math.random() * 70 - 30;
        }
      }

      // 3. Scroll Lower Cloud Deck
      cloudDeck.position.z += 90 * speedMultiplier * delta;
      if (cloudDeck.position.z > 0) {
        cloudDeck.position.z = -450;
      }
    },
  };
}
