// VelouriStage.tsx — React Three Fiber stage for /velouri only. Transparent
// canvas, no card, no floor. Pointer-drag orbit with inertial coast.
// Renders the settings/env portrait (VITE_VELOURI_PFP) as a plate when set,
// otherwise a geometric placeholder built from the design tokens.

import { Suspense, useRef } from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

export type VelouriResolution = "sd" | "hd" | "max";

const RESOLUTION_CONFIG: Record<VelouriResolution, { dpr: number; detail: number }> = {
  sd: { dpr: 1, detail: 1 },
  hd: { dpr: 1.5, detail: 2 },
  max: { dpr: 2, detail: 3 },
};

interface OrbitGroupProps {
  children: ReactNode;
}

function OrbitGroup({ children }: OrbitGroupProps) {
  const group = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    if (!dragging.current) {
      g.rotation.y += 0.0025 + velocity.current.x;
      g.rotation.x += velocity.current.y;
      velocity.current.x *= 0.94;
      velocity.current.y *= 0.94;
    }
  });

  function onPointerDown(event: ThreeEvent<PointerEvent>) {
    dragging.current = true;
    last.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp() {
    dragging.current = false;
  }

  function onPointerMove(event: ThreeEvent<PointerEvent>) {
    if (!dragging.current || !group.current) return;
    const dx = event.clientX - last.current.x;
    const dy = event.clientY - last.current.y;
    group.current.rotation.y += dx * 0.005;
    group.current.rotation.x += dy * 0.005;
    velocity.current = { x: dx * 0.0006, y: dy * 0.0006 };
    last.current = { x: event.clientX, y: event.clientY };
  }

  return (
    <group
      ref={group}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onPointerMove={onPointerMove}
    >
      {children}
    </group>
  );
}

function PfpPlate({ url }: { url: string }) {
  const texture = useLoader(THREE.TextureLoader, url);
  return (
    <mesh>
      <planeGeometry args={[2.2, 2.2, 1, 1]} />
      <meshStandardMaterial map={texture} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

function GeometricPlaceholder({ detail }: { detail: number }) {
  return (
    <group>
      <mesh>
        <icosahedronGeometry args={[1.15, detail]} />
        <meshStandardMaterial color="#c9a06a" wireframe emissive="#6e8b9a" emissiveIntensity={0.15} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.68, Math.max(0, detail - 1)]} />
        <meshStandardMaterial color="#6e8b9a" metalness={0.4} roughness={0.35} />
      </mesh>
    </group>
  );
}

export interface VelouriStageProps {
  pfpUrl?: string;
  resolution: VelouriResolution;
}

export function VelouriStage({ pfpUrl, resolution }: VelouriStageProps) {
  const config = RESOLUTION_CONFIG[resolution];
  const hasPfp = Boolean(pfpUrl);

  return (
    <Canvas
      dpr={config.dpr}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 0, 4.2], fov: 40 }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 3, 4]} intensity={1.1} color="#f3ede3" />
      <pointLight position={[-3, -2, -3]} intensity={0.4} color="#6e8b9a" />
      <Suspense fallback={null}>
        <OrbitGroup>
          {hasPfp ? <PfpPlate url={pfpUrl as string} /> : <GeometricPlaceholder detail={config.detail} />}
        </OrbitGroup>
      </Suspense>
    </Canvas>
  );
}
