import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ─── Mouse tracker ──────────────────────────────────────────── */
const useMouse = () => {
  const mouse = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return mouse;
};

/* ─── Network Graph ──────────────────────────────────────────── */
const NetworkGraph = () => {
  const mouse = useMouse();
  const groupRef = useRef();
  const instancedRef = useRef();
  const linesRef = useRef();
  const pulseRingsRef = useRef([]);
  const glowRef = useRef();
  const scanPlaneRef = useRef();

  const NODE_COUNT = 140;
  const SPREAD = 15;
  const CONNECT_DIST = 3.6;

  const { basePos, phases, speeds, sizes, colors, edges, specialNodes } = useMemo(() => {
    const basePos = new Float32Array(NODE_COUNT * 3);
    const phases = new Float32Array(NODE_COUNT);
    const speeds = new Float32Array(NODE_COUNT);
    const sizes = new Float32Array(NODE_COUNT);
    const colors = new Float32Array(NODE_COUNT * 3);

    // Color palette: teal trace nodes, a few critical-red, mostly dim wire-gray
    // Matches --trace #3FA9A0, --severity-critical #E5484D, --wire #4A5563
    const palette = [
      new THREE.Color('#3FA9A0'), // --trace teal (primary)
      new THREE.Color('#3FA9A0'),
      new THREE.Color('#3FA9A0'),
      new THREE.Color('#5BBFB8'), // lighter teal variant
      new THREE.Color('#4A5563'), // --wire gray
      new THREE.Color('#E5484D'), // --severity-critical red (sparse)
      new THREE.Color('#2A7A74'), // deep teal
    ];

    const specialNodes = []; // large hub nodes

    for (let i = 0; i < NODE_COUNT; i++) {
      basePos[i * 3]     = (Math.random() - 0.5) * SPREAD;
      basePos[i * 3 + 1] = (Math.random() - 0.5) * SPREAD * 0.55;
      basePos[i * 3 + 2] = (Math.random() - 0.5) * 4;

      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.3 + Math.random() * 1.1;

      const isHub = Math.random() < 0.12;
      sizes[i] = isHub ? 2.2 : (0.5 + Math.random() * 0.8);
      if (isHub) specialNodes.push(i);

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    // Build edges
    const edges = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = basePos[i * 3]     - basePos[j * 3];
        const dy = basePos[i * 3 + 1] - basePos[j * 3 + 1];
        const dz = basePos[i * 3 + 2] - basePos[j * 3 + 2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < CONNECT_DIST) {
          edges.push(i, j);
        }
      }
    }

    return { basePos, phases, speeds, sizes, colors, edges, specialNodes };
  }, []);

  const animPos = useMemo(() => new Float32Array(NODE_COUNT * 3), []);

  // Instanced mesh with vertex colors
  const sphereGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(0.055, 7, 7);
    return g;
  }, []);

  const sphereMat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true }), []);

  // Inject per-instance color via instanceColor
  useEffect(() => {
    if (instancedRef.current) {
      instancedRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    }
  }, [colors]);

  // Edge lines
  const linesGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(edges.length * 6);
    const lineColors = new Float32Array(edges.length * 6);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    return geo;
  }, [edges]);

  const linesMat = useMemo(() => new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  }), []);

  // Horizontal tactical grid on the floor — matches --substrate / --panel tones
  const gridHelper = useMemo(() => {
    const g = new THREE.GridHelper(30, 30, 0x1B212B, 0x151B24);
    return g;
  }, []);

  // Radar sweep plane
  const scanGeo = useMemo(() => new THREE.PlaneGeometry(0.3, SPREAD * 0.6), []);
  const scanMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x3FA9A0,  // --trace teal
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  // Glow points (large additive sprites for bloom effect simulation)
  const glowGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const count = specialNodes.length;
    const positions = new Float32Array(count * 3);
    // Will be updated per frame
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [specialNodes]);

  const glowMat = useMemo(() => new THREE.PointsMaterial({
    color: 0x3FA9A0,  // --trace teal
    size: 0.8,
    transparent: true,
    opacity: 0.18,
    sizeAttenuation: true,
    depthWrite: false,
  }), []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const nodeColor = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // ── Update animated node positions ──
    for (let i = 0; i < NODE_COUNT; i++) {
      const ph = phases[i];
      const sp = speeds[i];
      animPos[i * 3]     = basePos[i * 3]     + Math.sin(t * sp * 0.28 + ph) * 0.38;
      animPos[i * 3 + 1] = basePos[i * 3 + 1] + Math.cos(t * sp * 0.20 + ph) * 0.25;
      animPos[i * 3 + 2] = basePos[i * 3 + 2] + Math.sin(t * sp * 0.14 + ph * 2) * 0.15;
    }

    // ── Instanced nodes ──
    if (instancedRef.current) {
      for (let i = 0; i < NODE_COUNT; i++) {
        const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * speeds[i] * 0.85 + phases[i]));
        const scale = sizes[i] * (0.6 + 0.4 * pulse);
        dummy.position.set(animPos[i * 3], animPos[i * 3 + 1], animPos[i * 3 + 2]);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        instancedRef.current.setMatrixAt(i, dummy.matrix);

        // Pulse the node color brightness
        nodeColor.setRGB(
          colors[i * 3]     * (0.6 + 0.4 * pulse),
          colors[i * 3 + 1] * (0.6 + 0.4 * pulse),
          colors[i * 3 + 2] * (0.6 + 0.4 * pulse),
        );
        instancedRef.current.setColorAt(i, nodeColor);
      }
      instancedRef.current.instanceMatrix.needsUpdate = true;
      if (instancedRef.current.instanceColor) {
        instancedRef.current.instanceColor.needsUpdate = true;
      }
    }

    // ── Edge lines ──
    if (linesRef.current) {
      const posArr = linesRef.current.geometry.attributes.position.array;
      const colArr = linesRef.current.geometry.attributes.color.array;
      let idx = 0;
      for (let e = 0; e < edges.length; e += 2) {
        const a = edges[e];
        const b = edges[e + 1];

        // Pulse edge brightness based on connected node pulses
        const pulseA = 0.3 + 0.7 * Math.abs(Math.sin(t * speeds[a] * 0.85 + phases[a]));
        const pulseB = 0.3 + 0.7 * Math.abs(Math.sin(t * speeds[b] * 0.85 + phases[b]));
        const edgePulse = (pulseA + pulseB) * 0.5;

        posArr[idx * 6]     = animPos[a * 3];
        posArr[idx * 6 + 1] = animPos[a * 3 + 1];
        posArr[idx * 6 + 2] = animPos[a * 3 + 2];
        posArr[idx * 6 + 3] = animPos[b * 3];
        posArr[idx * 6 + 4] = animPos[b * 3 + 1];
        posArr[idx * 6 + 5] = animPos[b * 3 + 2];

        // Blend edge color between the two node colors
        const rA = colors[a * 3] * edgePulse;
        const gA = colors[a * 3 + 1] * edgePulse;
        const bA = colors[a * 3 + 2] * edgePulse;
        const rB = colors[b * 3] * edgePulse;
        const gB = colors[b * 3 + 1] * edgePulse;
        const bB = colors[b * 3 + 2] * edgePulse;

        colArr[idx * 6]     = rA;
        colArr[idx * 6 + 1] = gA;
        colArr[idx * 6 + 2] = bA;
        colArr[idx * 6 + 3] = rB;
        colArr[idx * 6 + 4] = gB;
        colArr[idx * 6 + 5] = bB;
        idx++;
      }
      linesRef.current.geometry.attributes.position.needsUpdate = true;
      linesRef.current.geometry.attributes.color.needsUpdate = true;
    }

    // ── Radar sweep ──
    if (scanPlaneRef.current) {
      const cycle = (t * 0.22) % 1;
      const xPos = -SPREAD + cycle * SPREAD * 2;
      scanPlaneRef.current.position.x = xPos;
      // Bright leading edge
      const trailAlpha = 0.05 + 0.25 * Math.pow(1 - ((cycle % 0.05) / 0.05), 2);
      scanPlaneRef.current.material.opacity = Math.min(trailAlpha, 0.35);
    }

    // ── Glow halos around hub nodes ──
    if (glowRef.current) {
      const posArr = glowRef.current.geometry.attributes.position.array;
      for (let k = 0; k < specialNodes.length; k++) {
        const i = specialNodes[k];
        posArr[k * 3]     = animPos[i * 3];
        posArr[k * 3 + 1] = animPos[i * 3 + 1];
        posArr[k * 3 + 2] = animPos[i * 3 + 2];
      }
      glowRef.current.geometry.attributes.position.needsUpdate = true;
      const hubPulse = 0.1 + 0.12 * Math.abs(Math.sin(t * 0.8));
      glowRef.current.material.opacity = hubPulse;
    }

    // ── Mouse parallax ──
    if (groupRef.current) {
      groupRef.current.rotation.y += (mouse.current.x * 0.14 - groupRef.current.rotation.y) * 0.04;
      groupRef.current.rotation.x += (-mouse.current.y * 0.08 - groupRef.current.rotation.x) * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Tactical floor grid */}
      <primitive object={gridHelper} position={[0, -4.5, 0]} />

      {/* Hub node glow halos */}
      <points ref={glowRef} geometry={glowGeo} material={glowMat} />

      {/* Network nodes */}
      <instancedMesh ref={instancedRef} args={[sphereGeo, sphereMat, NODE_COUNT]} />

      {/* Connection edges */}
      <lineSegments ref={linesRef} geometry={linesGeo} material={linesMat} />

      {/* Radar sweep */}
      <mesh
        ref={scanPlaneRef}
        geometry={scanGeo}
        material={scanMat}
        rotation={[0, 0, 0]}
        position={[-SPREAD, 0, 0]}
      />
    </group>
  );
};

/* ─── Ambient star-field dust ────────────────────────────────── */
const Dust = () => {
  const ref = useRef();
  const COUNT = 700;
  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 38;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 22;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      ref.current.rotation.y = t * 0.011;
      ref.current.rotation.x = t * 0.006;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={0x3FA9A0} size={0.028} transparent opacity={0.2} sizeAttenuation depthWrite={false} />
    </points>
  );
};

/* ─── Export ─────────────────────────────────────────────────── */
export default function DataMesh() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
      // Matches --substrate #10141A at center, pure black at edges
      background: 'radial-gradient(ellipse at 50% 30%, #10141A 0%, #0A0E14 55%, #060A0F 100%)',
    }}>
      <Canvas
        camera={{ position: [0, 1.5, 10], fov: 58 }}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <fog attach="fog" args={['#060A0F', 12, 26]} />
        <NetworkGraph />
        <Dust />
      </Canvas>
    </div>
  );
}
