"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import { useVrmModel, resolveExpressionKey } from "./useVrmModel";
import type { CharacterControl, ScenarioCharacter } from "@/lib/domain/types";

export type VrmViewerProps = {
  character: ScenarioCharacter | null;
  characterControl: CharacterControl | null;
  quality: "high" | "low";
  fpsLimit: number;
  shadowEnabled: boolean;
  physicsEnabled: boolean;
  className?: string;
  onModelLoaded?: (loadTimeMs: number) => void;
};

export function VrmViewer({
  character,
  characterControl,
  quality,
  fpsLimit,
  shadowEnabled,
  physicsEnabled,
  className,
  onModelLoaded,
}: VrmViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const blinkTimerRef = useRef(0);
  const blinkNextRef = useRef(3);
  const blinkPhaseRef = useRef<"idle" | "closing" | "opening">("idle");
  const blinkProgressRef = useRef(0);
  const idleTimeRef = useRef(0);
  const currentExpressionRef = useRef("neutral");
  const expressionBlendRef = useRef(0);
  const vrmRef = useRef<VRM | null>(null);
  // Refs so the animation loop never needs to restart when these change
  const characterRef = useRef<ScenarioCharacter | null>(null);
  const characterControlRef = useRef<CharacterControl | null>(null);

  const modelUrl = character?.model_type === "vrm"
    ? (character.model_url ?? null)
    : null;

  const { vrm, loading, error, loadTimeMs } = useVrmModel(modelUrl);

  // Sync props to refs so the animation loop doesn't need to restart on prop changes
  useEffect(() => { vrmRef.current = vrm; }, [vrm]);

  // Report load time when model finishes loading
  useEffect(() => {
    if (vrm && loadTimeMs !== null) onModelLoaded?.(loadTimeMs);
    // intentionally only fires when vrm changes (model swap), not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vrm]);
  useEffect(() => { characterRef.current = character; }, [character]);
  useEffect(() => { characterControlRef.current = characterControl; }, [characterControl]);

  // Setup renderer and scene once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: quality === "high",
      powerPreference: "default",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === "high" ? 2 : 1));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = shadowEnabled;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(1, 2, 1);
    if (shadowEnabled) {
      dirLight.castShadow = true;
    }
    scene.add(dirLight);

    // Camera
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
    camera.position.set(0, 1.15, 2.2);
    camera.lookAt(0, 1.05, 0);
    cameraRef.current = camera;

    // Resize observer
    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
   
  }, [quality, shadowEnabled]);

  // Add/remove VRM from scene when it changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    // Remove old VRM scenes
    const toRemove = scene.children.filter((c) => (c as THREE.Object3D & { isVrmScene?: boolean }).isVrmScene);
    toRemove.forEach((c) => scene.remove(c));

    if (vrm) {
      const sceneObj = vrm.scene as THREE.Object3D & { isVrmScene?: boolean };
      sceneObj.isVrmScene = true;
      fitVrmToCamera(sceneObj, character);
      scene.add(sceneObj);
    }
  }, [vrm, character]);

  // Animation loop — reads character/characterControl from refs to avoid restarts on every AI turn
  const animate = useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    const now = performance.now();
    const frameInterval = 1000 / fpsLimit;
    if (now - lastFrameTimeRef.current < frameInterval) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }
    lastFrameTimeRef.current = now;

    const delta = clockRef.current.getDelta();
    const currentVrm = vrmRef.current;
    const char = characterRef.current;
    const ctrl = characterControlRef.current;

    if (currentVrm) {
      // Idle breathing: oscillate spine
      if (char?.idle_motion_enabled !== false) {
        idleTimeRef.current += delta;
        const breath = Math.sin(idleTimeRef.current * 1.2) * 0.008;
        const spine = currentVrm.humanoid?.getNormalizedBoneNode("spine");
        if (spine) spine.rotation.x = breath;
        const chest = currentVrm.humanoid?.getNormalizedBoneNode("chest");
        if (chest) chest.rotation.x = breath * 0.5;
      }

      // Blink animation
      if (char?.blink_enabled !== false) {
        blinkTimerRef.current += delta;
        if (blinkPhaseRef.current === "idle" && blinkTimerRef.current >= blinkNextRef.current) {
          blinkPhaseRef.current = "closing";
          blinkProgressRef.current = 0;
          blinkTimerRef.current = 0;
          blinkNextRef.current = 3 + Math.random() * 3;
        }
        if (blinkPhaseRef.current === "closing") {
          blinkProgressRef.current += delta / 0.08;
          const v = Math.min(blinkProgressRef.current, 1);
          currentVrm.expressionManager?.setValue("blink", v);
          if (v >= 1) { blinkPhaseRef.current = "opening"; blinkProgressRef.current = 0; }
        } else if (blinkPhaseRef.current === "opening") {
          blinkProgressRef.current += delta / 0.1;
          const v = Math.min(blinkProgressRef.current, 1);
          currentVrm.expressionManager?.setValue("blink", 1 - v);
          if (v >= 1) { blinkPhaseRef.current = "idle"; blinkProgressRef.current = 0; }
        }
      }

      // Expression blending (smooth cross-fade)
      const targetExpr = resolveExpressionKey(
        ctrl?.expression ?? char?.default_expression ?? "neutral",
        char?.expression_map_json
      );
      if (targetExpr !== currentExpressionRef.current) {
        const prevExpr = currentExpressionRef.current;
        expressionBlendRef.current += delta * 3;
        const blend = Math.min(expressionBlendRef.current, 1);
        if (expressionBlendRef.current >= 1) {
          expressionBlendRef.current = 0;
          currentExpressionRef.current = targetExpr;
        }
        currentVrm.expressionManager?.setValue(prevExpr, Math.max(0, 1 - blend));
        currentVrm.expressionManager?.setValue(targetExpr, blend);
      } else {
        const intensity = ctrl?.intensity ?? 0.7;
        if (targetExpr !== "neutral") {
          currentVrm.expressionManager?.setValue(targetExpr, intensity);
        }
      }

      // Motion
      const motionKey = ctrl?.motion ?? char?.default_motion ?? "idle";
      if (motionKey === "nod") {
        const head = currentVrm.humanoid?.getNormalizedBoneNode("head");
        if (head) head.rotation.x = Math.sin(now * 0.003) * 0.15;
      } else if (motionKey === "shake_head") {
        const head = currentVrm.humanoid?.getNormalizedBoneNode("head");
        if (head) head.rotation.y = Math.sin(now * 0.004) * 0.2;
      } else if (motionKey === "shy_shift") {
        const neck = currentVrm.humanoid?.getNormalizedBoneNode("neck");
        if (neck) {
          neck.rotation.y = Math.sin(now * 0.001) * 0.05 + 0.1;
          neck.rotation.x = 0.05;
        }
      }

      // Look-at
      if (char?.look_at_user_enabled !== false && currentVrm.lookAt) {
        const gaze = ctrl?.gaze ?? "look_at_user";
        currentVrm.lookAt.target = gaze === "look_at_user" ? camera : undefined;
      }

      if (physicsEnabled) {
        currentVrm.update(delta);
      } else {
        currentVrm.expressionManager?.update();
        currentVrm.humanoid?.update();
        currentVrm.lookAt?.update(delta);
      }
    }

    renderer.render(scene, camera);
    rafRef.current = requestAnimationFrame(animate);
  }, [fpsLimit, physicsEnabled]);

  // Start/restart animation loop
  useEffect(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  return (
    <div className={`relative pointer-events-none ${className ?? ""}`}>
      {loading && (
        <div className="absolute inset-0 flex items-end justify-center pb-4">
          <span className="text-xs text-white/40">モデル読み込み中…</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <span className="text-center text-xs text-danger/70">読み込み失敗: {error}</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ display: "block" }}
      />
    </div>
  );
}

function fitVrmToCamera(sceneObj: THREE.Object3D, character: ScenarioCharacter | null) {
  sceneObj.position.set(0, 0, 0);
  sceneObj.scale.setScalar(character?.vrm_scale ?? 1);
  sceneObj.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(sceneObj);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (size.y > 0) {
    const targetHeight = 1.55;
    const scale = (character?.vrm_scale ?? 1) * (targetHeight / size.y);
    sceneObj.scale.setScalar(scale);
    sceneObj.updateMatrixWorld(true);
  }

  const fittedBox = new THREE.Box3().setFromObject(sceneObj);
  const center = new THREE.Vector3();
  fittedBox.getCenter(center);
  sceneObj.position.x -= center.x;
  sceneObj.position.y -= fittedBox.min.y - 0.02;
  sceneObj.position.z -= center.z;

  const offset = character?.vrm_position_json;
  if (offset) {
    sceneObj.position.x += offset.x;
    sceneObj.position.y += offset.y;
    sceneObj.position.z += offset.z;
  }
}
