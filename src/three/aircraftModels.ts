/**
 * aircraftModels.ts - Procedural 3D Fighter Aircraft & Projectile Models
 * Creates detailed, high-performance 3D models using Three.js geometries and materials.
 */

import * as THREE from 'three';

/**
 * Creates the Player's Supersonic Fighter Jet (F-22 / Eurofighter inspired)
 * Includes fuselage, faceted cockpit canopy, swept delta wings, canards,
 * canted twin vertical stabilizers, afterburners with animated exhaust flames,
 * and wingtip weapon hardpoints.
 */
export function createPlayerFighter(): {
  root: THREE.Group;
  leftFlame: THREE.Mesh;
  rightFlame: THREE.Mesh;
  leftTrailPos: THREE.Vector3;
  rightTrailPos: THREE.Vector3;
  leftCannonPos: THREE.Vector3;
  rightCannonPos: THREE.Vector3;
  shieldMesh: THREE.Mesh;
  powerUpGlowLeft: THREE.Mesh;
  powerUpGlowRight: THREE.Mesh;
  rotors: THREE.Mesh[];
  rotorBlades: THREE.Group[];
} {
  const root = new THREE.Group();

  // Materials
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x18181b, // Dark carbon graphite
    roughness: 0.35,
    metalness: 0.8,
    flatShading: true,
  });

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.4,
    metalness: 0.7,
    flatShading: true,
  });

  const accentCyanMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4, // Cyan optical sensor
    roughness: 0.15,
    metalness: 0.9,
    emissive: 0x0891b2,
    emissiveIntensity: 0.8,
  });

  const motorMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.5,
    metalness: 0.9,
  });

  const rotorBlurMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    roughness: 0.4,
    metalness: 0.8,
  });

  // 1. Central Drone Fuselage - Aerodynamic Hexagonal Monocoque
  const bodyGeo = new THREE.CylinderGeometry(0.75, 0.95, 0.5, 6);
  const fuselage = new THREE.Mesh(bodyGeo, carbonMat);
  fuselage.rotation.y = Math.PI / 6;
  root.add(fuselage);

  // Top Aerodynamic Sensor Canopy
  const domeGeo = new THREE.ConeGeometry(0.55, 0.4, 6);
  const dome = new THREE.Mesh(domeGeo, armorMat);
  dome.position.set(0, 0.35, 0);
  root.add(dome);

  // Forward Optical Sensor Pod (Cyan glowing lens)
  const sensorGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.4, 8);
  sensorGeo.rotateX(Math.PI / 2);
  const sensor = new THREE.Mesh(sensorGeo, accentCyanMat);
  sensor.position.set(0, 0.05, -0.85);
  root.add(sensor);

  // Optical HUD Glow Ring around camera
  const sensorRingGeo = new THREE.TorusGeometry(0.26, 0.03, 8, 16);
  const sensorRing = new THREE.Mesh(sensorRingGeo, accentCyanMat);
  sensorRing.position.set(0, 0.05, -1.02);
  root.add(sensorRing);

  // 2. Four Diagonal Carbon Rotor Arms (Front-L, Front-R, Rear-L, Rear-R)
  const armAngles = [
    Math.PI / 4,       // Front-Right (45 deg)
    (3 * Math.PI) / 4, // Rear-Right (135 deg)
    (5 * Math.PI) / 4, // Rear-Left (225 deg)
    (7 * Math.PI) / 4, // Front-Left (315 deg)
  ];

  const armLength = 2.4;
  const rotors: THREE.Mesh[] = [];
  const rotorBlades: THREE.Group[] = [];

  armAngles.forEach((angle, idx) => {
    const armGeo = new THREE.BoxGeometry(0.14, 0.08, armLength);
    const arm = new THREE.Mesh(armGeo, armorMat);
    arm.rotation.y = -angle + Math.PI / 2;
    arm.position.set((Math.cos(angle) * armLength) / 2, 0.05, (Math.sin(angle) * armLength) / 2);
    root.add(arm);

    // Motor Hub at tip
    const tipX = Math.cos(angle) * armLength;
    const tipZ = Math.sin(angle) * armLength;

    const motorGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.35, 12);
    const motor = new THREE.Mesh(motorGeo, motorMat);
    motor.position.set(tipX, 0.18, tipZ);
    root.add(motor);

    // Motor Accent LED
    const ledGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const led = new THREE.Mesh(ledGeo, accentCyanMat);
    led.position.set(tipX, 0.34, tipZ);
    root.add(led);

    // Spinning Rotor Blur Disc (creates the high-speed spinning disc in photo)
    const discGeo = new THREE.RingGeometry(0.2, 1.25, 24);
    discGeo.rotateX(Math.PI / 2);
    const disc = new THREE.Mesh(discGeo, rotorBlurMat);
    disc.position.set(tipX, 0.38, tipZ);
    root.add(disc);
    rotors.push(disc);

    // Rotor Physical Blades (spinning)
    const bladeGroup = new THREE.Group();
    bladeGroup.position.set(tipX, 0.38, tipZ);

    const b1Geo = new THREE.BoxGeometry(2.3, 0.02, 0.16);
    const b1 = new THREE.Mesh(b1Geo, bladeMat);
    bladeGroup.add(b1);

    const b2Geo = new THREE.BoxGeometry(0.16, 0.02, 2.3);
    const b2 = new THREE.Mesh(b2Geo, bladeMat);
    bladeGroup.add(b2);

    root.add(bladeGroup);
    rotorBlades.push(bladeGroup);
  });

  // 3. Twin Forward High-Velocity Pulse Cannons
  const cannonGeo = new THREE.CylinderGeometry(0.08, 0.09, 1.6, 8);
  cannonGeo.rotateX(Math.PI / 2);

  const leftCannon = new THREE.Mesh(cannonGeo, motorMat);
  leftCannon.position.set(-0.8, -0.15, -0.6);
  root.add(leftCannon);

  const rightCannon = new THREE.Mesh(cannonGeo, motorMat);
  rightCannon.position.set(0.8, -0.15, -0.6);
  root.add(rightCannon);

  // Cannon Muzzle Tips with Cyan Glow
  const muzzleGlowGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.2, 8);
  muzzleGlowGeo.rotateX(Math.PI / 2);
  const leftMuzzle = new THREE.Mesh(muzzleGlowGeo, accentCyanMat);
  leftMuzzle.position.set(-0.8, -0.15, -1.45);
  root.add(leftMuzzle);

  const rightMuzzle = new THREE.Mesh(muzzleGlowGeo, accentCyanMat);
  rightMuzzle.position.set(0.8, -0.15, -1.45);
  root.add(rightMuzzle);

  // 4. Landing Skids Underneath
  const skidMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.5, metalness: 0.8 });
  const skidBarGeo = new THREE.BoxGeometry(0.08, 0.06, 2.6);

  const leftSkid = new THREE.Mesh(skidBarGeo, skidMat);
  leftSkid.position.set(-0.85, -0.6, 0);
  root.add(leftSkid);

  const rightSkid = new THREE.Mesh(skidBarGeo, skidMat);
  rightSkid.position.set(0.85, -0.6, 0);
  root.add(rightSkid);

  // Skid Struts
  const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6);
  const strutPositions = [
    [-0.85, -0.3, 0.7],
    [-0.85, -0.3, -0.7],
    [0.85, -0.3, 0.7],
    [0.85, -0.3, -0.7],
  ];
  strutPositions.forEach(([x, y, z]) => {
    const s = new THREE.Mesh(strutGeo, skidMat);
    s.position.set(x, y, z);
    root.add(s);
  });

  // 5. Thruster Flame / Exhaust glow for high-speed flight
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.8,
  });
  const flameGeo = new THREE.ConeGeometry(0.18, 1.2, 8);
  flameGeo.rotateX(-Math.PI / 2);

  const leftFlame = new THREE.Mesh(flameGeo, flameMat);
  leftFlame.position.set(-0.4, 0.0, 1.1);
  root.add(leftFlame);

  const rightFlame = new THREE.Mesh(flameGeo, flameMat);
  rightFlame.position.set(0.4, 0.0, 1.1);
  root.add(rightFlame);

  // Wingtip Power-Up Glow Indicators
  const glowGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.0,
  });

  const powerUpGlowLeft = new THREE.Mesh(glowGeo, glowMat);
  powerUpGlowLeft.position.set(-1.8, 0.2, -1.8);
  root.add(powerUpGlowLeft);

  const powerUpGlowRight = new THREE.Mesh(glowGeo, glowMat.clone());
  powerUpGlowRight.position.set(1.8, 0.2, -1.8);
  root.add(powerUpGlowRight);

  // 6. Defensive Energy Shield Dome (Translucent glowing sphere)
  const shieldGeo = new THREE.SphereGeometry(3.6, 24, 18);
  const shieldMat = new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    transmission: 0.75,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.position.set(0, 0.1, 0);
  root.add(shieldMesh);

  return {
    root,
    leftFlame,
    rightFlame,
    leftTrailPos: new THREE.Vector3(-0.4, 0.0, 1.2),
    rightTrailPos: new THREE.Vector3(0.4, 0.0, 1.2),
    leftCannonPos: new THREE.Vector3(-0.8, -0.15, -1.6),
    rightCannonPos: new THREE.Vector3(0.8, -0.15, -1.6),
    shieldMesh,
    powerUpGlowLeft,
    powerUpGlowRight,
    rotors,
    rotorBlades,
  };
}

/**
 * Creates an Enemy Interceptor / Scout Jet
 * Menacing dark-red stealth fighter with forward-swept wings.
 */
export function createEnemyInterceptor(): THREE.Group {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b, // Crimson red
    roughness: 0.35,
    metalness: 0.7,
    flatShading: true,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.4,
    metalness: 0.8,
    flatShading: true,
  });

  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xef4444, // Glowing red canopy & engine
  });

  // Fuselage
  const bodyGeo = new THREE.ConeGeometry(0.65, 4.4, 6);
  bodyGeo.rotateX(-Math.PI / 2); // Faces toward player (+Z)
  const body = new THREE.Mesh(bodyGeo, hullMat);
  body.scale.set(1.0, 0.5, 1.0);
  group.add(body);

  // Red glowing cockpit slit
  const eyeGeo = new THREE.BoxGeometry(0.3, 0.12, 0.8);
  const eye = new THREE.Mesh(eyeGeo, glowMat);
  eye.position.set(0, 0.2, 0.5);
  group.add(eye);

  // Forward-swept wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.5);
  wingShape.lineTo(2.6, 1.6);   // Swept forward
  wingShape.lineTo(2.4, 0.8);
  wingShape.lineTo(0, -1.0);
  wingShape.lineTo(-2.4, 0.8);
  wingShape.lineTo(-2.6, 1.6);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.08, bevelEnabled: false });
  wingGeo.rotateX(Math.PI / 2);
  const wings = new THREE.Mesh(wingGeo, darkMat);
  wings.position.set(0, 0, 0);
  group.add(wings);

  // Vertical twin tail fins
  const finGeo = new THREE.BoxGeometry(0.06, 0.7, 0.9);
  const leftFin = new THREE.Mesh(finGeo, hullMat);
  leftFin.position.set(-0.55, 0.35, -1.2);
  leftFin.rotation.z = -0.3;
  group.add(leftFin);

  const rightFin = new THREE.Mesh(finGeo, hullMat);
  rightFin.position.set(0.55, 0.35, -1.2);
  rightFin.rotation.z = 0.3;
  group.add(rightFin);

  // Engine exhaust glow
  const thrusterGeo = new THREE.ConeGeometry(0.2, 0.9, 8);
  thrusterGeo.rotateX(Math.PI / 2);
  const thruster = new THREE.Mesh(thrusterGeo, glowMat);
  thruster.position.set(0, 0, -2.5);
  group.add(thruster);

  group.scale.set(1.1, 1.1, 1.1);
  return group;
}

/**
 * Creates an Enemy Heavy Strike Cruiser / Bomber
 * Imposing broad flying-wing stealth shape with twin engines and heavy plating.
 */
export function createEnemyHeavyCruiser(): THREE.Group {
  const group = new THREE.Group();

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x3f3f46, // Gunmetal zinc
    roughness: 0.3,
    metalness: 0.8,
    flatShading: true,
  });

  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xf97316, // Glowing orange engine/visors
  });

  // Flying wing delta body
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(0, 2.5);     // Nose toward player
  bodyShape.lineTo(4.6, -1.8);  // Right wingtip
  bodyShape.lineTo(2.8, -2.4);  // Right engine notch
  bodyShape.lineTo(0, -1.5);    // Center notch
  bodyShape.lineTo(-2.8, -2.4); // Left engine notch
  bodyShape.lineTo(-4.6, -1.8); // Left wingtip
  bodyShape.closePath();

  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, { depth: 0.45, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.1 });
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, armorMat);
  body.position.set(0, 0, 0);
  group.add(body);

  // Twin Heavy Engine Thrusters
  const tGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.2, 10);
  tGeo.rotateX(Math.PI / 2);
  const leftT = new THREE.Mesh(tGeo, glowMat);
  leftT.position.set(-1.8, 0, -2.2);
  group.add(leftT);

  const rightT = new THREE.Mesh(tGeo, glowMat);
  rightT.position.set(1.8, 0, -2.2);
  group.add(rightT);

  // Command Bridge Visor
  const bridgeGeo = new THREE.BoxGeometry(1.2, 0.25, 0.8);
  const bridge = new THREE.Mesh(bridgeGeo, glowMat);
  bridge.position.set(0, 0.32, 0.6);
  group.add(bridge);

  group.scale.set(1.4, 1.4, 1.4);
  return group;
}

/**
 * Creates a Heavy Guided Missile model (2-Finger Special Attack)
 */
export function createMissileModel(): THREE.Group {
  const missile = new THREE.Group();

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.8,
    roughness: 0.2,
  });

  const tipMat = new THREE.MeshStandardMaterial({
    color: 0xf97316, // Orange warhead
    metalness: 0.5,
    roughness: 0.3,
  });

  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
  });

  // Cylinder body
  const bodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.6, 8);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, metalMat);
  missile.add(body);

  // Nose cone
  const noseGeo = new THREE.ConeGeometry(0.12, 0.5, 8);
  noseGeo.rotateX(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, tipMat);
  nose.position.set(0, 0, -1.05);
  missile.add(nose);

  // Tail fins
  const finGeo = new THREE.BoxGeometry(0.55, 0.02, 0.3);
  const fins1 = new THREE.Mesh(finGeo, metalMat);
  fins1.position.set(0, 0, 0.6);
  missile.add(fins1);

  const fins2 = new THREE.Mesh(finGeo, metalMat);
  fins2.rotation.z = Math.PI / 2;
  fins2.position.set(0, 0, 0.6);
  missile.add(fins2);

  // Rocket exhaust flame
  const flameGeo = new THREE.ConeGeometry(0.1, 0.7, 6);
  flameGeo.rotateX(Math.PI / 2);
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.set(0, 0, 1.15);
  missile.add(flame);

  return missile;
}

/**
 * Creates a 3D Power-Up Beacon Capsule (Rapid Fire, Triple Shot, Shield+)
 */
export function createPowerUpModel(type: 'RAPID_FIRE' | 'TRIPLE_SHOT' | 'SHIELD_BOOST'): THREE.Group {
  const group = new THREE.Group();

  let color = 0xf59e0b; // Amber
  if (type === 'TRIPLE_SHOT') color = 0x06b6d4; // Cyan
  if (type === 'SHIELD_BOOST') color = 0x10b981; // Emerald

  // Rotating outer octahedron cage
  const cageGeo = new THREE.OctahedronGeometry(0.9, 0);
  const cageMat = new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
  });
  const cage = new THREE.Mesh(cageGeo, cageMat);
  group.add(cage);

  // Glowing inner energy crystal
  const coreGeo = new THREE.IcosahedronGeometry(0.5, 1);
  const coreMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.9,
    roughness: 0.1,
    metalness: 0.8,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // Glowing halo ring
  const ringGeo = new THREE.TorusGeometry(1.2, 0.04, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  group.add(ring);

  return group;
}

/**
 * Creates the Dreadnought Class Enemy: "NEXUS SWARM QUEEN"
 * A hovering emerald/teal faceted alien dreadnought mothership with
 * pulsating command core, segmented shield perimeter, and rotating swarm nodes.
 */
export function createNexusQueenBoss(): {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  shieldRing: THREE.Mesh;
  swarmNodes: THREE.Mesh[];
} {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e, // Deep emerald teal
    roughness: 0.3,
    metalness: 0.8,
    flatShading: true,
  });

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x14b8a6,
    emissive: 0x0d9488,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.9,
  });

  const accentCyan = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    wireframe: true,
  });

  const glowRed = new THREE.MeshBasicMaterial({
    color: 0xef4444,
  });

  // 1. Inverted Trapezoid / Faceted Emerald Command Core
  const coreGeo = new THREE.CylinderGeometry(8.0, 3.2, 7.5, 6);
  const coreMesh = new THREE.Mesh(coreGeo, hullMat);
  group.add(coreMesh);

  // Upper Faceted Crown
  const crownGeo = new THREE.ConeGeometry(7.6, 4.0, 6);
  crownGeo.rotateX(Math.PI);
  const crown = new THREE.Mesh(crownGeo, hullMat);
  crown.position.set(0, 5.5, 0);
  group.add(crown);

  // Central Plasma Reactor Core (Glowing teal sphere)
  const reactorGeo = new THREE.SphereGeometry(3.2, 16, 16);
  const reactor = new THREE.Mesh(reactorGeo, coreMat);
  group.add(reactor);

  // Wireframe Matrix Cage
  const cageGeo = new THREE.IcosahedronGeometry(9.2, 1);
  const cage = new THREE.Mesh(cageGeo, accentCyan);
  group.add(cage);

  // Defensive Hex Shield Ring
  const shieldGeo = new THREE.TorusGeometry(12.5, 0.25, 8, 32);
  const shieldRingMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.7,
  });
  const shieldRing = new THREE.Mesh(shieldGeo, shieldRingMat);
  shieldRing.rotation.x = Math.PI / 2;
  group.add(shieldRing);

  // Heavy Plasma Beam Turrets on 3 corners
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const turrGeo = new THREE.CylinderGeometry(0.6, 0.8, 4.0, 8);
    turrGeo.rotateX(Math.PI / 2);
    const turr = new THREE.Mesh(turrGeo, hullMat);
    turr.position.set(Math.cos(angle) * 7.5, -1.5, Math.sin(angle) * 7.5);
    group.add(turr);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), glowRed);
    tip.position.set(Math.cos(angle) * 7.5, -1.5, Math.sin(angle) * 7.5 + 2.2);
    group.add(tip);
  }

  // Orbiting Swarm Drones / Crystal Shards
  const swarmNodes: THREE.Mesh[] = [];
  const shardMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x059669,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  for (let i = 0; i < 6; i++) {
    const shardGeo = new THREE.OctahedronGeometry(1.2, 0);
    const shard = new THREE.Mesh(shardGeo, shardMat);
    group.add(shard);
    swarmNodes.push(shard);
  }

  group.scale.set(1.4, 1.4, 1.4);

  return {
    group,
    coreMesh,
    shieldRing,
    swarmNodes,
  };
}

/**
 * Creates a Tactical Wingman Escort Companion Drone
 * Deployed via [W] Wingman Escort command
 */
export function createWingmanDrone(): {
  group: THREE.Group;
  rotors: THREE.Mesh[];
} {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.4,
    metalness: 0.7,
  });

  const cyanGlow = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
  });

  const rotorBlurMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.8, 0.25, 1.2);
  const body = new THREE.Mesh(bodyGeo, hullMat);
  group.add(body);

  // Visor
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.2), cyanGlow);
  visor.position.set(0, 0.05, -0.62);
  group.add(visor);

  // Twin Rotors
  const rotors: THREE.Mesh[] = [];
  const r1 = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.75, 16), rotorBlurMat);
  r1.rotation.x = Math.PI / 2;
  r1.position.set(-0.8, 0.15, 0);
  group.add(r1);
  rotors.push(r1);

  const r2 = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.75, 16), rotorBlurMat);
  r2.rotation.x = Math.PI / 2;
  r2.position.set(0.8, 0.15, 0);
  group.add(r2);
  rotors.push(r2);

  return { group, rotors };
}
