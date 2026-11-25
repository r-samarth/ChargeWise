import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  getVehicleVisualProfile,
  type VehicleBodyArchetype,
  type VehicleVisualProfile,
} from "../constants/evShowcaseCatalog";

/* ==========================================================================
   Shared Single-Context Offscreen WebGL Snapshot Cache
   Prevents exceeding Chrome's 16-context WebGL limit when showing 35+ cards.
   ========================================================================== */
const snapshotCache = new Map<string, string>();
let sharedRenderer: THREE.WebGLRenderer | null = null;
let webglSupported: boolean | null = null;

function canUseWebGL(): boolean {
  if (webglSupported !== null) return webglSupported;
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent || ""))
  ) {
    webglSupported = false;
    return false;
  }
  try {
    const testCanvas = document.createElement("canvas");
    const gl =
      testCanvas.getContext("webgl2") ||
      testCanvas.getContext("webgl") ||
      testCanvas.getContext("experimental-webgl");
    webglSupported = Boolean(gl);
  } catch {
    webglSupported = false;
  }
  return webglSupported;
}

function getSharedOffscreenRenderer(): THREE.WebGLRenderer | null {
  if (!canUseWebGL()) return null;
  if (!sharedRenderer) {
    try {
      sharedRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
      sharedRenderer.setSize(480, 320, false);
      sharedRenderer.setPixelRatio(1);
      sharedRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      sharedRenderer.toneMappingExposure = 1.15;
    } catch {
      webglSupported = false;
      sharedRenderer = null;
    }
  }
  return sharedRenderer;
}

/* ==========================================================================
   Procedural Sculptural 3D Automotive Mesh Builder (Cars, SUVs, 2W)
   ========================================================================== */
function createCarBodyShape(archetype: VehicleBodyArchetype): {
  bodyShape: THREE.Shape;
  cabinShape: THREE.Shape;
  length: number;
  width: number;
  groundClearance: number;
  wheelRadius: number;
  wheelBaseHalf: number;
} {
  // Coordinates roughly in scene units: X = -length/2 (rear) .. +length/2 (front)
  let length = 3.8;
  let width = 1.66;
  let groundClearance = 0.24;
  let wheelRadius = 0.34;
  let wheelBaseHalf = 1.22;

  const body = new THREE.Shape();
  const cabin = new THREE.Shape();

  if (archetype === "micro_hatch") {
    length = 2.8;
    width = 1.48;
    groundClearance = 0.22;
    wheelRadius = 0.28;
    wheelBaseHalf = 0.92;

    body.moveTo(-1.35, 0.28);
    body.lineTo(1.32, 0.28);
    body.quadraticCurveTo(1.42, 0.42, 1.38, 0.78);
    body.lineTo(1.16, 0.94);
    body.lineTo(0.86, 1.46);
    body.lineTo(-1.12, 1.46);
    body.quadraticCurveTo(-1.36, 1.44, -1.36, 0.85);
    body.closePath();

    cabin.moveTo(-1.06, 0.92);
    cabin.lineTo(0.85, 0.92);
    cabin.lineTo(0.68, 1.38);
    cabin.lineTo(-0.98, 1.38);
    cabin.closePath();
  } else if (archetype === "hatchback") {
    length = 3.55;
    width = 1.6;
    groundClearance = 0.23;
    wheelRadius = 0.31;
    wheelBaseHalf = 1.12;

    body.moveTo(-1.72, 0.3);
    body.lineTo(1.72, 0.3);
    body.quadraticCurveTo(1.8, 0.56, 1.64, 0.78);
    body.lineTo(0.95, 0.92);
    body.lineTo(0.45, 1.35);
    body.lineTo(-1.05, 1.36);
    body.quadraticCurveTo(-1.66, 1.05, -1.72, 0.55);
    body.closePath();

    cabin.moveTo(-1.12, 0.88);
    cabin.lineTo(0.84, 0.88);
    cabin.lineTo(0.42, 1.29);
    cabin.lineTo(-0.98, 1.3);
    cabin.closePath();
  } else if (archetype === "sedan" || archetype === "roadster") {
    const isRoadster = archetype === "roadster";
    length = isRoadster ? 4.05 : 4.25;
    width = 1.72;
    groundClearance = isRoadster ? 0.17 : 0.2;
    wheelRadius = 0.34;
    wheelBaseHalf = 1.34;

    body.moveTo(-2.05, 0.25);
    body.lineTo(2.05, 0.25);
    body.quadraticCurveTo(2.14, 0.45, 1.98, 0.68);
    body.lineTo(0.92, 0.8);
    body.lineTo(0.32, isRoadster ? 1.12 : 1.22);
    body.lineTo(-0.85, isRoadster ? 1.12 : 1.23);
    body.lineTo(-1.65, 0.84);
    body.quadraticCurveTo(-2.06, 0.82, -2.05, 0.48);
    body.closePath();

    cabin.moveTo(-1.26, 0.78);
    cabin.lineTo(0.82, 0.78);
    cabin.lineTo(0.28, isRoadster ? 1.08 : 1.17);
    cabin.lineTo(-0.78, isRoadster ? 1.08 : 1.18);
    cabin.closePath();
  } else if (archetype === "coupe_suv") {
    length = 4.05;
    width = 1.76;
    groundClearance = 0.28;
    wheelRadius = 0.37;
    wheelBaseHalf = 1.3;

    body.moveTo(-1.98, 0.34);
    body.lineTo(1.98, 0.34);
    body.quadraticCurveTo(2.08, 0.6, 1.92, 0.88);
    body.lineTo(1.0, 1.0);
    body.lineTo(0.36, 1.46);
    body.lineTo(-0.66, 1.46);
    body.lineTo(-1.82, 0.98);
    body.quadraticCurveTo(-2.02, 0.9, -1.98, 0.56);
    body.closePath();

    cabin.moveTo(-1.42, 0.96);
    cabin.lineTo(0.88, 0.96);
    cabin.lineTo(0.32, 1.4);
    cabin.lineTo(-0.62, 1.4);
    cabin.closePath();
  } else if (archetype === "mpv") {
    length = 4.15;
    width = 1.74;
    groundClearance = 0.24;
    wheelRadius = 0.34;
    wheelBaseHalf = 1.35;

    body.moveTo(-2.0, 0.3);
    body.lineTo(1.98, 0.3);
    body.quadraticCurveTo(2.06, 0.56, 1.88, 0.86);
    body.lineTo(1.22, 1.02);
    body.lineTo(0.55, 1.54);
    body.lineTo(-1.62, 1.52);
    body.quadraticCurveTo(-2.0, 1.38, -2.0, 0.72);
    body.closePath();

    cabin.moveTo(-1.68, 0.94);
    cabin.lineTo(1.06, 0.94);
    cabin.lineTo(0.5, 1.46);
    cabin.lineTo(-1.52, 1.45);
    cabin.closePath();
  } else if (archetype === "midsize_suv") {
    length = 4.12;
    width = 1.78;
    groundClearance = 0.28;
    wheelRadius = 0.37;
    wheelBaseHalf = 1.32;

    body.moveTo(-1.98, 0.34);
    body.lineTo(2.0, 0.34);
    body.quadraticCurveTo(2.08, 0.62, 1.94, 0.92);
    body.lineTo(1.02, 1.02);
    body.lineTo(0.52, 1.52);
    body.lineTo(-1.5, 1.52);
    body.quadraticCurveTo(-1.96, 1.36, -1.98, 0.72);
    body.closePath();

    cabin.moveTo(-1.56, 0.98);
    cabin.lineTo(0.88, 0.98);
    cabin.lineTo(0.46, 1.44);
    cabin.lineTo(-1.42, 1.44);
    cabin.closePath();
  } else {
    // compact_suv (Punch.ev, Nexon.ev, XUV400, Creta EV, e Vitara, etc.)
    length = 3.78;
    width = 1.72;
    groundClearance = 0.27;
    wheelRadius = 0.35;
    wheelBaseHalf = 1.22;

    body.moveTo(-1.82, 0.33);
    body.lineTo(1.82, 0.33);
    body.quadraticCurveTo(1.9, 0.58, 1.76, 0.88);
    body.lineTo(0.95, 0.98);
    body.lineTo(0.46, 1.46);
    body.lineTo(-1.32, 1.46);
    body.quadraticCurveTo(-1.78, 1.26, -1.82, 0.68);
    body.closePath();

    cabin.moveTo(-1.38, 0.94);
    cabin.lineTo(0.84, 0.94);
    cabin.lineTo(0.42, 1.39);
    cabin.lineTo(-1.24, 1.39);
    cabin.closePath();
  }

  return { bodyShape: body, cabinShape: cabin, length, width, groundClearance, wheelRadius, wheelBaseHalf };
}

function createWheelMesh(radius: number, accentHex: string): THREE.Group {
  const wheel = new THREE.Group();

  const tireGeo = new THREE.CylinderGeometry(radius, radius, 0.24, 28);
  tireGeo.rotateX(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x181c24,
    roughness: 0.78,
    metalness: 0.12,
  });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  wheel.add(tire);

  const rimGeo = new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, 0.25, 24);
  rimGeo.rotateX(Math.PI / 2);
  const rimMat = new THREE.MeshPhysicalMaterial({
    color: 0xe2e8f0,
    metalness: 0.85,
    roughness: 0.2,
    clearcoat: 0.8,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  wheel.add(rim);

  const spokeGeo = new THREE.BoxGeometry(radius * 1.18, radius * 0.14, 0.26);
  const spokeMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.7,
    roughness: 0.3,
  });
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(spokeGeo, spokeMat);
    spoke.rotation.z = (i * Math.PI) / 3;
    wheel.add(spoke);
  }

  const hubGeo = new THREE.CylinderGeometry(radius * 0.16, radius * 0.16, 0.27, 16);
  hubGeo.rotateX(Math.PI / 2);
  const hubMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentHex),
    metalness: 0.6,
    roughness: 0.25,
  });
  wheel.add(new THREE.Mesh(hubGeo, hubMat));

  return wheel;
}

function buildTwoWheelerGroup(profile: VehicleVisualProfile): THREE.Group {
  const group = new THREE.Group();
  const isMoto = profile.archetype === "motorcycle";

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(profile.primaryColor),
    metalness: 0.65,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(profile.secondaryColor),
    metalness: 0.5,
    roughness: 0.45,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.88,
    roughness: 0.18,
  });

  // Wheels
  const r = isMoto ? 0.36 : 0.28;
  const wb = isMoto ? 0.92 : 0.78;
  const fWheel = createWheelMesh(r, profile.accentColor);
  fWheel.position.set(wb, r, 0);
  const rWheel = createWheelMesh(r, profile.accentColor);
  rWheel.position.set(-wb, r, 0);
  group.add(fWheel, rWheel);

  if (isMoto) {
    // Ultraviolette F77 aggressive fairing & tank cowling
    const frameShape = new THREE.Shape();
    frameShape.moveTo(-0.98, 0.72);
    frameShape.lineTo(-0.32, 0.82);
    frameShape.lineTo(0.28, 1.06);
    frameShape.lineTo(0.92, 0.92);
    frameShape.lineTo(0.75, 0.42);
    frameShape.lineTo(-0.22, 0.36);
    frameShape.lineTo(-0.85, 0.62);
    frameShape.closePath();

    const fairingGeo = new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.36,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 4,
    });
    fairingGeo.translate(0, 0, -0.18);
    group.add(new THREE.Mesh(fairingGeo, paintMat));

    // Fork & handlebar
    const forkGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.85, 12);
    const fork = new THREE.Mesh(forkGeo, chromeMat);
    fork.position.set(0.68, 0.68, 0);
    fork.rotation.z = 0.42;
    group.add(fork);

    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 12), darkMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(0.45, 1.02, 0);
    group.add(bar);

    const drl = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.14, 0.24),
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
    );
    drl.position.set(0.95, 0.86, 0);
    group.add(drl);
  } else {
    // Electric scooter sleek body apron + floorboard + floating seat
    const scShape = new THREE.Shape();
    scShape.moveTo(-0.92, 0.68);
    scShape.lineTo(-0.08, 0.68);
    scShape.lineTo(0.16, 0.32);
    scShape.lineTo(0.58, 0.32);
    scShape.lineTo(0.74, 1.05);
    scShape.lineTo(0.48, 1.06);
    scShape.lineTo(0.32, 0.46);
    scShape.lineTo(-0.22, 0.46);
    scShape.lineTo(-0.92, 0.6);
    scShape.closePath();

    const bodyGeo = new THREE.ExtrudeGeometry(scShape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 4,
    });
    bodyGeo.translate(0, 0, -0.17);
    group.add(new THREE.Mesh(bodyGeo, paintMat));

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.11, 0.3), darkMat);
    seat.position.set(-0.48, 0.76, 0);
    group.add(seat);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.56, 12), darkMat);
    stem.position.set(0.58, 0.96, 0);
    stem.rotation.z = 0.22;
    group.add(stem);

    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.64, 12), darkMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(0.5, 1.2, 0);
    group.add(bar);

    const drl = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.07, 0.24),
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
    );
    drl.position.set(0.76, 0.88, 0);
    group.add(drl);
  }

  return group;
}

function buildVehicleSceneGroup(profile: VehicleVisualProfile): THREE.Group {
  const root = new THREE.Group();

  // Frosted turntable studio disc
  const discGeo = new THREE.CylinderGeometry(2.35, 2.42, 0.07, 48);
  const discMat = new THREE.MeshPhysicalMaterial({
    color: 0xeef4ff,
    roughness: 0.35,
    metalness: 0.08,
    clearcoat: 0.6,
    transparent: true,
    opacity: 0.92,
  });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.y = -0.04;
  root.add(disc);

  // Thin cobalt neon accent ring on pedestal edge
  const ringGeo = new THREE.TorusGeometry(2.34, 0.018, 12, 64);
  ringGeo.rotateX(Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(profile.accentColor),
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.0;
  root.add(ring);

  if (profile.archetype === "scooter" || profile.archetype === "motorcycle") {
    const bike = buildTwoWheelerGroup(profile);
    bike.scale.setScalar(1.32);
    root.add(bike);
    return root;
  }

  const { bodyShape, cabinShape, length, width, wheelRadius, wheelBaseHalf } =
    createCarBodyShape(profile.archetype);

  const carGroup = new THREE.Group();

  // Sculpted extruded body shell
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: width - 0.14,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 5,
  });
  bodyGeo.translate(0, 0, -(width - 0.14) / 2);

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(profile.primaryColor),
    metalness: 0.62,
    roughness: 0.24,
    clearcoat: 1.0,
    clearcoatRoughness: 0.07,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  carGroup.add(bodyMesh);

  // Dark obsidian flush panoramic glasshouse
  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
    depth: width - 0.1,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  cabinGeo.translate(0, 0, -(width - 0.1) / 2);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(profile.secondaryColor),
    metalness: 0.25,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });
  carGroup.add(new THREE.Mesh(cabinGeo, glassMat));

  // Side lower Aero sill cladding
  const sillGeo = new THREE.BoxGeometry(length * 0.64, 0.11, width + 0.04);
  const claddingMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.65,
    metalness: 0.15,
  });
  const sill = new THREE.Mesh(sillGeo, claddingMat);
  sill.position.set(0, 0.3, 0);
  carGroup.add(sill);

  // 4 Aero Alloy Wheels
  const halfTrack = width / 2 + 0.01;
  const positions: Array<[number, number]> = [
    [wheelBaseHalf, halfTrack],
    [wheelBaseHalf, -halfTrack],
    [-wheelBaseHalf, halfTrack],
    [-wheelBaseHalf, -halfTrack],
  ];
  for (const [wx, wz] of positions) {
    const w = createWheelMesh(wheelRadius, profile.accentColor);
    w.position.set(wx, wheelRadius, wz);
    carGroup.add(w);
  }

  // Signature Front Illuminated LED Bar
  const frontX = length / 2 + 0.02;
  const drlMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
  if (profile.ledSignature === "c_blade") {
    const leftDrl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.26), drlMat);
    leftDrl.position.set(frontX, 0.72, halfTrack * 0.62);
    const rightDrl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.26), drlMat);
    rightDrl.position.set(frontX, 0.72, -halfTrack * 0.62);
    const centerBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, width * 0.72), drlMat);
    centerBar.position.set(frontX, 0.78, 0);
    carGroup.add(leftDrl, rightDrl, centerBar);
  } else {
    const frontBar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, width * 0.84), drlMat);
    frontBar.position.set(frontX, 0.76, 0);
    carGroup.add(frontBar);
  }

  // Rear Connected Crimson Tail Light Blade
  const rearBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.055, width * 0.86),
    new THREE.MeshBasicMaterial({ color: 0xf43f5e })
  );
  rearBar.position.set(-(length / 2 + 0.02), 0.84, 0);
  carGroup.add(rearBar);

  root.add(carGroup);
  return root;
}

function setupStudioScene(profile: VehicleVisualProfile) {
  const scene = new THREE.Scene();

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.35);
  keyLight.position.set(5, 7, 6);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.85);
  rimLight.position.set(-6, 4, -5);
  scene.add(rimLight);

  const ambientLight = new THREE.AmbientLight(0xeef4ff, 1.35);
  scene.add(ambientLight);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 0.85);
  scene.add(hemi);

  const vehicleRoot = buildVehicleSceneGroup(profile);
  scene.add(vehicleRoot);

  return { scene, vehicleRoot };
}

function renderVehicleSnapshotDataUrl(
  cacheKey: string,
  profile: VehicleVisualProfile
): string | null {
  const cached = snapshotCache.get(cacheKey);
  if (cached) return cached;

  const renderer = getSharedOffscreenRenderer();
  if (!renderer) return null;

  const { scene, vehicleRoot } = setupStudioScene(profile);
  vehicleRoot.rotation.y = -0.62;

  const camera = new THREE.PerspectiveCamera(34, 480 / 320, 0.1, 100);
  camera.position.set(3.8, 2.15, 4.75);
  camera.lookAt(0, 0.56, 0);

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  snapshotCache.set(cacheKey, url);
  return url;
}

/* ==========================================================================
   Isometric Studio Vector Fallback (for non-WebGL / unit-test environments)
   ========================================================================== */
function StudioVectorFallback({ profile }: { profile: VehicleVisualProfile }) {
  const isTwoWheeler =
    profile.archetype === "scooter" || profile.archetype === "motorcycle";
  return (
    <svg
      viewBox="0 0 320 180"
      className="w-full h-full drop-shadow-[0_14px_20px_rgba(15,23,42,0.16)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`body-${profile.archetype}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={profile.primaryColor} />
          <stop offset="100%" stopColor={profile.secondaryColor} />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="150" rx="112" ry="16" fill="rgba(37, 99, 235, 0.12)" />
      {isTwoWheeler ? (
        <g>
          <circle cx="96" cy="126" r="24" fill="#1E293B" stroke="#E2E8F0" strokeWidth="5" />
          <circle cx="224" cy="126" r="24" fill="#1E293B" stroke="#E2E8F0" strokeWidth="5" />
          <path
            d="M84 96 L142 96 L168 122 L212 122 L202 68 L178 68 L170 98 L100 84 Z"
            fill={profile.primaryColor}
          />
          <rect x="92" y="74" width="54" height="12" rx="6" fill={profile.secondaryColor} />
          <rect x="200" y="72" width="12" height="5" rx="2" fill={profile.accentColor} />
        </g>
      ) : (
        <g>
          <path
            d="M44 108 Q48 80 76 74 L112 46 Q155 42 198 46 L236 74 Q274 82 276 112 L270 124 L50 124 Z"
            fill={`url(#body-${profile.archetype})`}
          />
          <path
            d="M96 74 L120 52 L192 52 L222 74 Z"
            fill="#0F172A"
            opacity="0.88"
          />
          <rect x="234" y="84" width="38" height="6" rx="3" fill={profile.accentColor} />
          <circle cx="92" cy="126" r="23" fill="#0F172A" stroke="#CBD5E1" strokeWidth="5" />
          <circle cx="228" cy="126" r="23" fill="#0F172A" stroke="#CBD5E1" strokeWidth="5" />
        </g>
      )}
    </svg>
  );
}

/* ==========================================================================
   Exported React Components:
   1. Vehicle3DThumbnail: Crisp cached 3D studio snapshot (safe for 40+ grids)
   2. Vehicle3DInteractiveStage: Real-time 360° draggable 3D WebGL stage
   ========================================================================== */
export function Vehicle3DThumbnail({
  manufacturer,
  model,
  className = "",
}: {
  manufacturer?: string;
  model?: string;
  className?: string;
}) {
  const profile = useMemo(
    () => getVehicleVisualProfile(manufacturer, model),
    [manufacturer, model]
  );

  const dataUrl = useMemo(() => {
    const key = `${manufacturer || ""}-${model || ""}-${profile.archetype}-${profile.primaryColor}`;
    return renderVehicleSnapshotDataUrl(key, profile);
  }, [manufacturer, model, profile]);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl ${className}`}
      style={{
        background:
          "radial-gradient(circle at 50% 35%, rgba(255,255,255,0.94) 0%, rgba(219,234,254,0.62) 100%)",
      }}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`${manufacturer || ""} ${model || ""} 3D model`.trim()}
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full p-3">
          <StudioVectorFallback profile={profile} />
        </div>
      )}
    </div>
  );
}

export function Vehicle3DInteractiveStage({
  manufacturer,
  model,
  height = "250px",
}: {
  manufacturer?: string;
  model?: string;
  height?: string;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  const profile = useMemo(
    () => getVehicleVisualProfile(manufacturer, model),
    [manufacturer, model]
  );

  useEffect(() => {
    const el = mountRef.current;
    if (!el || !canUseWebGL()) {
      setFallbackMode(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFallbackMode(true);
      return;
    }

    setFallbackMode(false);
    const width = el.clientWidth || 460;
    const clientHeight = el.clientHeight || 250;
    renderer.setSize(width, clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    el.innerHTML = "";
    el.appendChild(renderer.domElement);

    const { scene, vehicleRoot } = setupStudioScene(profile);
    const camera = new THREE.PerspectiveCamera(35, width / clientHeight, 0.1, 100);
    camera.position.set(3.9, 2.05, 4.75);
    camera.lookAt(0, 0.54, 0);

    let yaw = -0.62;
    let dragging = false;
    let lastX = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      yaw += dx * 0.012;
    };
    const onPointerUp = () => {
      dragging = false;
    };

    const canvas = renderer.domElement;
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (!dragging) {
        yaw += 0.0045;
      }
      vehicleRoot.rotation.y = yaw;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!el) return;
      const w = el.clientWidth || width;
      const h = el.clientHeight || clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.dispose();
      el.innerHTML = "";
    };
  }, [profile]);

  return (
    <div
      style={{
        height,
        background:
          "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.96) 0%, rgba(219,234,254,0.7) 58%, rgba(224,231,255,0.55) 100%)",
      }}
      className="relative w-full rounded-[20px] border border-white/85 overflow-hidden shadow-inner"
    >
      {fallbackMode ? (
        <div className="w-full h-full flex items-center justify-center p-4">
          <StudioVectorFallback profile={profile} />
        </div>
      ) : (
        <div ref={mountRef} className="w-full h-full" />
      )}
      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-semibold text-[#334155]">
        <span className="cw-pill !py-1 !px-2.5">
          Interactive 3D · Drag to rotate
        </span>
        <span className="cw-pill cw-pill-accent !py-1 !px-2.5">
          {profile.claimedRangeLabel}
        </span>
      </div>
    </div>
  );
}
