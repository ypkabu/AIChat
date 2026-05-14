# AI Tasks

## 完了

- [x] 既存 Markdown の確認。開始時点でプロジェクト内の既存 MD はなし。
- [x] Supabase スキル確認。
- [x] Supabase changelog 確認。2026-04-28 の Data API 自動公開 breaking change を設計へ反映。
- [x] 要件整理とディレクトリ構成を `Docs/AI_CONTEXT.md` に記録。
- [x] DB 設計を `Docs/AI_CONTEXT.md` とマイグレーションへ反映。
- [x] Supabase マイグレーションファイル作成。
- [x] Next.js / TypeScript / Tailwind / PWA 土台作成。
- [x] 作成モード MVP。
- [x] グループ LINE 風プレイ画面 MVP。
- [x] provider-agnostic 会話バックエンド抽象化。
- [x] provider-agnostic 画像バックエンド抽象化。
- [x] NSFW オプトイン、成人確認、禁止カテゴリ判定。
- [x] メモリ管理 MVP。
- [x] ギャラリー MVP。
- [x] コストログ/設定画面 MVP。
- [x] 初期サンプルシナリオ 1 件。
- [x] 型チェック、ビルド、依存監査。
- [x] ローカル dev server 起動確認。

## Critical / 現在

- [x] OpenAI API quota/billing 有効化後、実会話AIの正常系 E2E 確認を行う。
- [x] Vercel 本番 URL へデプロイし、PC停止中でもスマホからアクセスできる URL を用意する。
- [ ] スマホ実機からホーム画面追加とプレイ継続を確認する。

## Supabase 接続

- [x] Project ref `mwmzpwccdcqbepnxoatl` へ初期 schema migration を適用。
- [x] Storage bucket `avatars`, `generated-images` を作成。
- [x] 禁止カテゴリ system seed 7 件を投入。
- [x] 全 public MVP tables の RLS 有効化を確認。
- [x] Security advisor が 0 件になるよう修正 migration を適用。
- [x] Performance advisor の unindexed foreign key を修正。残りは空DBの unused index INFO のみ。
- [x] `.env.local` に Supabase URL を設定。
- [x] `.env.local` に Publishable key を設定。
- [x] Supabase 実接続時の CRUD repository 実装。
- [x] Supabase Auth セッション読み込みと localStorage MVP の同期レイヤーを実装。
- [x] 未ログイン時 localStorage、ログイン時 Supabase 保存の二段構えを実装。
- [x] トップ/設定画面に Supabase 保存パネルを追加。
- [x] クライアント側 string ID に合わせる Supabase migration を適用。
- [x] Supabase repository の削除同期を厳密化。
- [x] `usage_logs` の replace/upsert 同期用 RLS policy を追加。
- [x] 画像生成トリガーを manual / major_event / chapter_start / special_branch のみに制限。
- [x] 画像生成を `image_generation_jobs` の queued/generating/completed/failed ジョブとして保存。
- [x] 生成画像を Supabase Storage、`generated_images`、`gallery_items`、チャット event/image message に保存する流れへ変更。
- [x] チャット選択肢を固定フッターからログ内の末尾表示へ移し、会話ログを隠さないように修正。
- [x] 会話AIの provider 抽象を `conversation` 配下へ分離。
- [x] server-side `/api/conversation` route を追加し、既存 `/api/chat` を互換 route にした。
- [x] OpenAI Responses API provider を追加。
- [x] AI出力JSON schema、JSON parse、parse/provider error fallback を追加。
- [x] Prompt Builder を会話AI route に接続。
- [x] usage_logs の meta に AI error を残すように変更。
- [x] `.env.local` を実 OpenAI provider 用に更新し、dev server を再起動。
- [x] Supabase Auth client を永続セッション設定にし、再オープン時もログイン継続できる構成にした。
- [x] `timeline` 形式、旧形式互換変換、`needsUserInput`、`autoContinueAllowed` を会話レスポンスへ追加。
- [x] `auto` / `normal` / `choice_heavy` の進行モードを DB、Prompt Builder、プレイ UI、保存処理へ追加。
- [x] オート進行の最大 3 回停止、重要分岐/NSFW/画像候補/予算接近時停止のアプリ側制御を追加。
- [x] Continue Button を追加し、auto/normal/choice_heavy で手動続行できるようにした。
- [x] 選択肢多めに備え、選択肢エリアを最大高スクロール化。
- [x] 未ログイン時の画像/アバター Storage 書き込みを local fallback にし、RLS エラーを回避。
- [x] iPhone/Android 向けに Composer のキーボード追従、長文折返し、PNG PWA icon を追加。
- [x] Docs を `PROMPT_GUIDE.md`, `BUGS.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md` に分離。
- [x] Vercel Production env を設定し、`.vercelignore` でローカル `.env` を除外。
- [x] 用途別モデル/プロバイダー切替設定を DB、設定UI、会話API、画像API、usage_logs へ追加。
- [x] OpenAI 実APIの正常応答、usage token、低コストモデル切替反映を確認。
- [x] Story Director Engine を追加。scene objective / beats / turn budget / conflict / hook / stall 制御を会話生成、保存処理、デバッグ表示へ接続。
- [x] Foreshadowing Manager を追加。伏線DB、AI foreshadowingUpdates、未回収伏線リスト、回収準備度、hidden_truth 非表示運用を実装。
- [x] Foreshadowing Manager の更新ループを堅牢化。空配列、欠落キー、status遷移バリデーション、関連伏線フィルタを改善。
- [x] プレイ画面メニューに未回収伏線リストを追加。hidden_truth を出さず clue/status/importance/readiness のみ表示。
- [x] Prompt Builder の進行モード差分と選択肢バリエーション指示を強化。
- [x] Narrative Quality Check を追加。3ターンに1回の非同期 `/api/quality`、quality log 保存、低スコア時の次ターン改善指示を実装。
- [x] メイン会話APIを `timeline` / `suggestedReplies` / `directorUpdate` のクリティカルパスへ軽量化し、伏線/メモリ/関係値/imageCue を `/api/background` へ分離。
- [x] Prompt Builder の投入量を削減。直近会話15件、構造化サマリー、選択的ロア/メモリ/伏線投入、section別 token 概算ログ、`usage_logs.latency_ms` 記録を追加。
- [x] Prompt Builder を軽量化。短いシナリオ/状況/ユーザー要約、最大件数の上限、サマリー周期(20〜30ターン)に調整。
- [x] Info Box System を追加。環境/キャラ状態の DB、Prompt Builder 投入、`/api/background` 更新、プレイ画面の折りたたみ表示を実装。
- [x] 会話ストリーミングAPI `/api/story/{storyId}/chat/stream` を追加。OpenAI Responses API `stream:true` をNDJSON/SSEに変換し、非対応時は `/api/conversation` に fallback。
- [x] フロント会話表示を非ストリーム疑似ストリーミングへ統一。入力無効化、typing indicator、スキップ、タイマー/Abort cleanup を実装。
- [x] timeline 疑似ストリーミング設定（timeline_reveal_enabled / timeline_reveal_speed）を追加し、JSON一括応答の逐次表示へ統一。
- [x] sendTurn 失敗時に pending_choices / needs_user_input / auto_continue_allowed を復元する。
- [x] auto 停止時にヘッダー表示を待機/入力待ちへ切替。
- [x] Zeta系ライトノベル風チャットUIを追加。`dialogue` の改行分割、行動/台詞の視覚差、全幅ナレーション、AI生成 `{{user}}` の右寄せ `✦` 表示を実装。
- [x] 月村手毬ルート「ぎゅっとしてよ、月の夜に」をサンプルシナリオとして登録。ロアブック、Story Director acts、伏線、初期選択肢を追加。
- [x] 月村手毬の口調指針（超詳細版）を `temari-lore-voice` ロアブックに `always_include` で投入し、speaking_style と sample_dialogues を黄金パターンに沿って拡充。
- [x] 実プレイデバッグを実施。SSE会話、選択肢多め、スキップ、画像生成、ギャラリー、メモリ、設定、伏線リストをブラウザ操作で確認。
- [x] Story Director / Foreshadowing / Narrative Quality Check の会話生成連携を強化。STORY DIRECTOR セクションに stallCount / playPaceMode / unresolvedForeshadowing / previousQualityProblem を追加。Quality Check API にセッションコンテキストと伏線情報を渡すよう改善。

## Voice / Image / Genre 拡張 (2026-05-11)

- [x] ElevenLabs VoiceProvider 実装。ELEVENLABS_API_KEY 設定時に自動有効化。
- [x] scenario_characters に voice_enabled / voice_style / voice_emotion / auto_play_voice を追加 (migration)。
- [x] voice_generation_jobs に storage_path / public_url / latency_ms / emotion を追加 (migration)。
- [x] generated_audio テーブルを新規作成 (migration)。
- [x] memory_usage_logs テーブルを新規作成 (migration)。
- [x] app_settings に voice_budget_jpy / voice_narration_enabled を追加 (migration)。
- [x] AppSettings 型・DEFAULT_SETTINGS に voice_budget_jpy / voice_narration_enabled を追加。
- [x] ScenarioCharacter 型に音声設定列を追加。VoiceGenerationJob に latency_ms / storage_path / public_url を追加。
- [x] GenrePreset を 10 種に拡張 (romance_school, slow_burn_love, isekai_fantasy, adventure_party, royal_fantasy, academy_battle, dark_romance, mystery, horror, youth)。
- [x] InfoTab をジャンル詳細カード UI に変更。説明文・ムードタグ・画像/声スタイルを表示。
- [x] キャラクターエディタに音声設定 UI（provider / voice_id / model / style / emotion / speed / pitch）を追加。
- [x] 設定画面にナレーション音声トグルと月間音声予算フィールドを追加。

## 後続課題

- [x] Supabase 実プロジェクト ID が提供されたため、マイグレーション適用と advisors 確認を実施。
- [x] Supabase Auth セッションと localStorage MVP の同期レイヤーを実装する。
- [ ] 画像生成バックエンドの private/self-hosted 接続設定 UI を追加する。
- [ ] 画像生成の実プロバイダー adapter を追加する。
- [x] 会話要約の自動生成タイミングを調整する。
- [ ] ロアブック検索をキーワード一致から embedding/全文検索へ拡張する。
- [ ] Supabase Auth の leaked password protection を Dashboard で有効化する。
- [x] `/api/background` の実機プレイ中レイテンシと usage log の増え方を確認する。
- [ ] 長時間プレイで `/api/summarize` のサマリー品質と Prompt Builder の投入トークン減少を確認する。
- [ ] Supabase に 20260511140000 / 20260511150000 マイグレーションを適用する。
- [ ] ELEVENLABS_API_KEY を .env.local と Vercel に設定し、実音声生成を確認する（後回し可）。
- [ ] 予算超過時の音声自動生成 OFF と low_cost_mode 連動を AppStore に実装する。
- [ ] voice_generation_jobs の Storage 保存と audio キャッシュ（同一 message_id の再生成防止）を実装する。

## Multi-Provider Model Routing (2026-05-11)

- [x] AppSettings に director/smart_reply/summary/image_prompt/model_preset フィールドを追加。
- [x] UsageLog に model_role / reason_for_model_selection を追加。
- [x] modelResolver.ts を新規作成。8 ロール優先順位ロジック、重要イベント自動検出を実装。
- [x] AnthropicConversationProvider (claude-sonnet/opus) を raw fetch で実装。
- [x] GoogleConversationProvider (Gemini) を raw fetch で実装。
- [x] provider.ts に anthropic / google ディスパッチを追加。
- [x] costCalc.ts に Claude / Gemini モデルレートを追加。
- [x] /api/conversation, /api/summarize, /api/background, /api/quality を新ロール設定へ接続。
- [x] AppSettingsScreen にプリセットセレクター (Balanced/Quality Story/Budget) と全 8 ロールフィールドを追加。
- [x] Supabase migration 20260511160000_add_model_roles.sql を作成。
- [ ] ANTHROPIC_API_KEY を .env.local と Vercel に設定し、Claude での実会話を確認する。
- [ ] GOOGLE_API_KEY を .env.local と Vercel に設定し、Gemini での実会話を確認する。
- [ ] Supabase に 20260511160000 マイグレーションを適用する。

## Smart Reply+ / Image / Budget 更新 (2026-05-11)

- [x] SmartReplies を ConversationResponse / schema / mockProvider に追加。
- [x] promptBuilder の出力指示に smartReplies の説明（自然文候補）を追加し、suggestedReplies（Story分岐）と明確に分離。
- [x] AppStore に currentSmartReplies 状態を追加し、sendTurn / continueAutoTurn 完了後に設定。
- [x] ChatScreen にSmart Replyチップ UI を追加（Composer上に丸みボタン、クリックでdraft挿入、入力中/busy時は非表示）。
- [x] ImageGenerationJob 型を拡張（quality_preset / style_preset / negative_prompt / width / height / steps / cfg_scale / sampler / model_name / lora_json / upscale_enabled / seed / latency_ms）。
- [x] ImageQualityPreset / ImageStylePreset 型を追加。
- [x] UsageLog.kind に smart_reply / summary を追加、output_chars / quality_preset フィールドを追加。
- [x] migration 20260511150000: image_generation_jobs 拡張列 + usage_logs KIND CHECK 更新。
- [x] DEFAULT_SETTINGS の月間予算を 5,000円（conversation 3500 / image 1200 / voice 0 / reserve 300）に更新。

## Scene Visual Bundle + 「続きを見る」機能 (2026-05-12)

- [x] SceneBackground.tsx: 背景画像 crossfade コンポーネント作成。
- [x] ChatScreen.tsx: SceneBackground 統合、「このシーンを背景画像化」メニューボタン追加。
- [x] AppStore.tsx: upsertSessionVisualState / normalizeExpression / buildSceneBackgroundPrompt ヘルパー追加。
- [x] domain/types.ts: ContinueSuggestion 型追加。
- [x] ai/types.ts: ConversationRequest.inputType に `continue_without_user_speech` 追加、ConversationResponse に `continueSuggestion` 追加。
- [x] schema.ts: continueSuggestionSchema 追加、mustStopAuto 時に available=false を強制。
- [x] promptBuilder.ts: continue_without_user_speech 用 silentContinueRules / buildLatestUserMessage 分岐 / continueSuggestion 出力指示を追加。
- [x] AppStore.tsx: sendSilentContinue useCallback 追加（auto_continue_count < 3 ガード、イベントメッセージ挿入、続きを見るボタン用 currentContinueSuggestion 状態管理）。
- [x] ChatScreen.tsx: handleSilentContinue / 「続きを見る」ボタン UI 追加（choice_heavy 非表示、count>=3 非表示、dynamic label）。
- [x] EventMessage.tsx: `metadata.action === "continue_without_user_speech"` を divider スタイルで表示。
- [x] Docs/VRM_DESIGN_REVIEW.md: Three.js + @pixiv/three-vrm 設計レビュー文書作成（10 セクション）。

## VRM 3Dキャラクター + 体験モード (2026-05-12)

- [x] domain/types.ts: ExperienceMode / VrmExpression / VrmMotion / CharacterControl 型追加。ScenarioCharacter に VRM 全フィールド追加。AppSettings に experience_mode / vrm_* 設定フィールド追加。
- [x] domain/constants.ts: DEFAULT_SETTINGS に experience_mode / vrm_* デフォルト値追加。
- [x] ai/types.ts: ConversationResponse に `characterControl` フィールド追加。
- [x] schema.ts: vrmExpressionSchema / vrmMotionSchema / characterControlSchema 追加、conversationOutputSchema / conversationJsonSchema / parseConversationJson / fallbackFromRawText に characterControl を追加。
- [x] promptBuilder.ts: characterControl 出力指示を buildResponseFormatPrompt に追加。experienceMode 分岐を buildConversationPrompt に追加（girlfriend モードで Story Director の章/Turn Budget/Beat を省略）。
- [x] useVrmModel.ts: GLTFLoader + VRMLoaderPlugin による非同期 VRM 読み込みフック、VRM_EXPRESSION_MAP、resolveExpressionKey を実装。
- [x] VrmViewer.tsx: Three.js WebGLRenderer (alpha:true)、idle breathing / blink / expression blend / motion / look-at / physics toggle のフルアニメーションループを実装。
- [x] AppStore.tsx: currentCharacterControl state 追加、sendTurn / continueAutoTurn / sendSilentContinue に setCurrentCharacterControl を追加。
- [x] ChatScreen.tsx: VrmViewer を dynamic import (ssr:false) で統合、vrm_enabled ゲートで条件表示。
- [x] AppSettingsScreen.tsx: 体験モード切替 UI（AI彼女/物語）および VRM 設定パネル（3D ON/OFF・品質・FPS・シャドウ・物理）を追加。
- [x] PromptTab.tsx: キャラクターエディタに「3Dモデル (VRM)」折りたたみセクションを追加（モデルタイプ・URL・スケール・デフォルト表情/モーション・視線/まばたき/呼吸トグル）。
- [x] 20260512100000_add_vrm_fields.sql: scenario_characters / app_settings へ VRM 列追加マイグレーション作成。
- [x] tsc / next build ともにエラーなし。

## VRM MVP 残実装 (2026-05-12)

- [x] useVrmModel.ts: `loadTimeMs: number | null` をstateに追加。`loadStart = performance.now()` で計測し、ロード完了時に `Math.round(performance.now() - loadStart)` を記録。
- [x] VrmViewer.tsx: `onModelLoaded?: (loadTimeMs: number) => void` prop 追加。vrm が非null になった時点で一度だけコールバック呼び出し。`error` 状態を取り出してエラーメッセージを絶対配置で表示（fallback表示）。
- [x] PromptTab.tsx: `VrmCharacterPreview` コンポーネントを新規追加。dynamic import (ssr:false) で VrmViewer を埋め込み。表情テストボタン4種（neutral/smile/blush/annoyed）、ローカル `previewExpression` state、ロード時間表示を実装。model_type=vrm/glb かつ model_url がある時のみ表示。
- [x] PromptTab.tsx: ライセンスメモ欄（license_note）を VRM セクションに追加。
- [x] tsc / next build ともにエラーなし。

## 3Dモデルパイプライン + Choice Preference Learning (2026-05-12)

- [x] Docs/3D_MODEL_PIPELINE.md 作成: Unity/Blender/VRM変換フロー整理（Route A/B、必要ツール、lilToon→MToon方針、表情4種、スマホ負荷確認、Unity目視確認チェックリスト）。
- [x] domain/types.ts: ChoiceIntent/ChoiceTone/ChoiceAgency/ChoiceStyle/ChoiceProgression/PreferenceStrength union型追加。SuggestedReply にメタデータ8種追加。ChoiceEventRecord/UserChoicePreferences 型追加。AppSettings/AppState 更新。
- [x] domain/constants.ts: DEFAULT_SETTINGS に choice学習設定追加。
- [x] schema.ts: suggestedReplies スキーマ/JSON Schemaにメタデータフィールド追加。
- [x] ai/types.ts: ConversationRequest に choicePreferences 追加。
- [x] promptBuilder.ts: choicePreferences を PromptBuildInput に追加。buildChoicePreferenceSummary でsample_count>=3時にプロンプト注入。
- [x] openaiProvider/anthropicProvider/googleProvider/stream route: buildConversationPrompt に choicePreferences を渡す。
- [x] api/conversation/route.ts: requestSchema に choicePreferences 追加。
- [x] AppStore.tsx: choice選択時の trackChoiceSelection、resetChoicePreferences、指数減衰アルゴリズム (decay=0.9/0.95) を実装。requestPayload に choicePreferences 追加。
- [x] ChoiceButtons.tsx: showDebug prop 追加、Debug ON時に intent/tone/progression 表示。
- [x] ChatScreen.tsx: ChoiceButtons に showDebug 渡す。
- [x] AppSettingsScreen.tsx: 「選択傾向学習」セクション追加（enabled/strength/hints/count/reset）。
- [x] 20260512200000_add_choice_learning.sql: choice_events/user_choice_preferences テーブル migration 作成。
- [x] tsc / next build ともにエラーなし。

## Choice Preference Learning 強化 (2026-05-12)

- [x] schema.ts: suggestedReplies JSON Schema に anyOf enum 制約追加（intent/tone/agency/choiceStyle/progression/riskLevel → 英語 canonical 値を強制）。
- [x] schema.ts: `why` フィールド追加（選択肢推薦理由・debug表示用）。
- [x] domain/types.ts: SuggestedReply に `why?: string | null` 追加。riskLevel を `string | null` に緩める。
- [x] promptBuilder.ts: buildResponseFormatPrompt に choiceMetaRule（intent/tone/agency/choiceStyle/progression 全フィールド説明 + why 説明 + 配分比率ガイダンス）追加。preference_strength / experience_mode に基づく alignPct 計算（30-65%）。
- [x] promptBuilder.ts: buildChoicePreferenceSummary 強化（top3 intent / top2 tone / agency / progression / romance score / story-progress score）。alignment-pct 指示を formatPrompt 側に移動。
- [x] ChoiceButtons.tsx: Debug ON 時に intent/tone/agency/progression + effect deltas (trust/affection/tension) + why を表示。
- [x] Supabase 同期: repository.ts に choice_events / user_choice_preferences load/save 実装済み。
- [x] Supabase: 20260512200000 マイグレーション適用済み。

## SmartReply メタデータ + シナリオスコープ preferences + Lorebook CRUD (2026-05-12)

- [x] SmartReply 型（id/label/intent/tone/agency）を domain/types.ts に追加。
- [x] ai/types.ts: `smartReplies: SmartReply[]` に変更。
- [x] schema.ts: Zod / JSON Schema を SmartReply オブジェクト配列に変更。parseConversationJson でキャスト追加。
- [x] AppStore.tsx: `currentSmartReplies` の型を `SmartReply[]` に変更。
- [x] ChatScreen.tsx: `reply.label` で表示・draft挿入に変更。
- [x] AppState に `scenarioChoicePreferences: Record<string, UserChoicePreferences>` 追加（domain/types.ts）。
- [x] sampleData.ts / normalizeState に `scenarioChoicePreferences: {}` 初期値追加。
- [x] trackChoiceSelection でシナリオ別 preferences を並行更新。
- [x] resetChoicePreferences で `scenarioChoicePreferences: {}` もクリア。
- [x] sendTurn / continueAutoTurn / sendSilentContinue: `scenarioChoicePreferences[scenarioId] ?? global` フォールバック。
- [x] repository.ts: scope="scenario" の preferences を load/save に追加（toDbChoicePreferences に scope/scenarioId 引数追加）。
- [x] repository.ts: TABLES に lorebooks / lorebookLinks 追加。loadAppStateFromSupabase で lorebooks + entries + links + scenario-prefs を取得。buildLorebooks / buildScenarioChoicePreferences ヘルパー追加。
- [x] repository.ts: saveAppStateToSupabase で lorebooks / entries / lorebookLinks / scenario-prefs を upsert（テーブル未適用時 try/catch スキップ）。
- [x] repository.ts: deleteMissingRemoteRows で lorebooks / lorebookLinks の削除同期追加。
- [x] storage.ts: `uploadLorebookCover(file, lorebookId)` 追加（avatars バケット lorebooks/ サブパス）。
- [x] LorebookEditor.tsx: InfoTab にカバー画像アップロード UI 追加（ファイル選択・プレビュー・エラー表示）。
- [x] tsc / next build ともにエラーなし。

## ロアブック・プロット UI 再設計 (2026-05-12)

- [x] supabase/migrations/20260512210000_add_lorebook_system.sql: lorebooks / lorebook_entries 拡張 / plot_lorebook_links / style_settings 拡張 (allow_continue_button / mode_optimization) migration 作成。
- [x] domain/types.ts: LorebookEntryType 型追加。LorebookEntry に lorebook_id / is_hidden / hidden_truth / entry_type 追加。Lorebook / PlotLorebookLink 型新規追加。StyleSettings に allow_continue_button / mode_optimization 追加。StoryBundle に lorebookLinks 追加。AppState に lorebooks / lorebookLinks 追加。
- [x] sampleData.ts: createDefaultStyle に allow_continue_button / mode_optimization デフォルト追加。createSampleState に lorebooks / lorebookLinks 追加。
- [x] repository.ts: loadAppStateFromSupabase に lorebooks / lorebookLinks の空配列追加。
- [x] AppStore.tsx: getBundle に lorebookLinks 追加。saveBundle に lorebookLinks 同期追加。normalizeState に lorebooks / lorebookLinks / StyleSettings 新フィールド正規化追加。AppStoreValue に lorebook CRUD メソッド追加（listLorebooks / createLorebook / saveLorebook / deleteLorebook / addLorebookLink / removeLorebookLink / toggleLorebookLink）。getLinkedLorebookEntries ヘルパー追加。sendTurn / continueAutoTurn / sendSilentContinue に linkedLorebookEntries 追加。
- [x] components/lorebook/LorebookListScreen.tsx: 新規作成。ロアブック一覧、新規作成、削除 UI。
- [x] components/lorebook/LorebookEditor.tsx: 新規作成。タブ式（ロア情報/項目/設定）。LorebookEntry CRUD（種別/キーワード/内容/重要度/always_include/is_hidden/hidden_truth）。
- [x] app/lorebooks/page.tsx: 新規作成。
- [x] app/lorebooks/[lorebookId]/page.tsx: 新規作成。
- [x] components/scenario/LorebookTab.tsx: 連動ロアブック管理 UI に変更（連動中一覧/追加/enabled トグル/解除/シナリオ専用ロアレガシー維持）。
- [x] components/scenario/StyleTab.tsx: allow_continue_button トグル / mode_optimization セレクトを追加。
- [x] components/scenario/PromptTab.tsx: キャラクター上限 5→10 に緩和。
- [x] components/ui/BottomNav.tsx: ロアブック（Library アイコン）ナビ追加（4→5タブ）。
- [x] promptBuilder.ts: PromptBuildInput に linkedLorebookEntries 追加。selectRelevantLore でシナリオ専用 + 連動ロアを結合。hidden_truth を絶対にプロンプトから除外。entry_type ラベルを lore セクションに追加。
- [x] tsc / next build ともにエラーなし。

## 後続課題 (ロアブックシステム)

- [x] Supabase に 20260512210000 / 20260512220000 マイグレーション相当を適用する（lorebooks / plot_lorebook_links テーブル作成、lorebook_entries.lorebook_id 追加、scenario_id nullable化）。
- [ ] ロアブック連動時のエントリーキーワードマッチングを実機でテストする。

## ロアブック/プロット作成UI + 作品詳細ページ追補 (2026-05-13)

- [x] ScenarioEditor の主要タブを `プロンプト / ロアブック / スタイル / イントロ / 紹介 / 設定` に再整理。
- [x] LorebookEditor のタブを `ロア情報 / プロットを連動 / 設定` に変更し、ロア情報タブ内で基本情報 + ロア項目CRUDを編集できるようにした。
- [x] LorebookEntry UI をカンマ区切りキーワード、関連キャラクター、重要度、常時参照、hidden扱い、AIだけが知る情報、ネタバレ/伏線扱いに拡張。
- [x] LorebookEditor にプロット連動タブを追加し、連動中プロット一覧、追加、連動解除、有効/無効トグル、プロット詳細導線を実装。
- [x] IntroTab に `ナレーター / ユーザー` プレビュー切替を追加し、初回ナレーション・キャラ発言をチャット風に確認できるようにした。
- [x] InfoTab にカバー画像URL、ハッシュタグ、連動ロア数、visibility を含む紹介編集UIを追加。
- [x] SettingsTab に 3D表示、Smart Reply、選択傾向学習、保存/表示系設定セクションを追加。
- [x] `/scenarios/[scenarioId]` 作品詳細ページを新規追加。カバー、サムネイル、タイトル、紹介、タグ、状況、関係性、世界観、主人公、キャラ詳細、イントロ、固定トーク開始/続行ボタン、ブックマークを実装。
- [x] ScenarioListScreen に作品詳細ページへの導線を追加。
- [x] Prompt Builder のロア選別条件を強化し、always_include / キーワード一致 / タイトル一致 / active character 関連 / 重要度5を最大件数内で優先するようにした。hidden_truth は引き続きプロンプト投入前に空文字化。
- [x] scenarios に `cover_image_url` を追加する migration `20260513090000_add_scenario_detail_cover.sql` を作成。
- [x] `npm run typecheck` / `npm run build` 成功。
- [x] Playwright mobile check: 作品詳細→トーク開始、プロット編集タブ、ロアブック作成/項目追加/連動/解除が通過。
- [ ] Supabase に `20260513090000_add_scenario_detail_cover.sql` を適用する。
- [ ] 作品詳細ページのブックマークをSupabase同期する場合は専用テーブルを追加する（現状はローカル状態に永続化）。

## レビュー指摘修正 (2026-05-13)

- [x] `20260512210000_add_lorebook_system.sql` の lorebook / plot_lorebook_links ID と FK を client-side string ID 方針に合わせて text に修正。
- [x] 新規 public table `lorebooks` / `plot_lorebook_links` に authenticated 向け明示 GRANT を追加。
- [x] Supabase lorebook save/delete sync で missing table 以外のエラーを握りつぶさず throw するよう修正。
- [x] remote load 後も localStorage の `bookmarkedScenarioIds` を merge して保持するよう修正。
- [x] Prompt Builder の `always_include` ロアを maxItems 内で最優先確保し、残り枠を関連スコアで選ぶよう修正。
- [x] `LorebookTab` の render 中破壊的 `sort` を `[...links].sort(...)` に修正。
- [x] 作品詳細ページの生成画像 fallback で NSFW / blur 対象画像を使わないよう修正。
- [x] `.claude/` を `.gitignore` に追加。
- [x] `npm run typecheck` / `npm run build` 成功。
- [x] 軽い Playwright 確認: 作品詳細表示、SFW cover fallback、ロアブック作成/項目追加/保存、プロット連動/解除が成功。

## チャットスクロール中の補助アクション折りたたみ (2026-05-13)

- [x] ChatScreen に 96px threshold の末尾判定を追加し、スクロール中の状態を `isAtBottom / isUserScrollingHistory / hasNewMessagesBelow` で管理。
- [x] 最下部にいる時だけ Story Choices、Smart Reply、Continue Button、画像生成メニューを表示するよう制御。
- [x] 過去ログを読んでいる時は補助アクションを非表示にし、小さな `↓ 最新へ` ボタンを表示。
- [x] `↓ 最新へ` 押下でチャット本文の内部スクロール領域を最下部へ戻し、補助アクションを再表示。
- [x] 新規メッセージ/疑似ストリーミング中は、最下部にいる場合だけ自動スクロールし、過去ログ閲覧中は `新着あり ↓ 最新へ` 表示に留めるよう調整。
- [x] Composer の画像生成メニューと EventMessage の画像生成候補を補助アクション表示状態に連動。
- [x] 固定下部パネルの高さ変化で末尾判定が外れないよう、末尾滞在中のみスクロール位置を維持。
- [x] Playwright mobile check: 最下部表示、上スクロールで非表示、`↓ 最新へ` で再表示、画像生成メニュー非表示を確認。
- [x] `npm run typecheck` / `npm run build` 成功。
- [ ] `npm run lint` は package.json に lint script がないため未実行。

## チャットスクロール UX レビュー指摘修正 (2026-05-14)

- [x] 過去ログ閲覧中の自由入力送信では `scrollToBottom` を呼ばず、送信前に最下部だった場合だけ追従するよう修正。
- [x] `busy` の切り替わりだけで `hasNewMessagesBelow` が立たないよう、メッセージ件数変化だけを新着判定に使用。
- [x] スクロールイベントごとの `setScrollState` を、値が変わった時だけ state object を返すよう軽量化。
- [x] Playwright mobile check: 過去ログ閲覧中に自由入力を送信しても `scrollTop` が 0 のまま、`↓ 最新へ` 表示に留まることを確認。
- [x] `npm run typecheck` / `npm run build` 成功。
- [ ] `npm run lint` は package.json に lint script がないため未実行。

## Agentmemory 運用導入 (2026-05-14)

- [x] `AGENTS.md` に、Docs を正式記録、Agentmemory を補助記憶として扱う方針を追加。
- [x] `Docs/PROMPT_GUIDE.md` に、作業開始時の Agentmemory 検索と作業終了時の保存方針を追加。
- [x] `Docs/AI_CONTEXT.md` に Agentmemory 運用ルールを追加。
- [x] 保存対象/保存禁止対象を明文化（重要判断・非自明なバグ原因・環境依存注意点は保存、APIキー/秘密/個人情報/一時メモは保存禁止）。
- [x] Agentmemory MCP 設定を追加（Codex global `~/.codex/config.toml` と project `.mcp.json`）。
- [x] `iii` runtime v0.11.2 を `%USERPROFILE%\.local\bin\iii.exe` に導入。
- [x] `package.json` に `agentmemory` / `agentmemory:status` / `agentmemory:doctor` scripts を追加。
- [x] Agentmemory server v0.9.12 起動確認。REST `http://localhost:3111` / viewer `http://localhost:3113`。
- [x] 初期メモリとして、プロジェクトの Agentmemory 運用方針、導入構成、lint script 欠如、未適用 Supabase migration 注意点を保存。
- [x] `smart-search` で保存済みメモリが検索できることを確認。
- [x] Agentmemory のローカルDB `data/` を git 管理しないよう `.gitignore` に追加。
- [ ] LLM/embedding provider key は未設定。現状は BM25-only / noop provider の安全設定で運用する。

## Zeta風タイプライター表示 + スクロール連携 (2026-05-14)

- [x] 既存のメッセージ単位疑似ストリーミングを、timeline item の本文が少しずつ増えるタイプライター表示へ変更。
- [x] character / narration / event / system / AI生成user timelineを、既存の吹き出し・ナレーションブロック内で空本文から段階表示するよう実装。
- [x] `fast / normal / slow / instant` のタイプライター速度を設定に追加し、fast=約12ms/3文字、normal=約24ms/2文字、slow=約48ms/1文字で表示。
- [x] 表示中は `busy` を維持し、Composer送信、Story Choices、Smart Reply、Continue Button、画像生成補助アクションを非表示/disable。
- [x] スキップボタンで現在itemと残りtimelineを即時表示し、二重保存せず通常メッセージとして確定。
- [x] 最下部滞在中は本文の文字増加に合わせて自動スクロールし、過去ログ閲覧中は勝手に最下部へ戻さないよう連携。
- [x] `usage_logs.meta` に streaming/typewriter 設定、生成レイテンシ、reveal時間、skip有無を記録。
- [x] 実プレイ確認中に見つかった OpenAI Structured Outputs schema 不整合を修正（smartReplies item required、romance/intimacy decimal許容）。
- [x] OpenAI通常生成/stream route の `max_output_tokens` を増やし、JSON途中切れ時に raw JSON を本文表示しないフォールバックへ変更。
- [x] app_settings に streaming/typewriter 関連列を追加する migration `20260514090000_add_streaming_display_settings.sql` を作成。
- [x] `npm run typecheck` / `npm run build` 成功。
- [x] In-app browser確認: フレッシュセッションで送信後、応答待ち中は補助アクションがdisabled、応答受信後に本文が段階表示され、完了後に選択肢/Smart Replyが再表示されることを確認。
- [x] In-app browser確認: スキップ押下後、応答確定時に残りtimelineが即時表示され、busy解除と選択肢再表示が行われることを確認。
- [ ] `npm run lint` は package.json に lint script がないため未実行。
- [x] Phase 2 のフロント側 SSE 接続を実装。`real_streaming_enabled` 時は AppStore から `/api/story/[storyId]/chat/stream` を読み、失敗時は `/api/conversation` + typewriter へ fallback する。
- [x] stream route の `choices` / `smart_replies` / `director_update` / `usage` を AppStore 側で反映し、usage meta に `real_streaming_used` / `streaming_fallback_used` / `first_token_latency_ms` を記録。
- [x] Supabase 実DBへ streaming display settings SQL を適用。MCP適用履歴では `add_streaming_display_settings` として記録され、対象列の存在確認済み。
- [x] 画像生成provider設定を改善。クライアント設定が mock のままでも、server-only env `STANDARD_IMAGE_PROVIDER` / `NSFW_IMAGE_PROVIDER` または `STANDARD_IMAGE_BACKEND_URL` / `NSFW_IMAGE_BACKEND_URL` から実providerを解決できるようにした。APIキーはクライアントへ出さない。
- [x] In-app browser確認: `real_streaming_enabled` ON で会話送信後、本文の段階表示、補助アクションdisable、スキップ後の全文確定、選択肢再表示を確認。
- [ ] 現在の `.env.local` では image provider/env URL が未設定または空のため、実画像生成は引き続き mock fallback。実運用には Runpod/ComfyUI の server-only env 設定が必要。

## 続きを見る不具合修正 + 本番3D/画像利用タスク分解 (2026-05-14)

- [x] `続きを見る` が `auto_continue_count >= 3` で止まる問題を修正。手動の沈黙継続は自動進行3回制限とは分離する。
- [x] `sendSilentContinue` が手動継続時に `auto_continue_count` を増やして上限到達させないよう修正。
- [x] `npm run typecheck` 成功。
- [x] `npm run build` 成功。
- [ ] 3Dモデル本番利用: VRMファイルのホスティング先、CORS、ライセンス、スマホ負荷を人間が確認する。
- [ ] 画像生成本番利用: Runpod または ComfyUI の server-only env を本番環境に設定し、生成結果が Supabase Storage に保存されることを手動確認する。

## 手動設定 / スマホ同期差分調査 (2026-05-14)

- [x] 環境変数、Supabase、AI Provider、画像生成Provider、3Dモデル、PWA、デプロイ設定をコードベースから確認。
- [x] `/api/debug/version` を追加し、appVersion / commitHash / buildTime / environment / Supabase project ref末尾を secret なしで確認できるようにした。
- [x] `npm run typecheck` / `npm run build` 成功。
- [ ] `npm run lint` は package.json に lint script がないため未実行。
- [x] 本番Supabaseへ `20260512210000_add_lorebook_system.sql`, `20260512220000_lorebook_entries_nullable_scenario_id.sql`, `20260513090000_add_scenario_detail_cover.sql` 相当を適用/確認済み。lorebooks / plot_lorebook_links / lorebook_entries.lorebook_id / scenarios.cover_image_url は REST で到達確認済み。
- [ ] スマホ版とローカル版の完全同期確認には、本番URLの `/api/debug/version` とローカル `/api/debug/version` の commitHash 比較、PWAキャッシュ削除、Vercel env 確認が必要。

## 手動設定チェックのAI修正対応 (2026-05-14)

- [x] `.env.example` に `GEMINI_API_KEY` と debug metadata env を追加。
- [x] `npm run lint` を追加し、ESLint flat config を導入。既存コードに強く当たる React Compiler 系 rule は現段階では無効化し、lint を実行可能な品質ゲートにした。
- [x] Next.js を `16.2.6` へ更新し、`npm audit --omit=dev` の高severity advisoryを解消。
- [x] PWA service worker cache を `story-roleplay-pwa-v2` に更新し、APIレスポンスをキャッシュしないよう修正。update waiting 時の更新バナーを追加。
- [x] 設定画面に App Version パネルを追加し、version / commit / build / env / Supabase ref末尾 / service worker status / PWA cache clear を表示。
- [x] GLBは現ビューア未対応のため、作成UIでは準備中として選択不可にし、ChatScreen / VrmViewer も VRM のみ対象に修正。
- [x] ScenarioListScreen の日付表示 hydration mismatch を、client mount後に日付描画する形で修正。
- [x] Supabase lorebook migration を冪等化し、将来の適用/再適用に強くした。
- [x] 本番Supabaseの `scenarios.cover_image_url` は REST で存在確認済み。
- [x] 本番Supabaseの `lorebooks` / `plot_lorebook_links` / `lorebook_entries.lorebook_id` を `supabase db query --linked` で適用し、`supabase migration repair --status applied` で `20260512210000` / `20260512220000` を applied に整えた。REST で各対象が HTTP 200 になることを確認済み。

## 本番デプロイ / VRM / Runpod準備 (2026-05-14)

- [x] `AvatarSample_M.vrm` を `public/models/AvatarSample_M.vrm` に配置し、本番URLから `/models/AvatarSample_M.vrm` として配信できるようにした。
- [x] サンプルキャラクターに `model_type: "vrm"` / `model_url: "/models/AvatarSample_M.vrm"` を設定した。
- [x] 新規状態のVRM表示をON、品質をlowにし、スマホ初回確認で重くなりすぎない初期値にした。
- [x] Runpod画像アダプタを、本番Runpod ComfyUIの返却形式（base64 / data URL / image_url / output.message）に対応させた。
- [x] `STANDARD_IMAGE_BACKEND_URL` にRunpod endpoint IDだけを入れても `https://api.runpod.ai/v2/{endpoint}/runsync` に解決できるようにした。
- [x] `npm run typecheck` / `npm run lint` / `npm run build` 成功。
- [x] Vercel production deploy 成功。`https://aichat-roleplay.vercel.app/api/debug/version` が HTTP 200 を返すことを確認。
- [x] 本番URLから `/models/AvatarSample_M.vrm` が HTTP 200 で取得できることを確認。
- [x] 本番 `/settings` で Supabase匿名ログインを試し、Anonymous sign-ins が現在無効であることを確認。
- [ ] Supabase Dashboard にログインし、必要なら Anonymous sign-ins を有効化する。メールリンク運用だけでよい場合はこのままでも可。
- [ ] Runpod側は未ログインのため、APIキー発行・クレジット投入・Serverless ComfyUI endpoint作成は人間のログイン/課金操作後に実施する。
- [ ] Vercel production env に `RUNPOD_API_KEY` / `STANDARD_IMAGE_PROVIDER=runpod` / `STANDARD_IMAGE_BACKEND_URL` を設定する。
- [x] ChatScreen の `↓ 最新へ` / `新着あり ↓ 最新へ` を即時スクロールに変更し、smooth scroll 中の早すぎる再判定で履歴閲覧中へ戻る問題を修正。
- [x] 旧バグで保存済みの raw JSON / provider schema error メッセージを、チャット表示時に短い説明文へ畳むよう修正。データ自体は削除しない。
- [x] `npm test` を `npm run typecheck` に接続し、最低限のテストコマンドを実行可能にした。
- [x] 既存 lint warning 19件を解消し、`npm run lint` が warning 0 / error 0 で通る状態にした。
