# 3D モデル導入パイプライン

BOOTHで購入したVRChat向け3Dモデル（FBX + UnityPackage構成）を本PWAで使用するためのワークフロー整理。

---

## 対象モデル構成

| 項目 | 内容 |
|------|------|
| 形式 | FBX + UnityPackage |
| テクスチャ | PNG / PSD |
| Unity バージョン | 2022.3.22f1 |
| シェーダー | lilToon 1.3.5 |
| SDK | VRChat SDK3.0 + PhysBone |
| ポリゴン数 | 約170k |
| 表情 | シェイプキー多数 |

---

## 必要ツール一覧

| ツール | 用途 | 入手先 |
|--------|------|--------|
| Unity 2022.3.22f1 | モデルの確認・エクスポート | Unity Hub |
| VRChat SDK 3.0 | VRC向けセットアップ確認 | VRCSDK Creator Companion |
| UniVRM 0.127.x | FBX/UnityPackage → VRM変換 | GitHub: vrm-c/UniVRM |
| lilToon 1.3.5 | オリジナルシェーダー確認 | BOOTH / GitHub |
| MToon (UniVRM付属) | Web向けシェーダー変換先 | UniVRM付属 |
| Blender 4.x | ポリゴン削減・テクスチャベイク・確認 | blender.org |
| VRM Addon for Blender (CATS等) | Blender上でのVRM操作 | GitHub |

---

## ツールの役割整理

### lilToon
- VRChat/Unity向けのPBRベースの高品質シェーダー
- アウトライン、影階調、反射、発光など高度な設定が可能
- **WebGLでは動作しない** — Three.jsはGLSLをそのまま使うためlilToon独自シェーダーは使用不可

### VRChat SDK3.0 + PhysBone
- VRChat固有のセットアップ（アバター設定、Expressionメニューなど）
- **Web変換時は無視してよい** — PhysBoneはUniVRMのSpringBone相当に置き換え

### UniVRM
- Unity上でVRMフォーマットへの変換を担う
- VRM 1.0 または 0.x 形式でエクスポート可能
- **推奨: VRM 1.0** — `@pixiv/three-vrm` v3はVRM1.0ネイティブ対応

### MToon (Web用)
- VRM標準のトゥーンシェーダー
- `@pixiv/three-vrm`がネイティブサポート
- lilToonの見た目に近い設定が可能（アウトライン・シェーディング・リムライト）
- **lilToonのWeb代替として使用する**

---

## FBX/UnityPackage → Web向けVRM/GLB 変換ルート

### Route A: Unity → UniVRM → VRM（推奨）

```
FBX + UnityPackage
  ↓ Unity 2022.3.22f1 でインポート
  ↓ lilToon確認・マテリアル目視確認
  ↓ UniVRM インポート
  ↓ VRM Exportウィザードでセットアップ
    ・マテリアルをMToonに変換
    ・ボーン確認（必須: Hips, Spine, Chest, Head...）
    ・表情シェイプキーをExpressionにマッピング
    ・SpringBone設定（揺れ物）
  ↓ .vrm ファイル出力（VRM 1.0推奨）
  ↓ PWAでURL入力して読み込み
```

### Route B: Unity → Blender → GLTF → GLB（サブルート）

```
FBX
  ↓ Unity FBXExporterまたはFBX直接読み込み
  ↓ Blenderでインポート
    ・ポリゴン削減（70k以下推奨）
    ・テクスチャベイク（lilToon → 標準PBR）
  ↓ glTF Exporterでエクスポート
  ↓ .glb ファイル
  ↓ PWAで読み込み（VRM機能なし、表情・視線なし）
```

**注意**: Route B は GLBとして読み込めるが、VRM expressionManager / lookAt / humanoidが使えないため表情制御・視線制御が動作しない。デバッグ確認用途のみ推奨。

---

## PWAで読み込むための推奨形式

**→ VRM 1.0 形式（.vrm）を推奨**

| 項目 | 理由 |
|------|------|
| ライブラリ | `@pixiv/three-vrm` v3がVRM1.0ネイティブサポート |
| 表情制御 | expressionManager経由でシェイプキーをAPI操作可能 |
| 視線制御 | lookAt.targetにThree.jsオブジェクトを設定可能 |
| 物理演算 | SpringBoneでの揺れ物シミュレーション |
| シェーダー | MToonがThree.js上でtoonレンダリング |
| ライセンス | VRM Metaにライセンス情報を埋め込み可能 |

---

## 表情シェイプキーの整理方針

### VRM Expression Preset との対応

| アプリ側 | VRM Preset | 説明 |
|----------|-----------|------|
| neutral | neutral | デフォルト表情 |
| smile | happy | 笑顔 |
| blush | happy | 照れ（happy相当で代替） |
| embarrassed | relaxed | 恥ずかしい |
| annoyed | angry | 苛立ち |
| angry | angry | 怒り |
| sad | sad | 悲しみ |
| worried | sad | 不安（sad相当） |
| surprised | surprised | 驚き |
| serious | neutral | 真剣（neutral相当） |

### カスタムマッピング
- キャラクターに `expression_map_json` が設定されている場合、そちらが優先される
- 例: `{ "blush": "blush_custom", "smile": "smile_soft" }`

---

## 最初に使う表情4種（VrmCharacterPreviewの表示順）

| 順番 | 表情 | VRM Preset |
|------|------|-----------|
| 1 | neutral | neutral |
| 2 | smile | happy |
| 3 | blush | happy |
| 4 | annoyed | angry |

理由: デフォルト状態・好意・照れ・苛立ちという「日常シーンで頻出の4感情」をカバー。

---

## Unity上で人間が目視確認すべき項目

### 1. ボーン構成の確認
- [ ] Humanoidリグが正しく設定されているか（Hips → Spine → Chest → Neck → Head...）
- [ ] 指・足のボーンマッピングに警告がないか
- [ ] TポーズまたはAポーズで自然な形になっているか

### 2. マテリアルの確認
- [ ] lilToonマテリアルが全パーツに正しく適用されているか
- [ ] アウトライン設定（太さ・色）
- [ ] テクスチャが正しく読み込まれているか（欠落・白抜けなし）

### 3. 表情シェイプキーの確認
- [ ] Expression一覧を開き、Neutral/Happy/Angry/Sad/Surprisedが機能するか
- [ ] 値を0→1でスライドして顔が変化するか
- [ ] 目・口・眉が独立して動いているか

### 4. 揺れ物（PhysBone/SpringBone）の確認
- [ ] 髪・スカート・アクセサリーの揺れが自然か
- [ ] 衝突が発生していないか
- [ ] SpringBoneへの変換後に同等の揺れになるか

### 5. スケール・位置の確認
- [ ] VRMのT-Pose時に身長が約1.6〜1.7mになっているか
- [ ] 足がY=0に接地しているか

---

## スマホPWA向けの負荷確認項目

### パフォーマンス目標

| 指標 | 目標値 |
|------|--------|
| FPS | 30fps安定（iPhone 15 Pro） |
| 初回読み込み | 5秒以内 |
| ポリゴン数 | 70k以下推奨（170kは重い可能性あり） |
| テクスチャ | 512×512〜1024×1024（2048はメモリ圧迫） |
| WebGL Context | バックグラウンド移行時の自動停止確認 |

### 確認手順

1. **ポリゴン削減が必要かテスト**
   - 170kのままVRM読み込み → FPSをrequestAnimationFrame間隔で計測
   - 30fps未満の場合はBlenderでデシメート（目標70k以下）

2. **テクスチャ最適化**
   - 2048テクスチャを1024にリサイズ
   - PNGをWebP変換（バンドルサイズ削減）

3. **iPhoneのバックグラウンド確認**
   - ホームボタン → 再度開いたときにWebGLコンテキストが復帰するか
   - Three.jsのrenderer.setAnimationLoop(null) + resume実装を確認

4. **メモリ確認**
   - iOS Safari の Inspector → Timeline でメモリ使用量確認
   - VRMUtils.deepDispose() の呼び出しでGCされるか確認

5. **発熱確認**
   - 5〜10分連続プレイ後の本体温度確認
   - FPS Limitを30に設定することで発熱を抑制

---

## 未対応事項（今後の課題）

- **3Dモデルのアップロード機能**: Supabase Storage経由でのVRMアップロードUI（現在はURL入力のみ）
- **FPS実測値の計測**: Three.jsのrequestAnimationFrame間隔からfps_averageを算出してDBに保存
- **ポリゴン数・テクスチャメモリの推定**: GLTFロード後のgeometry/textureから概算値を取得
- **Blenderパイプラインの自動化**: FBX → VRMバッチ変換スクリプト

---

*作成: 2026-05-12*
