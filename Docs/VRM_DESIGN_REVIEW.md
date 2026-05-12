# VRM / 3D キャラクターモデル 設計レビュー

> レビュー日: 2026-05-12  
> 対象: Three.js + @pixiv/three-vrm を使ったキャラクター表示の実現可能性検討

---

## 1. 概要

テキスト/画像ベースの現行 AIChat に、VRM 形式の 3D キャラクターを重ね合わせて表示する機能を追加するかどうかを検討する設計レビュー。

---

## 2. 技術スタック候補

| レイヤー | ライブラリ | 備考 |
|---|---|---|
| 3D レンダリング | `three` (Three.js) | r163 以降。React-Three-Fiber (r3f) 経由も可 |
| VRM ローダー | `@pixiv/three-vrm` v3 | VRM 0.x / 1.0 両対応、three r163+ 必須 |
| アニメーション | `@pixiv/three-vrm-animation` | VRMA ファイル対応。VRM 1.0 専用 |
| 物理演算 (揺れ) | `@pixiv/three-vrm-springbone` | three-vrm 内包済み |
| ブレンドシェイプ | VRM 標準 Expression API | 表情制御 |
| React バインディング | `@react-three/fiber` + `@react-three/drei` | オプション。生 Three.js でも可 |

---

## 3. 実現可能性評価

### 3.1 基本表示・ローカルファイル読み込み

**実現可能。** `@pixiv/three-vrm` は Next.js App Router + クライアントコンポーネントで動作確認済み（コミュニティ事例多数）。

注意点:
- `three` / `@pixiv/three-vrm` は重い（gzip 後 ~300-500 KB）。`dynamic(() => import('./VrmViewer'), { ssr: false })` で遅延ロード必須。
- VRM ファイルのサイズは軽量モデルで 20-80 MB。ユーザーがアップロードする運用が現実的。Supabase Storage に保存する場合は大容量バケット設定が必要（デフォルト 5 GB/プロジェクト）。
- iOS Safari の WebGL は制約が多い（最大テクスチャサイズ 4096、最大 GL コンテキスト数 16）。軽量モデルを推奨するか、PC 専用フラグを設ける。

### 3.2 アニメーション

**条件付きで実現可能。** 2 方式：

| 方式 | 仕組み | 工数 |
|---|---|---|
| **VRMA ファイル** | `.vrma` アニメーションファイルをロードして再生 | ★☆☆☆ 低 |
| **ランタイム Pose 制御** | HumanoidBone API で骨格を直接回転 | ★★★☆ 中-高 |
| **Motion Capture** | MediaPipe Holistic → リアルタイム IK | ★★★★ 高 (スコープ外) |

VRMA ファイルが現実的。VRM 1.0 モデルに同梱されているか、別途 `.vrma` を用意する。
VRM 0.x モデルは VRMA 非対応 → 骨格 Pose 制御か、独自アニメーション JSON が必要。

### 3.3 表情連動（AI 発話に合わせた Expression）

**実現可能。** `VRM.expressionManager.setValue("happy", 1.0)` のような API で制御。

AIChat の `InfoBox` や `characterStates.mood` の値を Expression にマッピングするルーティングが必要：

```
mood: "happy" → VRM Expression "happy" 1.0
mood: "sad"   → VRM Expression "sad" 1.0
mood: "angry" → VRM Expression "angry" 1.0
(未対応 mood は Expression "neutral")
```

ブレンドシェイプのキー名はモデル依存（VRM 1.0 は標準化済み、VRM 0.x は任意）なので、モデル固有マッピングを設定画面で編集できるようにするのが堅牢。

### 3.4 口パク（Lipsync）

**オプション扱い推奨。** ElevenLabs TTS の音声ブロブから WebAudio API で音量を取得し、`aa/ih/ou/ee/oh` Expression をドライブする方式が最も現実的（phoneme-level lipsync ではなく振幅ベース）。工数は ★★★☆。

### 3.5 カメラ・背景との合成

現在の `SceneBackground.tsx`（背景画像の crossfade コンポーネント）の上に Canvas を重ねる構成：

```
<div style={{position:"relative"}}>
  <SceneBackground />   {/* CSS fixed/absolute 背景 */}
  <Canvas style={{position:"absolute", top:0, left:0}} />  {/* Three.js Canvas */}
  <ChatLog />           {/* チャットUI */}
</div>
```

Canvas の `gl.setClearAlpha(0)` で背景透過にし、背景との合成が可能。

---

## 4. データモデル変更案

### 4.1 DB テーブル

```sql
-- VRM ファイル本体の参照
CREATE TABLE scenario_vrm_models (
  id          TEXT PRIMARY KEY,
  scenario_id TEXT REFERENCES scenarios(id) ON DELETE CASCADE,
  character_id TEXT,
  storage_path TEXT NOT NULL,      -- Supabase Storage path
  vrm_version  TEXT DEFAULT '1.0', -- '0.x' | '1.0'
  display_name TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- セッションごとのモデル表示状態
CREATE TABLE session_vrm_states (
  session_id   TEXT PRIMARY KEY REFERENCES play_sessions(id) ON DELETE CASCADE,
  active_model_id TEXT REFERENCES scenario_vrm_models(id),
  expression   TEXT DEFAULT 'neutral',
  pose_key     TEXT DEFAULT 'idle',
  position_x   REAL DEFAULT 0,
  scale        REAL DEFAULT 1.0,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 型定義

```typescript
// domain/types.ts に追加
export type VrmModelRecord = {
  id: ID;
  scenarioId: ID;
  characterId?: ID | null;
  storagePath: string;
  vrmVersion: "0.x" | "1.0";
  displayName?: string | null;
};

export type SessionVrmState = {
  sessionId: ID;
  activeModelId?: ID | null;
  expression: string;
  poseKey: string;
  positionX: number;
  scale: number;
};
```

---

## 5. コンポーネント設計案

```
src/components/vrm/
  VrmViewer.tsx          -- Three.js Canvas、モデルロード/描画
  VrmExpressionDriver.tsx -- mood → expression マッピング
  useVrmModel.ts          -- モデルロード状態管理 hook
  vrmExpressionMap.ts     -- デフォルトマッピング定数
```

`VrmViewer` は `dynamic` import + `ssr: false` でクライアント専用レンダリング。

---

## 6. パフォーマンス考察

| 項目 | リスク | 対策 |
|---|---|---|
| バンドルサイズ | three + three-vrm ~500 KB (gzip) | dynamic import、必要なページのみロード |
| メモリ | VRM テクスチャ 100-300 MB GPU | 非表示時に dispose、1モデルのみ同時ロード |
| FPS | モバイルで 30 fps 以下の可能性 | requestAnimationFrame throttle、Canvas サイズ制限 |
| iOS WebGL | コンテキスト上限 | グローバル Canvas 1 インスタンス |
| VRM ダウンロード | 20-80 MB は初回ロード遅延 | IndexedDB キャッシュ (`idb-keyval` など) |

---

## 7. 主要リスクと未解決事項

1. **VRM ライセンス**: VRM には VRM Public License (VPL) が付随する場合が多い。ユーザー自身がアップロードする VRM のライセンス管理は利用規約で明示が必要。
2. **モバイル実機検証**: iPad/iPhone での Three.js WebGL パフォーマンスは事前に確認必須。
3. **Supabase Storage コスト**: 80 MB × ユーザー数のストレージ消費。無料枠 (1 GB) はすぐ枯渇する可能性。
4. **VRM 0.x vs 1.0**: 市場流通モデルの大半はまだ VRM 0.x。アニメーション対応に差があるため、バージョン別コードパスが必要。
5. **UIとの統合深度**: 単なる「見た目装飾」として独立させるか、AIの感情/Info Boxと深く連動させるかで工数が大幅に変わる（1週間 vs 3-4週間）。

---

## 8. 実装フェーズ提案

### Phase 1: 静的表示 MVP（1-2日）
- `@pixiv/three-vrm` インストール、dynamic import、Canvas 重ね合わせ
- VRM ファイルのアップロード（Supabase Storage）とロード表示
- Expression API で `neutral` / `happy` / `sad` を手動切替できる UI
- 成果物: キャラクターが Chat 画面右側に立って表示される

### Phase 2: 感情連動（1-2日）
- `mood` → Expression マッピングドライバー
- `characterStates[i].mood` の変化を検知して Expression を更新
- 設定画面でキャラクターと VRM モデルの紐付け UI

### Phase 3: アニメーション（2-3日）
- VRMA ファイルのロードと idle / talk / react アニメーション切替
- 音声再生時の振幅ベース口パク（ElevenLabs 連動）

### Phase 4: 調整・最適化（1-2日）
- IndexedDB キャッシュ
- iOS 実機検証・パフォーマンスチューニング
- 非表示 toggle UI

---

## 9. 推奨判断

**Phase 1 の静的表示 MVP から始めることを推奨。**

理由:
- Three.js / VRM の動作確認を最小工数で行える
- モバイルパフォーマンスの問題が早期に判明する
- Phase 1 単体でも「キャラクターが画面に立つ」体験価値がある
- Phase 2 以降は Phase 1 の実績を見てから判断できる

**見送りが妥当な場合:**
- 主要ユーザーがスマートフォン専用（WebGL パフォーマンス問題が高リスク）
- チャット UI の縦長レイアウトと 3D Canvas の共存が UX 的に困難と判断

---

## 10. 参考リンク

- [@pixiv/three-vrm GitHub](https://github.com/pixiv/three-vrm)
- [VRM Spec (VRM 1.0)](https://vrm.dev/en/vrm/vrm_spec/)
- [three-vrm サンプル (CodeSandbox)](https://codesandbox.io/s/three-vrm-8v6nx)
- [React Three Fiber ドキュメント](https://docs.pmnd.rs/react-three-fiber/)
