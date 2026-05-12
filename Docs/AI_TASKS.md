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

## 後続課題 (Choice Learning)

- [ ] Supabase に 20260512200000 マイグレーションを適用する。
- [ ] choice_events / user_choice_preferences の Supabase 同期レイヤーを repository.ts に実装する（現在は localStorage のみ）。
