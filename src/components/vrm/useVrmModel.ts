"use client";

import { useEffect, useRef, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";

export type VrmModelState = {
  vrm: VRM | null;
  loading: boolean;
  error: string | null;
  loadTimeMs: number | null;
};

export function useVrmModel(modelUrl: string | null | undefined): VrmModelState {
  const [state, setState] = useState<VrmModelState>({ vrm: null, loading: false, error: null, loadTimeMs: null });
  const prevUrlRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (modelUrl === prevUrlRef.current) return;
    prevUrlRef.current = modelUrl;

    if (!modelUrl) {
      setState((prev) => {
        if (prev.vrm) {
          VRMUtils.deepDispose(prev.vrm.scene);
        }
        return { vrm: null, loading: false, error: null, loadTimeMs: null };
      });
      return;
    }

    setState({ vrm: null, loading: true, error: null, loadTimeMs: null });
    let cancelled = false;
    const loadStart = performance.now();

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      modelUrl,
      (gltf) => {
        if (cancelled) return;
        try {
          VRMUtils.removeUnnecessaryJoints(gltf.scene);
          const vrmModel = gltf.userData.vrm as VRM | undefined;
          if (!vrmModel) {
            setState({ vrm: null, loading: false, error: "VRM メタデータが見つかりません。VRM 形式のファイルを使用してください。", loadTimeMs: null });
            return;
          }
          VRMUtils.rotateVRM0(vrmModel);
          setState({ vrm: vrmModel, loading: false, error: null, loadTimeMs: Math.round(performance.now() - loadStart) });
        } catch (e) {
          setState({ vrm: null, loading: false, error: e instanceof Error ? e.message : String(e), loadTimeMs: null });
        }
      },
      undefined,
      (err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : (err as { message?: string }).message ?? "ファイルの読み込みに失敗しました";
        setState({ vrm: null, loading: false, error: msg, loadTimeMs: null });
      }
    );

    return () => {
      cancelled = true;
    };
  }, [modelUrl]);

  // Dispose on unmount
  useEffect(() => {
    return () => {
      setState((prev) => {
        if (prev.vrm) {
          VRMUtils.deepDispose(prev.vrm.scene);
        }
        return { vrm: null, loading: false, error: null, loadTimeMs: null };
      });
    };
  }, []);

  return state;
}

// Map our expression names to VRM expression preset names
export const VRM_EXPRESSION_MAP: Record<string, string> = {
  neutral: "neutral",
  smile: "happy",
  blush: "happy",
  embarrassed: "relaxed",
  annoyed: "angry",
  angry: "angry",
  sad: "sad",
  worried: "sad",
  surprised: "surprised",
  serious: "neutral",
};

// Resolve expression key considering custom expression_map_json
export function resolveExpressionKey(
  expression: string,
  customMap?: Record<string, string> | null
): string {
  if (customMap && customMap[expression]) return customMap[expression];
  return VRM_EXPRESSION_MAP[expression] ?? "neutral";
}
