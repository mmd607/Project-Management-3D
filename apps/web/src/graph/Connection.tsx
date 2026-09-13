import { forwardRef, useImperativeHandle, useRef } from "react";
import * as THREE from "three";

export interface ConnectionHandle {
  setEndpoints(from: THREE.Vector3Tuple, to: THREE.Vector3Tuple): void;
}

interface Props {
  color: string;
  opacity: number;
}

/**
 * A single connection line from the core to a project node, driven imperatively every
 * frame from the simulation loop (positions now move via drag/physics, not a static
 * layout) — raw three.js buffer geometry, not drei's <Line>, so we can mutate points
 * in place without triggering React re-renders every frame.
 */
export const Connection = forwardRef<ConnectionHandle, Props>(function Connection({ color, opacity }, ref) {
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const positions = useRef(new Float32Array(6));

  useImperativeHandle(
    ref,
    () => ({
      setEndpoints(from, to) {
        const arr = positions.current;
        arr[0] = from[0];
        arr[1] = from[1];
        arr[2] = from[2];
        arr[3] = to[0];
        arr[4] = to[1];
        arr[5] = to[2];
        const attr = geomRef.current?.getAttribute("position") as THREE.BufferAttribute | undefined;
        if (attr) attr.needsUpdate = true;
      },
    }),
    [],
  );

  return (
    <line>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" args={[positions.current, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  );
});
