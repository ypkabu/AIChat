# AI Worklog

## 2026-05-12 (5回目)

### SmartReply メタデータ追跡 + シナリオスコープ choicePreferences + Lorebook Supabase CRUD + カバー画像アップロード

#### 実装内容

**SmartReply metadata追跡** (`string[]` → `SmartReply[]`):
- `domain/types.ts`: `SmartReply` 型（id / label / intent / tone / agency）追加
- `ai/types.ts`: `ConversationResponse.smartReplies: SmartReply[]` に変更
- `ai/conversation/schema.ts`:
  - Zod: `z.array(z.object({ id, label, intent, tone, agency })).max(3)` に変更。`id` は `newId("sr")` で自動生成
  - JSON Schema: `smartReplies.items` をオブジェクト定義に更新（anyOf enum constraints）
  - `parseConversationJson`: intent/tone/agency を `ChoiceIntent | null` 等にキャスト
- `AppStore.tsx`: `currentSmartReplies` の型を `SmartReply[]` に変更
- `ChatScreen.tsx`: `reply` → `reply.label` で表示・draft 挿入、`key={reply.id}` に変更

**シナリオスコープ choicePreferences**:
- `domain/types.ts`: `ScopedChoicePreferences` 型追加。`AppState.scenarioChoicePreferences: Record<string, UserChoicePreferences>` 追加
- `sampleData.ts`: `scenarioChoicePreferences: {}` 初期値追加
- `AppStore.tsx`:
  - `normalizeState`: `scenarioChoicePreferences: state.scenarioChoicePreferences ?? {}` を追加
  - `trackChoiceSelection`: グローバル choicePreferences と並行して `scenarioChoicePreferences[scenarioId]` も `computeChoicePreferences` で更新
  - `resetChoicePreferences`: `scenarioChoicePreferences: {}` も合わせてリセット
  - sendTurn / continueAutoTurn / sendSilentContinue: `choicePreferences` を `scenarioChoicePreferences[scenarioId] ?? global` にフォールバック切替

**Supabase CRUD (lorebooks / plot_lorebook_links / scenario prefs)**:
- `repository.ts`:
  - `TABLES` に `lorebooks` / `lorebookLinks` を追加
  - `loadAppStateFromSupabase`: lorebooks / lorebookLinks / scenario-scope prefs を Promise.all に追加
  - `buildLorebooks()`: lorebook_entries の lorebook_id でエントリーを振り分け
  - `buildScenarioChoicePreferences()`: scope="scenario" の行から `{ scenarioId: prefs }` を生成
  - `saveAppStateToSupabase`: lorebooks / lorebookLinks を upsert（try/catch でテーブル未適用時はスキップ）
  - `toDbChoicePreferences`: scope / scenarioId 引数を追加。シナリオ別 prefs を upsert
  - `deleteMissingRemoteRows`: lorebooks / lorebookLinks の削除同期を追加

**ロアブックカバー画像アップロード**:
- `storage.ts`: `uploadLorebookCover(file, lorebookId)` 追加（`avatars` バケットの `lorebooks/` サブパス）
- `LorebookEditor.tsx`:
  - `Upload` アイコン・`uploadLorebookCover` / `AVATAR_MIME_TYPES` インポート追加
  - `InfoTab` にカバー画像セクション追加（ファイル選択ボタン・プレビュー・エラー表示）

#### ビルド確認
- `tsc --noEmit`: エラーなし
- `next build`: 全14ルート正常

---

## 2026-05-12 (4回目)

### ロアブック・プロット UI 再設計実装

#### 概要
スタンドアロン Lorebook システム（再利用可能なロアブック）とプロット連動機能を実装。

#### 実装内容

**DB Migration** (`20260512210000_add_lorebook_system.sql`):
- `lorebooks` テーブル新規作成（user_id / title / short_description / cover_image_url / visibility / RLS付き）
- `lorebook_entries` 拡張: lorebook_id / is_hidden / hidden_truth / entry_type カラム追加
- `plot_lorebook_links` テーブル新規作成（plot_id ↔ lorebook_id / enabled / priority / RLS付き）
- `style_settings` 拡張: allow_continue_button / mode_optimization カラム追加

**型定義** (`domain/types.ts`):
- `LorebookEntryType` union型追加（world/place/organization/character_secret/item/history/rule/foreshadowing/relationship/other）
- `LorebookEntry` に lorebook_id / is_hidden / hidden_truth / entry_type 追加
- `Lorebook` / `PlotLorebookLink` 型新規追加
- `StyleSettings` に allow_continue_button / mode_optimization 追加
- `StoryBundle` に lorebookLinks 追加。`AppState` に lorebooks / lorebookLinks 追加

**AppStore** (`AppStore.tsx`):
- `getBundle` / `saveBundle` / `normalizeState` を lorebooks / lorebookLinks 対応に更新
- lorebook CRUD メソッド追加（listLorebooks / createLorebook / saveLorebook / deleteLorebook / addLorebookLink / removeLorebookLink / toggleLorebookLink）
- `getLinkedLorebookEntries` ヘルパー追加
- sendTurn / continueAutoTurn / sendSilentContinue に linkedLorebookEntries を追加

**UI コンポーネント（新規）**:
- `components/lorebook/LorebookListScreen.tsx` — ロアブック一覧（新規作成/削除）
- `components/lorebook/LorebookEditor.tsx` — タブ式エディタ（ロア情報/項目/設定）。hidden_truth は is_hidden=true 時のみ表示
- `app/lorebooks/page.tsx` / `app/lorebooks/[lorebookId]/page.tsx` — Next.js ルート

**既存UI変更**:
- `LorebookTab.tsx` — 連動ロアブック管理 UI に変更（連動追加/解除/トグル）。シナリオ専用ロア（レガシー）は下部で継続維持
- `StyleTab.tsx` — allow_continue_button トグル追加。mode_optimization セレクト（設定しない/AI彼女/物語）追加
- `PromptTab.tsx` — キャラクター上限 5→10
- `BottomNav.tsx` — ロアブック（Library アイコン）ナビ追加（4→5タブ）

**PromptBuilder** (`promptBuilder.ts`):
- `PromptBuildInput` に `linkedLorebookEntries` 追加
- シナリオ専用ロア + 連動ロアブックエントリーを結合して `selectRelevantLore` に渡す
- `hidden_truth` を `selectRelevantLore` 内で空文字列にクリア（絶対にAIプロンプトに漏らさない）
- entry_type ラベルをプロンプト出力に追加

#### hidden_truth 非漏洩の保証
- LorebookEditor: `is_hidden=false` の時は hidden_truth フィールドを非表示
- PromptBuilder `selectRelevantLore`: 結果エントリーの `hidden_truth` を `""` に上書きしてから返す
- AppStore `getLinkedLorebookEntries`: 呼び出し元（promptBuilder）で除外される

#### 未実装
- Supabase 実 DB への lorebooks / plot_lorebook_links の CRUD（現在はローカルステートのみ。migration は作成済み）
- カバー画像アップロード（URL 手入力のみ）

#### ビルド確認
- `tsc --noEmit`: エラーなし
- `next build`: `/lorebooks` / `/lorebooks/[lorebookId]` が出力、全14ルート正常

---

## 2026-05-12 (3回目)

### Choice Preference Learning 強化実装

#### 問題
- AIが intent/tone/agency 等に日本語値 (`"関心を示す"`, `"穏やか"`) を返していた
- 傾向学習のキーが日本語 → preference summary が不安定
- ChoiceButtons debug に effect/why 表示がなかった
- 選択肢生成比率ガイダンスがプロンプトに入っていなかった

#### 実装内容
- `schema.ts`: suggestedReplies JSON Schema を `type: ["string", "null"]` → `anyOf: [{type:"string", enum:[...]}, {type:"null"}]` に変更。intent/tone/agency/choiceStyle/progression/riskLevel に canonical English 値の enum を追加。`why` フィールド (選択肢推薦理由・debug表示用) を新規追加。
- `domain/types.ts`: `SuggestedReply.why?: string | null` 追加。`riskLevel` を `string | null` に緩める（OpenAI が稀に違反する場合の robustness）。
- `promptBuilder.ts`:
  - `buildResponseFormatPrompt` に `choiceMetaRule` 追加: 全メタフィールド説明 + `why` 説明 + `alignPct` ベースの配分比率ガイダンス（strength/experience_mode 連動）
  - `buildChoicePreferenceSummary` 強化: top3 intent / top2 tone / agency / top2 progression / romance score / story-progress score。alignment-pct 指示を format prompt 側に移動（二重指示を避ける）
- `ChoiceButtons.tsx`: Debug ON 時に intent/tone/agency/progression + effect deltas (trust/affection/tension) + why を多段表示。通常プレイ時は完全非表示。

#### 選択肢生成比率
| モード | 好み寄せ | シーン必要 | 意外性/リスク |
|--------|---------|-----------|------------|
| strength=low | 30% | 40% | 30% |
| strength=normal (default) | 45% | 30% | 25% |
| strength=high | 55% | 25% | 20% |
| AI彼女+high | 65% | 20% | 15% |

#### 注意
- Smart Reply は `string[]` のためメタデータ追跡不可（将来課題）
- scenario/character スコープの choicePreferences は将来課題（現在は global のみ）

---

## 2026-05-12 (2回目)

### 3Dモデルパイプライン整理 + Choice Preference Learning 実装

#### 3Dモデルパイプライン (Docs only)
- `Docs/3D_MODEL_PIPELINE.md` 新規作成。Unity/Blender/VRM変換フロー整理。
  - Route A: Unity → UniVRM → VRM 1.0 (推奨)
  - Route B: FBX → Blender → GLB (デバッグ用途)
  - lilToon→MToon変換方針（WebGLでlilToon不可のためMToon使用）
  - 表情4種決定: neutral/smile/blush/annoyed
  - スマホ負荷確認項目（FPS目標30fps、ポリゴン70k以下推奨）
  - Unity上での人間目視確認チェックリスト

#### Choice Preference Learning 実装
- `domain/types.ts`: `ChoiceIntent`/`ChoiceTone`/`ChoiceAgency`/`ChoiceStyle`/`ChoiceProgression`/`PreferenceStrength` union型追加。`SuggestedReply` にメタデータフィールド8種追加（intent/tone/agency/choiceStyle/progression/romanceLevel/intimacyLevel/riskLevel）。`ChoiceEventRecord`/`UserChoicePreferences` 型追加。`AppSettings` に choice_learning_enabled/show_choice_effect_hints/preference_strength 追加。`AppState` に choiceEvents/choicePreferences 追加。
- `domain/constants.ts`: DEFAULT_SETTINGS に choice_learning_enabled:true/show_choice_effect_hints:false/preference_strength:"normal" 追加。
- `domain/sampleData.ts`: createSampleState に choiceEvents:[]/choicePreferences:null 追加。
- `ai/conversation/schema.ts`: suggestedReplies の Zod スキーマと conversationJsonSchema に8種メタデータフィールド追加。parseConversationJson で型キャスト処理追加。
- `ai/types.ts`: `ConversationRequest` に `choicePreferences?: UserChoicePreferences | null` 追加。
- `lib/promptBuilder.ts`: `PromptBuildInput` に choicePreferences 追加。`buildChoicePreferenceSummary` 関数追加（sample_count>=3時に "User Choice Preference Summary" セクションをプロンプトに注入）。`topNPreferenceKeys` ヘルパー追加。
- `ai/conversation/openaiProvider.ts`/`anthropicProvider.ts`/`googleProvider.ts`/`stream/route.ts`: buildConversationPrompt に `choicePreferences` を渡すよう更新。
- `app/api/conversation/route.ts`: requestSchema に `choicePreferences: z.any().nullable().optional()` 追加。
- `lib/store/AppStore.tsx`: `ChoiceEventRecord`/`UserChoicePreferences` import追加。`resetChoicePreferences` useCallback追加。normalizeState に choiceEvents/choicePreferences 追加。sendTurn に `trackChoiceSelection` 呼び出し追加（choice選択時のみ、choice_learning_enabled=true時のみ）。requestPayload に choicePreferences 追加。useMemo 更新。AppStore末尾に `trackChoiceSelection`/`computeChoicePreferences` ヘルパー関数追加（指数減衰アルゴリズム、decay=0.9→0.95）。
- `supabase/repository.ts`: loadAppStateFromSupabase の返却値に choiceEvents:[]/choicePreferences:null 追加。
- `components/chat/ChoiceButtons.tsx`: `showDebug` prop 追加。Debug ON時に choice.intent/tone/progression をボタン内に小文字表示。
- `components/chat/ChatScreen.tsx`: ChoiceButtons に `showDebug={state.settings.story_director_debug_enabled}` を渡すよう更新。
- `components/settings/AppSettingsScreen.tsx`: 「選択傾向学習」セクション追加（enabled toggle/preference_strength 3択/show_choice_effect_hints/サンプル数表示/リセットボタン）。
- `supabase/migrations/20260512200000_add_choice_learning.sql`: choice_events/user_choice_preferences テーブル作成 migration。RLS policy/index含む。
- tsc / next build ともにエラーなし。

## 2026-05-12

### VRM MVP 残実装

- `useVrmModel.ts` に `loadTimeMs: number | null` フィールドを追加。ロード開始時刻を `performance.now()` で記録し、GLTFLoader の onLoad コールバック内で計測完了。
- `VrmViewer.tsx` に `onModelLoaded?: (loadTimeMs: number) => void` prop を追加。`vrm` が変わった (= 新しいモデルがロード完了した) 時に一度だけ呼び出す。`error` を useVrmModel から取り出し、エラー文をキャンバス上に絶対配置で表示するフォールバック UI を追加。
- `PromptTab.tsx` に `VrmCharacterPreview` コンポーネントを新規実装。`dynamic(() => import VrmViewer, {ssr: false})` で Three.js を SSR から除外。`previewExpression` state で表情を管理し、neutral/smile/blush/annoyed の4ボタンで切り替え可能。ロード時間を左下に小文字表示。model_type が vrm/glb かつ model_url がある場合のみ VRM セクション内に表示。ライセンスメモ欄 (license_note) も同セクションに追加。
- tsc / next build ともにエラーなし。

### VRM 3Dキャラクター + 体験モード

- `domain/types.ts` に `ExperienceMode`, `VrmExpression`, `VrmMotion`, `CharacterControl` 型を追加。`ScenarioCharacter` に model_type / model_url / vrm_scale / vrm_position_json / look_at_user_enabled / blink_enabled / idle_motion_enabled 他 VRM 全フィールドを追加。`AppSettings` に experience_mode / vrm_enabled / vrm_quality / vrm_fps_limit / vrm_shadow_enabled / vrm_physics_enabled を追加。
- `domain/constants.ts` の DEFAULT_SETTINGS に上記フィールドのデフォルト値を追加。
- `ai/types.ts` の `ConversationResponse` に `characterControl?: CharacterControl | null` を追加。
- `schema.ts` に `vrmExpressionSchema`, `vrmMotionSchema`, `characterControlSchema` を追加し、conversationOutputSchema/conversationJsonSchema/parseConversationJson/fallbackFromRawText に反映。
- `promptBuilder.ts` の `buildResponseFormatPrompt` に characterControl 出力指示を追加。`buildConversationPrompt` に `experienceMode` 分岐を追加：girlfriend モードは Turn Budget / Beat / Scene Transition / Director rules / 伏線投入を省略してプロンプト軽量化。
- `src/components/vrm/useVrmModel.ts` を新規作成。`GLTFLoader` + `VRMLoaderPlugin` で非同期 VRM 読み込み、dispose 管理、`VRM_EXPRESSION_MAP`、`resolveExpressionKey` を実装。
- `src/components/vrm/VrmViewer.tsx` を新規作成。Three.js WebGLRenderer (alpha:true) で透明キャンバスオーバーレイ。idle breathing（spine/chest Y 回転）、blink（3フェーズ状態機械）、expression ブレンド（速度 3x）、motion（nod/shake_head/shy_shift）、look-at（vrm.lookAt.target = camera）、物理演算トグルのアニメーションループを RAF + FPS throttle で実装。
- `AppStore.tsx` に `currentCharacterControl` state を追加。`sendTurn` / `continueAutoTurn` / `sendSilentContinue` の AI レスポンス受信後に `setCurrentCharacterControl(ai.characterControl ?? null)` を呼ぶよう追加。useMemo の value/deps に追加。
- `ChatScreen.tsx` に `dynamic(() => import VrmViewer, { ssr: false })` を追加。JSX に `state.settings.vrm_enabled && <VrmViewer ...>` を SceneBackground 直後に挿入。
- `AppSettingsScreen.tsx` に体験モード切替（AI彼女モード/物語モード）セクションと VRM 設定パネル（3D ON/OFF・描画品質・FPS上限・シャドウ・物理演算）を 表示セクションの直前に追加。
- `PromptTab.tsx` のキャラクターエディタに「3Dモデル (VRM)」折りたたみセクションを追加：モデルタイプ選択・model_url・スケール・デフォルト表情/モーション・視線追従/まばたき/呼吸トグル。
- `supabase/migrations/20260512100000_add_vrm_fields.sql` 作成：scenario_characters に 17 列、app_settings に 6 列を追加。
- tsc / next build ともにエラーなし。

### Scene Visual Bundle + 「続きを見る」機能

- `SceneBackground.tsx` 新規作成。背景画像 URL と crossfade アニメーションを管理する固定配置コンポーネント
- `ChatScreen.tsx` に SceneBackground 統合、「このシーンを背景画像化」手動トリガーボタンを menu 内に追加
- `AppStore.tsx` に 3 モジュールレベルヘルパーを追加: `upsertSessionVisualState`（セッションビジュアル状態の upsert）、`normalizeExpression`（表情キー正規化）、`buildSceneBackgroundPrompt`（背景生成プロンプト構築）
- `ContinueSuggestion` 型を `domain/types.ts` に追加: `{ available, label, reason }`
- `ai/types.ts`: `ConversationRequest.inputType` に `"continue_without_user_speech"` を追加、`ConversationResponse` に `continueSuggestion?: ContinueSuggestion | null` を追加
- `schema.ts`: `continueSuggestionSchema` を追加。`mustStopAuto` 時は `available: false` を強制
- `promptBuilder.ts`: `continue_without_user_speech` 専用の `silentContinueRules`（Can/Cannot 制約）、`buildLatestUserMessage` 分岐、`buildResponseFormatPrompt` に `continueSuggestion` 出力指示を追加
- `AppStore.tsx` に `sendSilentContinue` useCallback を追加。`auto_continue_count < 3` ガード、`"── あなたは黙って様子を見る。"` イベントメッセージ挿入、`continue_without_user_speech` inputType で会話API呼び出し、`currentContinueSuggestion` 状態更新
- `ChatScreen.tsx` に `handleSilentContinue` ハンドラーと「続きを見る」ボタンを追加。`choice_heavy` モードと `auto_continue_count >= 3` の場合は非表示、dynamic label は `currentContinueSuggestion.label` から取得
- `EventMessage.tsx`: `metadata.action === "continue_without_user_speech"` を検出し、カメラアイコンなしの divider スタイルで表示
- `Docs/VRM_DESIGN_REVIEW.md` 新規作成。Three.js + `@pixiv/three-vrm` による VRM キャラクター表示の実現可能性を 10 セクションでレビュー（技術スタック、実現可能性、データモデル、コンポーネント設計、パフォーマンス、リスク、4フェーズ実装提案）
- 型チェック・ビルドともにエラーなし

## 2026-05-11

### Multi-Provider Model Routing（品質重視モデル構成）

- `AppSettings` に 9 フィールドを追加: `director_provider/model`, `smart_reply_provider/model`, `summary_provider/model`, `image_prompt_provider/model`, `model_preset`
- `UsageLog` に `model_role` / `reason_for_model_selection` を追加
- `ConversationResponse.usage` に `model_role` / `reason` を追加
- `ConversationRequest` に `kind` フィールドを追加
- `src/lib/ai/conversation/modelResolver.ts` 新規作成。8 ロール対応の優先順位ロジックを実装。`detectImportantEventSignals` で伏線 ready / 章クライマックス / 新章 / 複数キャラを検出
- `modelSelection.ts` を後方互換ラッパーに更新し、新 resolver へ委譲
- `src/lib/ai/conversation/providers/anthropicProvider.ts` 新規作成。Anthropic Messages API (fetch) 実装。`ANTHROPIC_API_KEY` 未設定時は fallback narration を返す
- `src/lib/ai/conversation/providers/googleProvider.ts` 新規作成。Gemini `generateContent` API (fetch) 実装。`GOOGLE_API_KEY` / `GEMINI_API_KEY` 未設定時は fallback narration を返す
- `provider.ts` に anthropic / google / gemini のディスパッチを追加。env-level override も保持
- `costCalc.ts` に Claude Opus/Sonnet/Haiku・Gemini 2.5 Pro/2.0 Flash のレートを追加
- `/api/conversation` route に `model_role` + `reason` を usage に付加するよう変更
- `/api/summarize` を `summary_provider/model` → cheap → normal の優先順で選択するよう変更
- `/api/background` / `/api/quality` を `smart_reply_provider/model` → cheap → normal へ変更
- `/api/story/[storyId]/chat/stream` の usage emit に `model_role` / `reason` を追加
- `DEFAULT_SETTINGS` に新フィールドのデフォルト値を追加
- `MODEL_PRESETS` 定数を追加 (balanced / quality_story / budget)
- `AppSettingsScreen` にプリセットセレクター UI を追加。director / smart_reply / summary / image_prompt フィールドも追加
- Supabase migration `20260511160000_add_model_roles.sql` を作成
- 型チェック・ビルドともにエラーなし

## 2026-05-09

### Info Box System

- Info Box 用の session_environment_state / session_character_states を追加。Supabase migration, RLS, grant, trigger を実装。
- AppState に環境/キャラ状態を追加し、Supabase repository の load/save/削除同期へ接続。
- Prompt Builder に短い環境/キャラ状態セクションを追加し、hidden_intent/inner_thoughts を非公開扱いで明示。
- `/api/background` に infoboxUpdate を追加し、既存状態を踏まえた更新と heuristic fallback を実装。
- プレイ画面に Info Box を追加。折りたたみ/展開、コンパクト表示、Debug ON 時のみ hidden_intent/inner_thoughts を表示。

### 触ったファイル

- `src/lib/domain/types.ts`
- `src/lib/ai/types.ts`
- `src/lib/domain/sampleData.ts`
- `src/lib/supabase/repository.ts`
- `src/lib/store/AppStore.tsx`
- `src/lib/promptBuilder.ts`
- `src/lib/ai/conversation/openaiProvider.ts`
- `src/app/api/conversation/route.ts`
- `src/app/api/story/[storyId]/chat/stream/route.ts`
- `src/app/api/background/route.ts`
- `src/components/chat/ChatScreen.tsx`
- `supabase/migrations/20260509120000_add_info_box_states.sql`
- `Docs/AI_TASKS.md`

## 2026-05-11

### 実装タスク6：Story Director / Foreshadowing / Narrative Quality Check 連携強化

- Prompt Builder の STORY DIRECTOR セクションに `stallCount`・`playPaceMode` を明示追加。
- STORY DIRECTOR セクションに `Unresolved Foreshadowing` の一覧（タイトル）と `Previous Quality Problem` を条件付きで追加。
- `/api/quality` の `buildQualityPrompt` にセッションコンテキスト（stallCount, qualityStallCount, playPaceMode, previousQualityProblem）を追加。
- `/api/quality` の requestSchema に `foreshadowingItems` を追加し、プロンプトに未回収伏線タイトル一覧を投入。
- `heuristicQualityCheck` で伏線タイトルの本文出現によって `hasForeshadowing` を判定できるよう改善。
- AppStore の `runQualityCheck` に `foreshadowingItems` 引数を追加し、両呼び出し箇所からシナリオ内の伏線をフィルタして渡す。

### 触ったファイル

- `src/lib/promptBuilder.ts`
- `src/app/api/quality/route.ts`
- `src/lib/store/AppStore.tsx`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npx tsc --noEmit` → エラーなし
- `npx next build` → 全ページ成功
- `/api/quality` エンドポイント実呼び出し → stallCount/playPaceMode/previousQualityProblem/foreshadowingItems を受け取り、OpenAI qualityCheck 正常返答確認

### Prompt Builder 軽量化

- Prompt Builder のシナリオ/ユーザー/キャラ/状況の要約を短縮し、直近会話数と関連ロア/メモリ/伏線の上限を調整。
- Info Box 環境は短い状況として圧縮し、必要最小限のキーのみを投入。
- 伏線プロンプトを簡略化し、提示内容を短縮。
- `story_summaries` の作成間隔を 20〜30 ターンに変更し、要約フォーマットを「現在地/重要イベント/関係性変化/未回収伏線/約束/重要選択/次の目的/{{user}}が話したこと」に更新。

### 触ったファイル

- `src/lib/promptBuilder.ts`
- `src/lib/store/AppStore.tsx`
- `src/app/api/summarize/route.ts`
- `Docs/AI_TASKS.md`

## 2026-05-08

### UI折返しとSSE整理

- NarrationBlock / EventMessage の本文に `break-words` と `overflow-wrap:anywhere` を追加し、長い英数字/URLの横はみ出しを防止。
- AppStore の SSE 受信ロジック（readConversationStream と関連パーサ）を削除し、JSON一括応答の疑似ストリーミングに統一。
- sendTurn の会話 API 失敗時に、送信前の session スナップショットから選択肢と入力可否状態を復元。
- Continue Button を追加し、auto/normal/choice_heavy の各モードで手動続行できるようにした。
- auto 停止時に ChatScreen の表示を待機/入力待ちへ自動更新。

### 触ったファイル

- `src/components/chat/NarrationBlock.tsx`
- `src/components/chat/EventMessage.tsx`
- `src/lib/store/AppStore.tsx`
- `src/components/chat/ChatScreen.tsx`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npm run typecheck`

## 2026-05-07

### 変更内容

- プロジェクト開始時の Markdown 確認を実施。開始時点では既存 MD ファイルなし。
- Supabase スキルを読み、RLS、Storage policy、Data API grants の注意点を確認。
- `npx supabase migration new initial_story_roleplay_schema` でマイグレーションファイルを生成。
- 初期 DB schema、RLS policy、Storage bucket/policy、禁止カテゴリ seed を作成。
- `Docs/AI_CONTEXT.md`, `Docs/AI_TASKS.md`, `Docs/AI_WORKLOG.md` を作成。

### 触ったファイル

- `supabase/migrations/20260506152231_initial_story_roleplay_schema.sql`
- `Docs/AI_CONTEXT.md`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 判断したこと

- ワークスペースが空だったため、Next.js App Router 構成を新規作成する。
- Supabase 実プロジェクト ID が未提供のため、DB への適用確認はまだ行わず、マイグレーション SQL と app-side 接続口を先に作る。
- MVP は localStorage で動作確認可能にし、Supabase 接続時に永続化へ差し替えられるようにする。
- 画像生成は初期状態では mock provider を使い、private/self-hosted backend を接続しやすい interface を先に置く。
- 初期サンプルは完全オリジナルで、過激な内容を含めない。

### 注意点

- 2026-04-28 の Supabase breaking change により、新規 public tables が Data API に自動公開されない可能性がある。マイグレーションでは `authenticated` への明示 GRANT を追加した。
- Storage の画像アップロードは 5MB、jpg/jpeg/png/webp 前提。UI は丸型 crop 風プレビュー。
- NSFW は成人確認と個別トグルを満たした場合のみ有効。禁止カテゴリは NSFW ON でも許可しない。

### 追加変更

- Next.js 16 / React 19 / TypeScript / Tailwind CSS の PWA 土台を作成。
- manifest、service worker、safe-area、100dvh、下部固定入力欄を実装。
- localStorage ベースの MVP ストアを作成し、Supabase 未接続でも動作確認できるようにした。
- provider-agnostic な `ConversationBackend` / `ImageBackend` interface と mock backend を作成。
- 禁止カテゴリの簡易判定を会話 API と画像 API の両方に適用。
- 作成画面のタブ UI、キャラ最大 5 人、ユーザープロフィール、ロアブック、スタイル、イントロ、紹介、設定を実装。
- グループ LINE 風チャット UI、選択肢、自由入力、イベント画像候補、画像生成メニューを実装。
- メモリ候補の承認/却下、保存済みメモリ編集、ギャラリー、コスト設定画面を実装。
- 完全オリジナルの初期サンプル「雨音の航路」を追加。
- npm audit の PostCSS 警告は npm overrides で Next 内部依存も `postcss@8.5.14` に揃え、0 vulnerabilities を確認。
- `npm run typecheck` と `npm run build` が成功。
- `npm run dev -- --hostname 127.0.0.1 --port 3000` をバックグラウンド起動し、`http://127.0.0.1:3000` が HTTP 200 を返すことを確認。

### 追加で触った主なファイル

- `package.json`
- `package-lock.json`
- `next.config.mjs`
- `tsconfig.json`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `public/manifest.webmanifest`
- `public/sw.js`
- `public/icons/icon.svg`
- `src/app/**`
- `src/components/**`
- `src/lib/**`

### 追加判断

- 初期実装では実プロバイダー API キーを要求せず、mock backend で JSON 応答と画像カードを返す。実 API は adapter 追加で差し替える。
- 画像は mock では SVG data URL を返す。Supabase Storage の保存口は migration と upload helper に用意し、実 backend 接続時に `generated-images` bucket へ保存する。
- PWA icon は初期 MVP では SVG icon とした。iOS の厳密なホーム画面検証では PNG apple-touch-icon を追加する余地がある。

### Supabase 実プロジェクト作業

- Project ref `mwmzpwccdcqbepnxoatl` に Supabase MCP で接続。
- remote migration 履歴が空であることを確認。
- `initial_story_roleplay_schema` migration を適用。
- DB に 19 個の public MVP tables が作成され、すべて RLS 有効であることを確認。
- Storage bucket `avatars` と `generated-images` が作成されていることを確認。
- `forbidden_content_rules` に system rule 7 件が seed されていることを確認。
- Auth user 作成時の trigger `on_auth_user_created` が `auth.users` に存在することを確認。
- Supabase security advisor で `public.set_updated_at` の search_path 警告が出たため、`harden_schema_advisor_fixes` migration を作成して適用。
- Supabase performance advisor の unindexed foreign key 指摘に対応する index を追加。
- 再確認で security advisor は 0 件。performance advisor は、データ未投入のため `unused_index` INFO のみ。
- MCP 適用時の remote migration timestamp に合わせ、ローカル migration ファイル名を `20260506160552_initial_story_roleplay_schema.sql` と `20260506160727_harden_schema_advisor_fixes.sql` に変更。
- `.env.local` を作成し、`NEXT_PUBLIC_SUPABASE_URL=https://mwmzpwccdcqbepnxoatl.supabase.co` を設定。Publishable key は Dashboard から取得が必要。

### Supabase Publishable Key 設定

- ユーザー提供の publishable key を `.env.local` の `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` に設定。
- `@supabase/supabase-js` で client 初期化と `auth.getSession()` が成功することを確認。未ログインのため session は null。
- `npm run typecheck` が成功。
- Next dev server を再起動し、`.env.local` が読み込まれていることと `http://127.0.0.1:3000` が HTTP 200 を返すことを確認。

### Supabase CRUD Repository 実装

- Supabase 公式 docs で `auth.getUser()`, `insert/upsert/select`, Storage upload の現行仕様を確認。
- `src/lib/supabase/repository.ts` を追加し、Auth、remote state load、remote seed、state upsert を実装。
- 未ログイン時は localStorage MVP のまま動作し、ログイン済みなら Supabase から state を読み込む構成にした。
- Supabase 側にシナリオが無い新規ユーザーでは、オリジナルサンプル「雨音の航路」をそのユーザーIDで seed する。
- AppStore に remote 状態、匿名ログイン、メール OTP、サインアウト、手動同期、自動 debounce 保存を追加。
- トップ画面と設定画面に `SupabaseAuthPanel` を追加。
- `npm run typecheck` と `npm run build` が成功。
- dev server を再起動し、`http://127.0.0.1:3000` が HTTP 200 を返すことを確認。

### 注意点

- 現時点の repository は upsert 中心。削除したローカル項目を remote から確実に削除する厳密な replace 同期は後続課題。
- 匿名ログインは Supabase Auth 側で anonymous sign-ins が有効な場合に使える。無効な場合はメール OTP を使う。

### Supabase ID 整合と削除同期

- 前回失敗した `align_client_ids_to_text` migration は、RLS policy が対象カラムへ依存していたことが原因だったため、対象 public policy を一時 drop し、型変更後に再作成する構成へ修正。
- Project ref `mwmzpwccdcqbepnxoatl` に `align_client_ids_to_text` migration を適用し、`users.id` は uuid のまま、`scenarios.id`, `messages.id`, `messages.session_id`, `speaker_id`, `usage_logs.id` などが text になったことを確認。
- `usage_logs` も replace 同期で削除可能にするため、own row の DELETE policy `usage_logs_delete` を追加する migration を適用。
- `usage_logs` の upsert が既存 row に当たった場合に備え、own row の UPDATE policy `usage_logs_update` を追加する migration を適用。
- Supabase remote migration timestamp に合わせ、ローカル migration ファイル名を `20260506165401_align_client_ids_to_text.sql`, `20260506165506_allow_usage_logs_replace_sync.sql`, `20260506165813_allow_usage_logs_upsert_update.sql` に変更。
- `src/lib/supabase/repository.ts` に保存前の削除同期を追加。messages / images / memories / sessions / scenario child tables / profiles / usage_logs / scenarios の順で、同一ユーザー scope の remote 差分を削除してから upsert する。
- `npm run typecheck` と `npm run build` が成功。
- dev server を再起動し、`http://127.0.0.1:3000/settings` が HTTP 200 を返すことを確認。

### 触ったファイル

- `supabase/migrations/20260506165401_align_client_ids_to_text.sql`
- `supabase/migrations/20260506165506_allow_usage_logs_replace_sync.sql`
- `supabase/migrations/20260506165813_allow_usage_logs_upsert_update.sql`
- `src/lib/supabase/repository.ts`
- `Docs/AI_CONTEXT.md`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 注意点

- Supabase security advisor は schema/RLS 起因の警告なし。Auth の leaked password protection disabled が WARN として残っているため、Dashboard 側で有効化する。
- Performance advisor は空 DB のため unused index INFO が出ている。実データ投入後に改めて確認する。

### 画像生成ジョブとチャット UI 修正

- 画像生成トリガーを `manual`, `major_event`, `chapter_start`, `special_branch` のみに制限。
- `image_generation_jobs` の trigger check constraint に `special_branch` を追加。
- `gallery_items` table を追加し、生成結果を `generated_images` と `gallery_items` の両方に同期する repository 実装へ変更。
- 生成画像を Supabase Storage の `generated-images` bucket へアップロードし、private bucket 用の signed URL をチャット/ギャラリー表示に使うようにした。
- Supabase 読み込み時に `storage_path` から signed URL を再発行し、期限切れ URL で画像が見えなくなる問題を軽減。
- 画像生成時に `queued` event message を出し、`generating`, `completed`, `failed` へ状態更新。完了時は image message も追加。
- 毎ターン自動生成は行わず、会話 AI の `imageCue` は候補 event message だけを出す方針を維持。
- 選択肢を固定フッターからチャットログ末尾の通常要素へ移動。入力欄だけを下部固定にして、選択肢で会話が隠れないようにした。
- シナリオ一覧の下部余白も増やし、ボトムナビと操作ボタンが重なりにくいよう調整。
- `npm run typecheck` と `npm run build` が成功。
- dev server を再起動し、`http://127.0.0.1:3000/settings` が HTTP 200 を返すことを確認。

### 追加で触ったファイル

- `supabase/migrations/20260506170238_add_gallery_items_and_image_job_trigger.sql`
- `src/app/api/images/generate/route.ts`
- `src/components/chat/ChatScreen.tsx`
- `src/components/chat/ChoiceButtons.tsx`
- `src/components/chat/EventMessage.tsx`
- `src/components/scenario/ScenarioListScreen.tsx`
- `src/lib/domain/types.ts`
- `src/lib/domain/sampleData.ts`
- `src/lib/store/AppStore.tsx`
- `src/lib/supabase/repository.ts`
- `src/lib/supabase/storage.ts`

### 未解決

- Supabase Auth の leaked password protection は DB migration では変更できない。Management API の `PATCH /v1/projects/{ref}/config/auth` には `auth_config_write` 権限の PAT/OAuth が必要。現在の MCP/CLI には該当する設定更新ツールや PAT が無く、Dashboard 確認も in-app browser 側の起動エラーで完了できなかった。

### 会話AI接続実装

- OpenAI 公式ドキュメントで Responses API と Structured Outputs の JSON Schema 利用方針を確認。
- `src/lib/ai/conversation` 配下に provider 抽象、mock provider、OpenAI provider、JSON schema/parser を追加。
- `/api/conversation` を追加し、既存 `/api/chat` は互換 route として `/api/conversation` の `POST` を再利用。
- `OPENAI_API_KEY`, `CONVERSATION_PROVIDER`, `OPENAI_MODEL` を server-only env として `.env.example` と `.env.local` に追加。`NEXT_PUBLIC_` ではないためクライアントには露出しない。
- `CONVERSATION_PROVIDER=openai` または backend id `openai` の場合に OpenAI Responses API を呼び出す。未設定時は `configuration_error` を含む fallback narration を返す。
- Prompt Builder を OpenAI provider に接続し、シナリオ、スタイル、キャラクター、ユーザープロフィール、ストーリー状態、関係値、ロアブック、メモリ、要約、直近ログ、最新入力をプロンプトに含めるようにした。
- NSFW ON/OFF を server-side で判定し、OpenAI provider の developer prompt に反映。NSFW OFF では成人向け描写を禁止し、NSFW ON でも禁止カテゴリを除外する。
- AI出力JSONの parse/validation を追加。失敗時は出力全文を narration にし、アプリが落ちないよう fallback response を返す。
- `usageFromConversation` が response error を `usage_logs.meta.error` に残すようにした。
- AppStore の会話送信先を `/api/conversation` に変更し、関係値、ロアブック、メモリも request に含めるようにした。
- `npm run typecheck` と `npm run build` が成功。
- dev server を再起動し、`http://127.0.0.1:3000/settings` が HTTP 200 を返すことを確認。
- `/api/conversation` に mock provider payload を POST し、narration, characterMessages, suggestedReplies, relationshipDelta, memoryCandidates, imageCue, usage が返ることを確認。
- OpenAI provider 指定かつ `OPENAI_API_KEY` 未設定の payload で、HTTP 200 の fallback narration と `configuration_error` が返ることを確認。

### 追加で触ったファイル

- `.env.example`
- `.env.local`
- `src/app/api/conversation/route.ts`
- `src/app/api/chat/route.ts`
- `src/lib/ai/types.ts`
- `src/lib/ai/conversationBackends.ts`
- `src/lib/ai/conversation/types.ts`
- `src/lib/ai/conversation/provider.ts`
- `src/lib/ai/conversation/mockProvider.ts`
- `src/lib/ai/conversation/openaiProvider.ts`
- `src/lib/ai/conversation/schema.ts`
- `src/lib/store/AppStore.tsx`
- `Docs/AI_CONTEXT.md`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 注意点

- 現在の `.env.local` は `CONVERSATION_PROVIDER=mock` かつ `OPENAI_API_KEY=` 空のため、実OpenAI呼び出しのE2E確認は未実施。キー設定後に `CONVERSATION_PROVIDER=openai` へ変更し、dev server 再起動が必要。
- 画像生成は今回の範囲外のため変更していない。

## 2026-05-07

### OpenAI実接続設定と進行モード追加

- `.env.local` を実 OpenAI provider 用に更新し、dev server を再起動した。APIキーは server-only の `OPENAI_API_KEY` として扱い、クライアントへ露出しない。
- Supabase migration `20260506174755_add_play_pace_modes.sql` を作成し、実プロジェクト `mwmzpwccdcqbepnxoatl` へ適用した。
- `style_settings` に `play_pace_mode`, `auto_advance_message_count`, `choice_frequency` を追加。
- `play_sessions` に `play_pace_mode`, `auto_continue_count` を追加。`needs_user_input` と `auto_continue_allowed` は既存の `story_state` JSON に保存する方針にした。
- 会話 AI 出力へ `timeline`, `needsUserInput`, `autoContinueAllowed` を追加し、旧 `narration` / `characterMessages` 形式も `timeline` に変換できる互換処理を実装した。
- Prompt Builder に `auto`, `normal`, `choice_heavy` の指示を追加した。
- プレイ画面に進行モード切替、オート進行中ラベル、停止/再開、今すぐ入力を追加した。
- AppStore に `continueAutoTurn` と `setSessionPlayPaceMode` を追加し、オート進行は最大 3 回、重要分岐、NSFW突入前、画像候補、予算接近、エラー時に停止するようにした。
- 選択肢多めでもチャットが潰れにくいよう、選択肢エリアを最大高スクロールにした。

### 触ったファイル

- `supabase/migrations/20260506174755_add_play_pace_modes.sql`
- `src/lib/domain/types.ts`
- `src/lib/domain/sampleData.ts`
- `src/lib/ai/types.ts`
- `src/lib/ai/conversation/schema.ts`
- `src/lib/ai/conversation/mockProvider.ts`
- `src/lib/ai/conversation/openaiProvider.ts`
- `src/lib/promptBuilder.ts`
- `src/lib/store/AppStore.tsx`
- `src/lib/supabase/repository.ts`
- `src/components/chat/ChatScreen.tsx`
- `src/components/chat/ChoiceButtons.tsx`
- `src/components/scenario/StyleTab.tsx`
- `Docs/AI_CONTEXT.md`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npm run typecheck` 成功。
- `npm run build` 成功。

## 2026-05-08

### 月村手毬の口調指針追記

- `Docs/` 配下の MD を一通り確認した上で、月村手毬の口調構造（超詳細版）の追記をシナリオデータへ反映した。
- `src/lib/domain/sampleData.ts` の `月村手毬` キャラに対し、`personality` を「自己嫌悪を抱えたプライドの防衛反応」軸に書き換え、`speaking_style` を 5 成分（冷たさ／皮肉／強がり／甘え隠し／目標執着）と否定始まり・丁寧語混在・NG 語尾まで含めた指針に拡張した。
- `sample_dialogues` を初対面、不機嫌、照れ、心配、甘え隠し、電話の理不尽、傷つき、本気、自虐→決意の各シーン例に置き換えた。
- `temari-lore-voice` ロアブックエントリを新設し、口調の核・黄金パターン 5 種・感情別／相手別の出し方・NG パターンを `always_include: true`, `importance: 5`, `related_character_ids: [temariId]` で投入。Prompt Builder の関連ロアブック投入条件で常時組み込まれるようにした。
- 既存ユーザーで `sample-temari-moon-night` シナリオを seed 済みの場合は、新規エントリは reseed が必要。新規ユーザーには `createTemariScenarioState` から自動投入される。

### 触ったファイル

- `src/lib/domain/sampleData.ts`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npm run typecheck` 成功。

### reseed と実プレイ口調確認

- `normalizeState` が `mergeSeededById` で seed lorebook 不在 ID を補完するため、既存ローカル/Supabase state を持つユーザーでも `temari-lore-voice` が次回ロード時に自動補充されることを確認。手動 reseed は不要。
- 一時的に `src/app/api/debug-temari/route.ts` を作成し、`createSampleState` から手毬シナリオの bundle / session / messages を組み立てて `/api/conversation` 相当のロジックを直接呼び出した。3 シナリオ（自己紹介の選択肢／『ダンス、すごく良かった』の褒め／『顔色悪いよ。少し休んだ方がいい』の心配）で AI 応答の口調を検証。
- `selectedLore` のトップに `月村手毬の口調指針` が常に投入され、`importance: 5 + always_include` のスコアで Slump / SyngUp! より優先されることを確認。
- 検証中、`promptBuilder` の `selectedLore.map(...shorten(lore.content, 260))` で口調指針が 260 文字で切れていた問題を発見。`always_include` のロアブックは 1200 文字まで投入するよう変更（`src/lib/promptBuilder.ts:144`）。
- 修正後の AI 応答例:
  - 褒められた時: 「は？ 勘違いしないで。別に私、戻ってなんかないから」「正直、身体が重くて動きも鈍い。自覚しかないっての」
  - 心配された時: 「顔色？それが何か関係あるの？」「休む？そんな贅沢は必要ない。私はちゃんとやってる」「それ以上、詮索しないで。気持ち悪いです。……必要なら、勝手に見てろ」
- 「は？／勘違いしないで／必要ない／気持ち悪いです／勝手に見てろ」など黄金パターンの語彙が反映されたことを確認。デバッグルートと検証用 JSON は削除済み。
- 既存ユーザーの local/Supabase state は次回起動時に自動 merge されるため、UI 上の reseed 操作は不要。

### 触ったファイル

- `src/lib/promptBuilder.ts` (always_include lore content budget 拡張)
- `Docs/AI_WORKLOG.md`

## 2026-05-08

### 会話ストリーミング / 手毬ルート / 実プレイデバッグ

- `/api/story/{storyId}/chat/stream` を追加し、OpenAI Responses API `stream:true` の出力を NDJSON として読み、app SSE events (`timeline_item`, `choices`, `director_update`, `usage`, `done`, `error`) に変換するようにした。
- `/api/conversation` は非ストリーム互換 route として残し、フロントは stream 失敗時に fallback して疑似ストリーム表示するようにした。
- Prompt Builder をライトノベル風チャットUI向けに更新し、NDJSON出力、`dialogue` の `\n` 区切り、入力種別別の `{{user}}` 描写ルール、直近会話最大15件、section別 token 概算ログを追加した。
- チャットUIに typing indicator、入力無効化、選択肢の遅延表示、画面/ボタンによる skip、タイマー/Abort cleanup を追加した。
- ナレーション全幅表示、行動/台詞の改行表示、選択肢由来のAI生成 `{{user}}` 右寄せ `✦` 表示を追加した。自由入力/オートではAI生成 user bubble を破棄する。
- サンプルシナリオ「ぎゅっとしてよ、月の夜に」を追加した。月村手毬ルート用のロアブック、intro、Story Director acts、伏線、初期選択肢を含む。
- 実プレイで見つかった `planned` 伏線への `reinforce` 更新警告を修正した。planned に reinforce が来た場合は初回導入として `introduced` に補正し、背景解析プロンプトにも planned は `introduce` を使うよう明記した。

### 触った主なファイル

- `src/app/api/story/[storyId]/chat/stream/route.ts`
- `src/app/api/conversation/route.ts`
- `src/app/api/background/route.ts`
- `src/lib/ai/types.ts`
- `src/lib/ai/conversation/modelSelection.ts`
- `src/lib/ai/conversation/openaiProvider.ts`
- `src/lib/ai/conversation/mockProvider.ts`
- `src/lib/promptBuilder.ts`
- `src/lib/store/AppStore.tsx`
- `src/lib/domain/sampleData.ts`
- `src/components/chat/ChatScreen.tsx`
- `src/components/chat/CharacterBubble.tsx`
- `src/components/chat/UserBubble.tsx`
- `src/components/chat/NarrationBlock.tsx`
- `Docs/AI_CONTEXT.md`
- `Docs/AI_TASKS.md`
- `Docs/BUGS.md`
- `Docs/ARCHITECTURE.md`
- `Docs/API_PROVIDERS.md`
- `Docs/STORY_SYSTEM.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npm run typecheck` 成功。
- `npm run build` 成功。
- `/api/story/test-story/chat/stream` へ直接POSTし、`timeline_item`, `choices`, `director_update`, `usage`, `done` のSSEを確認。
- `/api/conversation` へ直接POSTし、非ストリーム fallback 用の `timeline` / `suggestedReplies` / token usage を確認。
- Playwrightで `http://127.0.0.1:3000` を実操作し、年齢ゲート、シナリオ一覧、手毬ルート開始、SSE会話、自由入力、選択肢多め、スキップ、画像生成、ギャラリー、メモリ、設定、未回収伏線リストを確認。
- 画像生成は `/api/images/generate` が 200 を返し、チャット内ジョブ表示、生成結果、ギャラリー表示まで確認。
- 最終実プレイ後の browser console は Errors 0 / Warnings 0。`/api/story/sample-temari-moon-night/chat/stream`, `/api/background`, `/api/quality` は 200。

### timeline疑似ストリーミング設定

- JSON一括応答の疑似ストリーミング表示に統一し、SSEストリーム経路は未使用のまま維持。
- `timeline_reveal_enabled` / `timeline_reveal_speed` を AppSettings と DB に追加。
- timeline表示完了後に選択肢を表示し、スキップで残りを即時表示。
- 速度は slow=800ms / normal=500ms / fast=250ms / instant=0ms。
- 設定画面に表示セクションを追加。

### 触ったファイル

- `src/lib/store/AppStore.tsx`
- `src/components/settings/AppSettingsScreen.tsx`
- `src/lib/domain/types.ts`
- `src/lib/domain/constants.ts`
- `supabase/migrations/20260508120000_add_timeline_reveal_settings.sql`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- 未実行（ローカルでの動作確認はこれから）。

## 2026-05-07

### Prompt Builder トークン削減と構造化サマリー

- Prompt Builder の直近会話投入を最大20件に制限し、古い会話は `story_summaries` の構造化サマリーとして投入するようにした。
- `/api/summarize` を追加し、15ターン超過後に古い5ターン分を安価モデルで非同期サマリー化する流れを追加した。
- サマリーは「起きた出来事」「決まったこと・約束」「感情・関係の変化」「{{user}}が話したこと」「未解決のこと」を含む構造化形式にした。
- ロアブックは現在シーン、登場キャラ、直近会話、ユーザー最新入力のキーワード一致があるものだけ投入し、0件ならセクションを省略する。
- メモリはキャラ名一致/キーワード一致を使いつつ、importance medium/high と明示ユーザー情報を保護して削らない方針にした。
- `/api/background` の伏線投入も active status と high importance / 現在登場キャラ関連に絞った。
- `usage_logs.latency_ms` を追加し、会話・背景解析・品質チェック・サマリー生成のクライアント観測レイテンシを usage log に保存するようにした。
- Supabase project `mwmzpwccdcqbepnxoatl` に migration `add_story_summary_ranges_and_latency` を適用し、対象カラムを確認した。

### 触ったファイル

- `src/lib/promptBuilder.ts`
- `src/lib/ai/types.ts`
- `src/app/api/conversation/route.ts`
- `src/app/api/background/route.ts`
- `src/app/api/summarize/route.ts`
- `src/lib/store/AppStore.tsx`
- `src/lib/domain/types.ts`
- `src/lib/domain/sampleData.ts`
- `src/lib/supabase/repository.ts`
- `supabase/migrations/20260507110255_add_story_summary_ranges_and_latency.sql`
- `Docs/AI_CONTEXT.md`
- `Docs/STORY_SYSTEM.md`
- `Docs/API_PROVIDERS.md`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npm run typecheck` 成功。
- `npm run build` 成功。
- Supabase `information_schema.columns` で `story_summaries.start_turn_index`, `story_summaries.end_turn_index`, `story_summaries.updated_at`, `usage_logs.latency_ms` を確認。
- `npm run build` 成功。

## 2026-05-07

### AI応答のクリティカルパス分離

- メイン会話AIの出力を `timeline`, `suggestedReplies`, `directorUpdate` に絞り、Prompt Builder と OpenAI structured output schema を軽量化した。
- `memoryCandidates`, `relationshipDelta`, `imageCue`, `foreshadowingUpdates` は新設 `/api/background` でメイン表示後に非同期処理するようにした。
- `/api/quality` は既存の3ターンサンプリング非同期処理として維持し、メイン応答には品質採点を要求しない方針にした。
- フロントではメイン応答を先にチャットへ反映し、バックグラウンド結果はメモリ候補、関係値、伏線更新、画像候補イベント、usage log に後追いで保存する。失敗時は `console.warn` のみ。
- `Docs/API_PROVIDERS.md` を追加し、会話/バックグラウンド/品質/画像APIの役割を短く整理した。

### 触ったファイル

- `src/lib/promptBuilder.ts`
- `src/lib/ai/types.ts`
- `src/lib/ai/conversation/schema.ts`
- `src/lib/ai/conversation/openaiProvider.ts`
- `src/lib/ai/conversation/mockProvider.ts`
- `src/app/api/background/route.ts`
- `src/lib/store/AppStore.tsx`
- `Docs/API_PROVIDERS.md`
- `Docs/AI_CONTEXT.md`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 判断したこと

- `ConversationResponse` は既存UI互換のため全フィールドを残し、parser 側で欠落フィールドを既定値に補完する。
- 伏線の `turns_since_introduced` はメイン応答反映時に1回だけ進め、バックグラウンドの伏線更新反映では二重加算しない。
- 画像候補がバックグラウンドで出た場合は、イベントメッセージを追加し、オート進行を停止する。

### 確認

- `npm run typecheck` 成功。

## 2026-05-07

### 未回収伏線UI / 非同期品質チェック

- プレイ画面メニューに未回収伏線リストを追加した。
- 表示対象は `planned` / `introduced` / `developing` / `ready` のみで、`revealed` / `discarded` は除外する。
- 伏線リストは `clue_text`, `status`, `importance`, `reveal_readiness` だけを表示し、`hidden_truth` は参照・表示しない。
- `importance >= 4` を High、`reveal_readiness=overdue` を強調表示するようにした。
- `reveal_readiness` 判定を保存時の状態更新に寄せ、`planned=not_ready`, `introduced/developing=warming_up`, `ready=ready`, `ready` かつ `turns_since_introduced >= 20` は `overdue` にした。
- `last_reinforced_at` は AI の `foreshadowingUpdates` で該当伏線に触れたターンに更新するようにした。
- Narrative Quality Check を `/api/quality` として分離し、メイン応答をブロックしないバックグラウンド実行にした。
- 品質チェックは `scene_turn_count + 1` が3の倍数のターンだけ実行し、通常ターンは前回スコアを維持する。
- 品質スコアは 0〜10 に変更し、4以下の場合だけ次ターン改善指示を session に保存する。
- `/api/quality` は設定済みの低コスト会話 provider/model を使い、OpenAI 未設定や provider 非対応時は heuristic fallback する。
- Story Director Debug から qualityScore の直接表示を外し、ユーザーにスコアを直接見せないようにした。

### 触ったファイル

- `src/components/chat/ChatScreen.tsx`
- `src/app/api/quality/route.ts`
- `src/lib/store/AppStore.tsx`
- `src/lib/ai/conversation/schema.ts`
- `src/lib/promptBuilder.ts`
- `Docs/STORY_SYSTEM.md`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npm run typecheck` 成功。
- `npm run build` 成功。
- `ChatScreen.tsx` に `hidden_truth` / `hiddenTruth` の参照がないことを確認。
- ローカル `/api/quality` に `gpt-4.1-nano` で疎通し、0〜10スコアと usage を取得できることを確認。

## 2026-05-07

### 進行モード / 選択肢プロンプト調整

- Prompt Builder のモード別指示を調整し、`auto` / `normal` / `choice_heavy` の体感差が出るよう timeline 数と選択肢数を明記した。
- `auto`: timeline 5〜7、選択肢0〜1、ナレーション多め、自動描写で進める。
- `normal`: timeline 3〜5、選択肢2〜3、キャラ発言とナレーションをバランスよくする。
- `choice_heavy`: timeline 2〜3、選択肢4〜5、各 label に短い結果ヒントを付け、分岐を意識する。
- 選択肢 type は毎回最低2種類使い、`talk` / `action` だけに偏らないよう明記した。
- OpenAI JSON Schema の timeline 上限が4のままだと auto の5〜7ブロックが出せないため、`maxItems` を8へ広げた。

### 触ったファイル

- `src/lib/promptBuilder.ts`
- `src/lib/ai/conversation/schema.ts`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npm run typecheck` 成功。
- `npm run build` 成功。
- Supabase で追加カラムの存在を `information_schema.columns` から確認。
- `/api/conversation` は `openai:gpt-4.1-mini` provider へ到達することを確認。ただし OpenAI API は `insufficient_quota` の 429 を返したため、実AIの正常レスポンス E2E は未完了。アプリ側は fallback narration と `usage_logs.meta.error` で落ちずに扱える。

### 注意点

- OpenAI側の quota/billing を有効にしないと正常系の実AI返信は返らない。
- 画像生成は今回の範囲外のため変更していない。

## 2026-05-07

### スマホ/PWA/RLS 修正

- Supabase が設定済みでも未ログインなら、アバターと生成画像の Storage upload を行わず local fallback するようにした。
- 生成画像 Storage upload は `auth.uid()` とアプリ側 `userId` が一致する場合だけ実行する方針にした。
- PWA icon を SVG だけでなく `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` でも提供するようにした。
- `manifest.webmanifest` と `layout.tsx` を PNG icon 参照へ更新した。
- iOS/Android のキーボード表示に備え、プレイ画面の下部 Composer を `visualViewport` の bottom inset に追従させた。
- チャット吹き出し、ナレーション、system/event、画像 caption に長文折返しを追加し、横スクロールを起こしにくくした。
- Docs 運用を分離し、`PROMPT_GUIDE.md`, `BUGS.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md` を追加した。

### 触ったファイル

- `src/lib/supabase/storage.ts`
- `src/app/layout.tsx`
- `public/manifest.webmanifest`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/apple-touch-icon.png`
- `src/components/chat/ChatScreen.tsx`
- `src/components/chat/CharacterBubble.tsx`
- `src/components/chat/UserBubble.tsx`
- `src/components/chat/SystemMessage.tsx`
- `src/components/chat/NarrationBlock.tsx`
- `src/components/chat/EventMessage.tsx`
- `src/components/chat/ImageCard.tsx`
- `Docs/AI_CONTEXT.md`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`
- `Docs/PROMPT_GUIDE.md`
- `Docs/BUGS.md`
- `Docs/ARCHITECTURE.md`
- `Docs/DEPLOYMENT.md`

### 注意点

- PC がシャットダウンしていてもスマホで遊ぶには Vercel 等の本番 URL が必要。ローカル dev server は PC 停止中には使えない。
- Supabase Auth の leaked password protection は Dashboard 側設定のため、DB migration では修正しない。

### Vercel デプロイ

- Vercel CLI で `ippo-s-projects/aichat-roleplay` を作成し、production deploy を実施した。
- Production URL は `https://aichat-roleplay.vercel.app`。
- Vercel Production env に Supabase URL、Supabase publishable key、`CONVERSATION_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL` を登録した。
- `.vercelignore` を追加し、ローカル `.env` / `.env*.local` をデプロイソースから除外した。
- production URL で `/`, `/manifest.webmanifest`, `/icons/icon-192.png`, `/sw.js` が HTTP 200 を返すことを確認した。

## 2026-05-07

### Auth永続化 / モデル切替 / OpenAI疎通

- Supabase browser client を singleton 化し、`persistSession`, `autoRefreshToken`, `detectSessionInUrl`, `flowType=pkce`, 固定 `storageKey` を設定した。
- 再オープン時のログイン継続を安定させるため、認証ユーザー取得前に `getSession()` を確認し、セッションがある場合だけ `getUser()` を呼ぶようにした。
- `app_settings` に normal/nsfw/cheap/smart conversation と standard/nsfw image の provider/model 設定、smart/低コスト自動切替を追加した。
- `usage_logs` に `provider`, `model`, `image_count` を追加した。
- 設定画面に「モデル設定」を追加し、用途別 provider/model、画像品質/サイズ、低コスト自動切替を編集できるようにした。
- `/api/conversation` で NSFW、重要イベント、低コスト、通常の順に provider/model を選択するようにした。
- `/api/images/generate` で standard/nsfw image provider/model を選択するようにした。実画像生成 provider はまだ mock 中。
- OpenAI の直接 Responses API 疎通と、ローカル `/api/conversation` の実AI正常系を確認した。
- `gpt-4.1-mini` の正常応答と token usage、`gpt-4.1-nano` への低コストモデル切替反映を確認した。
- Prompt Builder は `userProfiles` 欠落などの不完全な API payload でも落ちにくいようにした。

### 触ったファイル

- `supabase/migrations/20260507011606_add_model_provider_settings.sql`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/repository.ts`
- `src/lib/domain/types.ts`
- `src/lib/domain/constants.ts`
- `src/lib/ai/types.ts`
- `src/lib/ai/conversation/provider.ts`
- `src/lib/ai/conversation/openaiProvider.ts`
- `src/lib/ai/conversation/mockProvider.ts`
- `src/lib/ai/conversation/providers/index.ts`
- `src/lib/ai/conversation/providers/openaiProvider.ts`
- `src/lib/ai/conversation/providers/mockProvider.ts`
- `src/lib/ai/conversation/providers/localProvider.ts`
- `src/lib/ai/imageBackends.ts`
- `src/lib/ai/image/providers/index.ts`
- `src/lib/ai/image/providers/mockImageProvider.ts`
- `src/lib/ai/image/providers/runpodProvider.ts`
- `src/lib/promptBuilder.ts`
- `src/lib/store/AppStore.tsx`
- `src/app/api/conversation/route.ts`
- `src/app/api/images/generate/route.ts`
- `src/components/settings/AppSettingsScreen.tsx`
- `Docs/AI_CONTEXT.md`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`
- `Docs/ARCHITECTURE.md`
- `Docs/BUGS.md`
- `Docs/DEPLOYMENT.md`

### 確認

- Supabase migration `20260507011606_add_model_provider_settings` が remote に存在することを確認。
- `information_schema.columns` で `app_settings` と `usage_logs` の追加カラムを確認。
- `npm run typecheck` 成功。
- `npm run build` 成功。
- OpenAI direct Responses API 成功。
- `/api/conversation` 成功。`backend=openai:gpt-4.1-mini`, `provider=openai`, `model=gpt-4.1-mini`, token usage あり。
- 低コストモデル設定を `gpt-4.1-nano` にした request で `backend=openai:gpt-4.1-nano` になることを確認。
- Vercel production deploy 成功。`https://aichat-roleplay.vercel.app` へ alias 済み。
- Production URL で `/`, `/manifest.webmanifest`, `/icons/icon-192.png`, `/sw.js` が HTTP 200。
- Production `/api/conversation` で OpenAI 正常応答、選択肢3件、token usage ありを確認。

### 注意点

- Supabase security advisor の `auth_leaked_password_protection` WARN はまだ残っている。これは DB schema ではなく Auth Dashboard 側設定で、現在の MCP/SQL 操作では有効化できない。
- 本番スマホ利用は Vercel URL を使う。ローカル `127.0.0.1:3000` は PC が動いている間だけ使える。

## 2026-05-07

### Story Director / Foreshadowing / Quality Check

- 追加要件に従い、Story Director Engine、Foreshadowing Manager、Narrative Quality Check を実装した。
- `story_scenes`, `foreshadowing_items`, `narrative_quality_logs` を追加し、`play_sessions` に beat / scene turn / stall / quality / director reason 系のカラムを追加した。
- 既存のクライアントID方針に合わせ、追加テーブルの主要IDと `scenario_id` / `session_id` は text にした。`users.id` は従来通り uuid。
- 会話AI JSON schema に `directorUpdate`, `foreshadowingUpdates`, `qualityCheck` を追加し、mock / OpenAI provider / fallback に接続した。
- Prompt Builder に現在シーン、beat一覧、turn budget、conflict、hook、stall_count、play_pace_mode、関連伏線最大5件、前回quality問題を投入するようにした。
- AppStore で AI 応答後に `scene_turn_count`, `current_beat_index`, `stall_count`, quality log、伏線状態、回収準備度、progress を更新するようにした。
- シナリオ編集に `Story Director` タブと `伏線` タブを追加し、プレイ画面と設定画面に `Story Director Debug` 表示トグルを追加した。
- Supabase project `mwmzpwccdcqbepnxoatl` に migration `20260507015047_add_story_director_foreshadowing_quality` を適用し、追加カラム、RLS、policy を確認した。

### 触った主なファイル

- `supabase/migrations/20260507015047_add_story_director_foreshadowing_quality.sql`
- `src/lib/domain/types.ts`
- `src/lib/domain/sampleData.ts`
- `src/lib/domain/constants.ts`
- `src/lib/ai/types.ts`
- `src/lib/ai/conversation/schema.ts`
- `src/lib/ai/conversation/mockProvider.ts`
- `src/lib/ai/conversation/openaiProvider.ts`
- `src/lib/promptBuilder.ts`
- `src/lib/store/AppStore.tsx`
- `src/lib/supabase/repository.ts`
- `src/components/scenario/ScenarioEditor.tsx`
- `src/components/scenario/StoryDirectorTab.tsx`
- `src/components/scenario/ForeshadowingTab.tsx`
- `src/components/chat/ChatScreen.tsx`
- `src/components/settings/AppSettingsScreen.tsx`

### 確認

- `npm run typecheck` 成功。
- `npm run build` 成功。
- Supabase `information_schema.columns` で追加カラムを確認。
- Supabase `pg_class` / `pg_policies` で `story_scenes`, `foreshadowing_items`, `narrative_quality_logs` の RLS 有効化と policy ありを確認。
- ローカル `/api/conversation` に OpenAI `gpt-4.1-mini` でテストpayloadを投げ、`directorUpdate`, `foreshadowingUpdates`, `qualityCheck` が正常に返ることを確認。

### 注意点

- `npx supabase migration list --local` はローカルDBが起動していないため接続失敗した。remote migration list では適用済みを確認済み。
- `hidden_truth` はシナリオ編集画面では編集できるが、通常プレイ画面とデバッグ表示には出していない。

## 2026-05-07

### MD参照運用の明文化

- 使用トークン節約のため、プロジェクト文脈は assistant memory や長い会話履歴ではなく、リポジトリ内 Markdown を正として参照する方針を明文化した。
- ルートに `AGENTS.md` を追加し、`Docs/` 配下の参照順、再読抑制、`node_modules` など生成/依存ディレクトリの MD を読まないルールを記録した。
- `Docs/PROMPT_GUIDE.md` と `Docs/AI_CONTEXT.md` に同じ運用方針を追記した。

### 触ったファイル

- `AGENTS.md`
- `Docs/PROMPT_GUIDE.md`
- `Docs/AI_CONTEXT.md`
- `Docs/AI_WORKLOG.md`

## 2026-05-07

### 伏線更新ループ堅牢化

- Prompt Builder に「伏線更新がなければ `foreshadowingUpdates: []`」を明記した。
- 関連伏線が0件の場合は `Foreshadowing Manager` セクション自体を省略し、プロンプトトークンを節約するようにした。
- 関連伏線フィルタを、現在シーンの登場キャラに紐づく伏線、未完了 status、high importance 常時投入の条件へ寄せた。
- 現在シーンの登場キャラは直近の character message から推定し、初期ターンだけ intro の登場キャラを fallback にした。
- AIレスポンスで `foreshadowingUpdates` キーが欠落しても、parser 側で空配列として扱うようにした。
- `planned → introduced → developing → ready → revealed` と任意状態 → `discarded` 以外の status 遷移を reject し、`console.warn` だけ出して更新しないようにした。

### 触ったファイル

- `src/lib/promptBuilder.ts`
- `src/lib/ai/conversation/schema.ts`
- `src/lib/ai/conversation/openaiProvider.ts`
- `src/lib/store/AppStore.tsx`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npm run typecheck` 成功。
- `npm run build` 成功。


## 2026-05-11 (Voice / Genre / Budget 拡張)

### 実装内容

- DBマイグレーション 20260511140000: scenario_characters に voice_enabled/style/emotion/auto_play_voice, voice_generation_jobs に storage_path/public_url/latency_ms/emotion, generated_audio テーブル新規作成, memory_usage_logs テーブル新規作成, app_settings に voice_budget_jpy/voice_narration_enabled を追加。
- ElevenLabsProvider 新規実装。ELEVENLABS_API_KEY が設定されていれば自動有効化。コスト約0.0165 JPY/文字。
- 型定義に VoiceResponse.latencyMs, ScenarioCharacter voice設定列, ScenarioCharacterVoiceSettings 型, AppSettings.voice_budget_jpy/voice_narration_enabled を追加。
- GenrePreset を 6→10 種に拡張。description/image_style_preset/voice_style_preset フィールドを追加。
- InfoTab をジャンル詳細カード UI に変更。説明文・ムードタグ・画像/声スタイルを表示。
- PromptTab のキャラ編集に音声設定サブセクションを追加。
- 設定画面にナレーション音声トグルと月間音声予算フィールドを追加。

### 触ったファイル

- supabase/migrations/20260511140000_add_voice_and_memory_tables.sql (新規)
- src/lib/ai/voice/elevenlabsProvider.ts (新規)
- src/lib/ai/voice/types.ts
- src/lib/ai/voice/provider.ts
- src/lib/domain/types.ts
- src/lib/domain/constants.ts
- src/components/scenario/InfoTab.tsx
- src/components/scenario/PromptTab.tsx
- src/components/settings/AppSettingsScreen.tsx
- Docs/AI_TASKS.md
- Docs/AI_WORKLOG.md

### 確認

- npx tsc --noEmit → エラーなし
- npx next build → 全ページビルド成功

## 2026-05-11 (Smart Reply+ / Image preset / Budget 5000円)

### 実装内容

- **SmartReplies 分離** (StoryChoices と Smart Replies を別フィールドへ)
  - `ConversationResponse.smartReplies: string[]` を追加。
  - `conversationOutputSchema` / `conversationJsonSchema` に `smartReplies` (最大3件) を追加。
  - `mockProvider` の2か所に `smartReplies: []` を追加してコンパイルエラーを修正。
  - `parseConversationJson` と `fallbackFromRawText` に `smartReplies` を引き継ぎ。
  - promptBuilder の choiceRule を更新: suggestedReplies=Story分岐、smartReplies=自然文候補として説明を分離。
  - AppStore に `currentSmartReplies: string[]` 状態を追加。sendTurn / continueAutoTurn 完了後に設定。
  - ChatScreen にSmart Replyチップ UI追加。Composer上のpill chip、クリックでdraft挿入、busy中/入力中は非表示。

- **ImageGenerationJob 型拡張**
  - `quality_preset`, `style_preset`, `negative_prompt`, `width`, `height`, `steps`, `cfg_scale`, `sampler`, `model_name`, `lora_json`, `upscale_enabled`, `seed`, `latency_ms` を追加。
  - `ImageQualityPreset` ("draft" | "standard" | "high" | "ultra") 型を追加。
  - `ImageStylePreset` ("anime" | "visual_novel" | ...) 型を追加。

- **UsageLog 型拡張**
  - `kind` に `"smart_reply"` / `"summary"` を追加。
  - `output_chars`, `quality_preset` フィールドを追加。

- **DBマイグレーション** (`20260511150000_add_image_job_quality_and_usage_kinds.sql`)
  - `image_generation_jobs` に quality/style/params 列を追加。
  - `usage_logs` に `output_chars`, `quality_preset` 列を追加。
  - `usage_logs_kind_check` を再作成して smart_reply / summary を許可。

- **予算DEFAULT更新** (`src/lib/domain/constants.ts`)
  - `monthly_budget_jpy: 5000`, `conversation_budget_jpy: 3500`, `image_budget_jpy: 1200`, `voice_budget_jpy: 0`

### 触ったファイル

- `src/lib/ai/types.ts`
- `src/lib/ai/conversation/schema.ts`
- `src/lib/ai/conversation/mockProvider.ts`
- `src/lib/promptBuilder.ts`
- `src/lib/store/AppStore.tsx`
- `src/lib/domain/types.ts`
- `src/lib/domain/constants.ts`
- `src/components/chat/ChatScreen.tsx`
- `supabase/migrations/20260511150000_add_image_job_quality_and_usage_kinds.sql` (新規)
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npx tsc --noEmit` → エラーなし
- `npx next build` → 全ページビルド成功

## 2026-05-13 (ロアブック/プロットUI追補 + 作品詳細ページ)

### 実装内容

- ロアブック編集を `ロア情報 / プロットを連動 / 設定` の3タブへ再整理し、ロア情報タブ内にロア項目CRUDを統合した。
- ロア項目にカンマ区切りキーワード、関連キャラクター、重要度、常時参照、hidden扱い、AIだけが知る情報、ネタバレ/伏線扱いの入力導線を追加した。
- ロアブック側からプロット連動を追加/解除/有効化できる `プロットを連動` タブを実装した。
- プロット編集を `プロンプト / ロアブック / スタイル / イントロ / 紹介 / 設定` のスマホ横スクロールタブへ整理した。
- イントロ編集に `ナレーター / ユーザー` プレビューを追加し、開始時の見え方を確認できるようにした。
- 作品詳細ページ `/scenarios/[scenarioId]` を追加し、カバー、キャラサムネ、タグ、状況、関係性、世界観、主人公プロフィール、キャラ詳細、チャット風イントロ、固定トーク開始/続行ボタン、ブックマークを実装した。
- Prompt Builder の関連ロア選別を、キーワード一致だけでなく active character 関連と重要度5も候補に入れるよう強化した。hidden_truth は本文用プロンプト投入前に空文字化する既存方針を維持。
- scenarios に `cover_image_url` を追加する migration `20260513090000_add_scenario_detail_cover.sql` を作成した。

### 触ったファイル

- `src/components/lorebook/LorebookEditor.tsx`
- `src/components/scenario/ScenarioEditor.tsx`
- `src/components/scenario/ScenarioDetailScreen.tsx`
- `src/components/scenario/ScenarioListScreen.tsx`
- `src/components/scenario/InfoTab.tsx`
- `src/components/scenario/IntroTab.tsx`
- `src/components/scenario/SettingsTab.tsx`
- `src/components/scenario/LorebookTab.tsx`
- `src/components/scenario/formControls.tsx`
- `src/lib/domain/types.ts`
- `src/lib/domain/sampleData.ts`
- `src/lib/store/AppStore.tsx`
- `src/lib/supabase/repository.ts`
- `src/lib/promptBuilder.ts`
- `src/app/scenarios/[scenarioId]/page.tsx`
- `supabase/migrations/20260513090000_add_scenario_detail_cover.sql`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npm run typecheck` → エラーなし。
- `npm run build` → 全ページビルド成功。
- `npm run lint` → package.json に lint script が無いため実行不可。
- Playwright mobile check → 作品詳細→トーク開始、プロット編集タブ、ロアブック作成/項目追加/連動/解除の3テストが成功。
- dev server → `http://127.0.0.1:3000` で起動確認。

### 注意点

- `20260513090000_add_scenario_detail_cover.sql` は作成のみ。Supabase 実DBへの適用は未実施。
- 作品詳細ページのブックマークは現状ローカル状態に保存される。Supabase同期が必要なら専用テーブル追加が次作業。

## 2026-05-13 (レビュー指摘修正)

### 実装内容

- `20260512210000_add_lorebook_system.sql` の `lorebooks.id`, `lorebook_entries.lorebook_id`, `plot_lorebook_links.id/plot_id/lorebook_id` を text ID 方針へ修正した。
- `lorebooks` / `plot_lorebook_links` に authenticated 向け `grant select, insert, update, delete` を追加した。
- Supabase lorebook 同期で missing table (`42P01` / `does not exist`) だけを後方互換スキップし、それ以外は throw して remote save failure に出すようにした。
- Supabase remote load 時、localStorage にある `bookmarkedScenarioIds` を remote state に merge して保持するようにした。
- Prompt Builder の lore 選別を修正し、`always_include` を maxItems 内で先に確保してから残り枠を関連スコアで埋めるようにした。
- `LorebookTab` の render 中 `links.sort` を `[...links].sort` に変更した。
- 作品詳細ページの cover fallback が生成済み NSFW / blur 対象画像を拾わないようにした。
- `.claude/` を `.gitignore` に追加した。

### 確認

- `npm run typecheck` → 成功。
- `npm run build` → 成功。
- Playwright inline check → 作品詳細表示、SFW cover fallback、ロアブック作成/項目追加/保存、プロット連動/解除が成功。

## 2026-05-13 (チャットスクロール中の補助アクション折りたたみ)

### 実装内容

- ChatScreen にスクロール状態管理を追加し、チャット本文の内部スクロール領域で最下部から 96px 以内かどうかを判定するようにした。
- 最下部にいる時だけ Story Choices、Smart Reply、Continue Button、画像生成メニュー、イベント画像生成候補を表示するようにした。
- 過去ログを読んでいる時は補助アクションを隠し、固定下部パネル上に `↓ 最新へ` / `新着あり ↓ 最新へ` ボタンを表示するようにした。
- `↓ 最新へ` 押下時は内部スクロール領域を最下部へ戻し、補助アクションを再表示するようにした。
- 新規メッセージや疑似ストリーミング中の自動スクロールは、ユーザーが最下部にいる場合だけ行い、過去ログ閲覧中は新着表示に留めるようにした。
- 固定下部パネルが展開/折りたたみで高さ変更しても、末尾滞在中の位置がずれないよう補正した。

### 触ったファイル

- `src/components/chat/ChatScreen.tsx`
- `src/components/chat/Composer.tsx`
- `src/components/chat/MessageList.tsx`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npm run typecheck` → 成功。
- `npm run build` → 成功。
- `npm run lint` → package.json に lint script がないため実行不可。
- Playwright mobile check → 390x844 幅で、最下部では選択肢/続き/画像生成ボタンが表示、上スクロール中は非表示、`↓ 最新へ` で最下部復帰と再表示が成功。

### 注意点

- 会話生成 provider / mockProvider 方針には触っていない。
- 既存の 3000 番 dev server で確認した。3001 番は同一ディレクトリの Next dev 多重起動制限により使用しなかった。

## 2026-05-14 (チャットスクロール UX レビュー指摘修正)

### 実装内容

- 自由入力送信時、送信前に最下部だった場合だけ `scrollToBottom` するよう変更した。過去ログ閲覧中に Composer から送信しても、スクロール位置を維持する。
- メッセージ追加検知を `messageCountRef` で管理し、`busy` の切り替わりだけでは `hasNewMessagesBelow` を立てないようにした。
- スクロールイベント中の `setScrollState` は、`isAtBottom / isUserScrollingHistory / hasNewMessagesBelow` が変わらない場合に同じ state を返すようにして再レンダーを抑えた。

### 触ったファイル

- `src/components/chat/ChatScreen.tsx`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npm run typecheck` → 成功。
- `npm run build` → 成功。
- `npm run lint` → package.json に lint script がないため実行不可。
- Playwright mobile check → 390x844 幅で、過去ログ閲覧中に自由入力を送信しても `scrollTop` は 0 のまま、`↓ 最新へ` が表示され、最下部へ勝手に移動しないことを確認。

### 注意点

- 確認では `/api/conversation` を強制 500 にして、ユーザー発話追加後もスクロール追従しないことを検証した。実AI応答の内容生成 provider には触っていない。

## 2026-05-14 (Agentmemory 運用導入)

### 実装内容

- `AGENTS.md` に Agentmemory の扱いを追加した。Docs を正式な作業記録・仕様ソースとし、Agentmemory は補助記憶としてだけ使う。
- `Docs/PROMPT_GUIDE.md` に、作業開始時は必須 Docs を読んだ後で Agentmemory を検索する手順を追加した。
- `Docs/AI_CONTEXT.md` に Agentmemory 運用セクションを追加し、作業中/終了時の保存基準と保存禁止事項を明文化した。
- Agentmemory へ保存する内容は、重要な設計判断、非自明なバグ原因、環境依存の注意点、未解決問題に限定する方針にした。
- APIキー、秘密情報、個人情報、一時的な検証メモ、テストデータは Agentmemory に保存しない方針にした。
- Agentmemory 本体を導入した。`iii` runtime v0.11.2 を `%USERPROFILE%\.local\bin\iii.exe` に配置し、`@agentmemory/agentmemory` v0.9.12 のローカルサーバー起動を確認した。
- Codex global config `~/.codex/config.toml` に `[mcp_servers.agentmemory]` を追加した。
- Project root に `.mcp.json` を追加し、Claude Code 互換の MCP 設定も置いた。
- `package.json` に `agentmemory`, `agentmemory:status`, `agentmemory:doctor` scripts を追加した。
- Agentmemory に初期メモリを保存した: Docs優先/Agentmemory補助方針、導入構成、lint script 欠如、未適用 Supabase migration 注意点。
- `POST /agentmemory/smart-search` で保存済みメモリが検索できることを確認した。
- Agentmemory のローカルDBとして生成された `data/` を git 管理しないよう `.gitignore` に追加した。

### 触ったファイル

- `AGENTS.md`
- `.mcp.json`
- `.gitignore`
- `package.json`
- `Docs/PROMPT_GUIDE.md`
- `Docs/AI_CONTEXT.md`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npm run agentmemory:status` → 成功。Agentmemory v0.9.12 connected / healthy。
- `npm run agentmemory:doctor` → サーバー/health/viewer は OK。LLM provider / embedding provider / graph / consolidation は未設定のため NG（意図通り、秘密情報やAPIキーは追加していない）。
- `POST /agentmemory/remember` → 初期メモリ保存成功。
- `POST /agentmemory/smart-search` → 保存済みメモリ検索成功。
- ドキュメント・設定・script 変更のみ。typecheck/build は未実行。

### 注意点

- Agentmemory MCP 設定は追加済みだが、現在の Codex セッションに新しい MCP tools が即時追加されるとは限らない。次回セッション/再起動後に `agentmemory` tools が見える想定。
- 現状は LLM/embedding provider key 未設定のため BM25-only / noop provider。秘密情報を勝手に追加しない方針を維持する。

## 2026-05-14 (Zeta風タイプライター表示 + スクロール連携)

### 実装内容

- 既存の timeline 疑似ストリーミングを、メッセージ単位の遅延追加から本文タイプライター表示へ変更した。
- AI応答JSONを受け取ったあと、各 timeline item を空本文で追加し、character / narration / event / system / AI生成user の本文を設定速度に応じて段階更新するようにした。
- 表示完了までは `sendTurn` / `continueAutoTurn` / `sendSilentContinue` が resolve しないため、Composer 送信、Story Choices、Smart Reply、Continue Button、画像生成補助アクションは既存 `busy` とスクロール制御で非表示/disable のままになる。
- スキップボタンで現在 item と残り timeline を即時表示し、最終的な state.messages には通常の Message だけを残すようにした。
- 最下部にいる場合は文字増加ごとに内部スクロールを末尾へ維持し、過去ログ閲覧中は文字増加で勝手に戻さないよう ChatScreen の content-length 監視を追加した。
- チャット本文エリア全体の pointer down で skip する挙動を外し、ストリーミング中でも過去ログをスクロールしやすくした。
- AppSettings に `streaming_display_enabled`, `typewriter_enabled`, `typewriter_speed`, `real_streaming_enabled`, `streaming_fallback_enabled`, `show_skip_button` を追加し、設定画面の表示セクションから操作できるようにした。
- `usage_logs.meta` に streaming/typewriter 設定、生成レイテンシ、reveal時間、skip有無を記録するようにした。
- `supabase/migrations/20260514090000_add_streaming_display_settings.sql` を作成した。
- 実プレイ中に OpenAI Structured Outputs schema の `smartReplies` required 不整合を発見し、`intent/tone/agency` を required + nullable 出力に合わせて修正した。
- OpenAIが `romanceLevel: 0.5` のような小数を返すケースで Zod validation fallback になるため、`romanceLevel` / `intimacyLevel` は 0-5 の number として受けるよう修正した。
- OpenAI JSON が `max_output_tokens` で途中切れした場合に raw JSON が本文表示されないよう、parse/validate 失敗時の JSON風payloadフォールバック文言を安全な日本語メッセージに変更した。
- 通常 OpenAI provider と既存 stream route の `max_output_tokens` を low_cost 1400 / normal 2200 に増やした。

### 触ったファイル

- `src/lib/store/AppStore.tsx`
- `src/components/chat/ChatScreen.tsx`
- `src/components/settings/AppSettingsScreen.tsx`
- `src/lib/ai/conversation/schema.ts`
- `src/lib/ai/conversation/openaiProvider.ts`
- `src/app/api/story/[storyId]/chat/stream/route.ts`
- `src/lib/domain/types.ts`
- `src/lib/domain/constants.ts`
- `supabase/migrations/20260514090000_add_streaming_display_settings.sql`
- `Docs/AI_TASKS.md`
- `Docs/AI_WORKLOG.md`

### 確認

- `npm run typecheck` → 成功。
- `npm run build` → 成功。
- `npm run lint` → package.json に lint script がないため実行不可。
- In-app browser / dev server `http://127.0.0.1:3000`: フレッシュセッションで選択肢送信後、応答待ち中はスキップ表示 + 補助アクションdisabled、応答受信後に本文が段階表示、完了後に選択肢/Smart Replyが再表示されることを確認。
- In-app browser: スキップ押下後、応答確定時に残りtimelineが即時表示され、busy解除と選択肢再表示が行われることを確認。

### 注意点

- Phase 1 のフロント側タイプライター表示を安定化した。Phase 2 のフロント側 SSE/NDJSON 接続はまだ未実装。
- 既存 backend route `/api/story/[storyId]/chat/stream` は存在するため、次回は `real_streaming_enabled` 時に AppStore からこの route を読み、失敗時に `/api/conversation` + typewriter へ fallback するのが自然。
- `20260514090000_add_streaming_display_settings.sql` は作成のみで、Supabase 実DBへの適用は未実施。
- 実プレイ確認で使ったローカルブラウザ状態には、修正前の raw JSON fallback メッセージが残っている可能性がある。コード上は以後 raw JSON 風payloadを本文に出さないよう修正済み。
