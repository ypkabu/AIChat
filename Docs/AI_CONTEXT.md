# AI Context

## 目的

個人利用向けのスマホ対応 PWA「ストーリー作成・AI ロールプレイアプリ」を構築する。ユーザーがシナリオ、キャラクター、ロアブック、スタイル、イントロ、プレイ設定を自作し、グループ LINE 風チャット UI で AI と物語を進められることを最優先にする。

## 技術構成

- Frontend: Next.js, TypeScript, Tailwind CSS, App Router
- PWA: manifest, service worker, safe-area, 100dvh, standalone display
- Backend/DB: Supabase Auth, PostgreSQL, Storage
- Deployment: Vercel 想定。PC がシャットダウンしていてもスマホで遊ぶには、ローカル dev server ではなく Vercel 等の常時稼働 URL を使う。
- Conversation/Image: provider-agnostic な抽象化レイヤーを用意し、normal/nsfw と standard/nsfw を切り替える
- Model routing: normal/nsfw/cheap/smart conversation と standard/nsfw image の provider/model を設定画面と `app_settings` で切り替える

## 作業開始時の参照順

プロジェクト文脈は会話履歴や assistant memory / Agentmemory ではなく、リポジトリ内の Markdown を正とする。Agentmemory は補助記憶としてのみ使う。すでに読んだ MD は、変更がない限り再読しない。

1. `Docs/AI_CONTEXT.md`: 常に読む短い概要。
2. `Docs/AI_TASKS.md`: 現在の優先タスクだけ確認。
3. `Docs/BUGS.md`: 不具合対応時だけ確認。
4. `Docs/ARCHITECTURE.md`: DB/Provider/PWA の詳細が必要な時だけ確認。
5. `Docs/AI_WORKLOG.md`: 直近の判断が必要な時だけ末尾を読む。
6. Agentmemory: 利用可能な場合のみ、このプロジェクトに関係する過去の重要判断、未解決問題、環境依存の注意点を検索する。
7. 実装ファイルは関連範囲に絞って読む。大きなファイルは検索してから該当範囲を読む。

ストーリー会話システム関連の作業 → `Docs/STORY_SYSTEM.md` を読め。

## Agentmemory 運用

- Agentmemory は補助記憶。正式な作業記録と仕様は `Docs/` 配下の Markdown と root の `AGENTS.md`。
- 作業開始時は、必要 Docs を読んだ後に Agentmemory を検索する。Docs と矛盾した場合は Docs を優先し、必要なら Docs を更新する。
- 作業中に、新しく判明した重要な設計判断、非自明なバグ原因、環境依存の注意点、未解決問題を Agentmemory に保存する。
- 一時的な検証メモ、テスト用データ、API キー、個人情報、秘密情報は Agentmemory に保存しない。
- 作業終了時は `Docs/AI_TASKS.md` と `Docs/AI_WORKLOG.md` を更新し、プロジェクトルールや設計方針が変わった場合のみ `Docs/AI_CONTEXT.md` を更新する。そのうえで今後のセッションに必要な重要事項だけ Agentmemory に保存する。
- Agentmemory ツールが現在の実行環境で使えない場合は、その旨を簡潔に報告し、Docs を正式記録として作業を続ける。
- このプロジェクトには `.mcp.json` で Agentmemory MCP を設定済み。ローカルサーバーは `npm run agentmemory` で起動し、`npm run agentmemory:status` で確認する。

## 重要ルール

- 18+ 専用アプリとして扱う。
- NSFW は完全オプトイン。成人確認済み、かつ各 NSFW トグル ON の場合だけ有効。
- 画像生成は毎ターン自動ではなく、ユーザーの手動操作、重要イベント、章開始、特別な分岐のトリガーでのみ行う。
- 画像生成は `image_generation_jobs` の非同期ジョブとして `queued`, `generating`, `completed`, `failed` を保持する。
- 生成結果は Supabase Storage の `generated-images` bucket に保存し、`generated_images` と `gallery_items` に記録し、チャットログにも event/image message として表示する。
- 会話バックエンドと画像バックエンドは分離する。
- アプリ側が人格、関係値、メモリ、ストーリー状態を保持し、モデルには生成だけを依頼する。
- 会話 AI にはストリーミング時は NDJSON、非ストリーム fallback 時は JSON 出力を要求する。メイン応答は `timeline`, `suggestedReplies`, `directorUpdate` のみを返させ、関係値、メモリ候補、伏線更新、imageCue、qualityCheck は表示後のバックグラウンド処理へ分離する。
- 会話 AI 出力の主形式は `timeline`。旧 `narration` / `characterMessages` が返る場合も `timeline` に変換して表示・保存する。
- Story Director Engine が scene objective、beat、turn budget、conflict、hook、stall 状態を管理し、自由入力を尊重しつつ3ターン以上の停滞を避ける。
- Foreshadowing Manager は伏線を DB に保存し、`clue_text` と非公開の `hidden_truth` を分ける。`hidden_truth` は reveal 条件を満たすまで通常プレイUIに表示しない。
- Narrative Quality Check は各AI応答の新情報、具体行動、感情変化、伏線、選択圧、前進度を評価し、低品質時は次ターン改善指示として保存する。
- プレイ進行モードは `auto`, `normal`, `choice_heavy`。オートは最大 3 回まで連続生成し、重要分岐、NSFW突入前、画像候補、コスト上限接近時は停止する。
- プレイ会話は server-side route `/api/story/{storyId}/chat/stream` を優先し、失敗時は `/api/conversation` へ fallback する。OpenAI は Responses API の SSE、Anthropic/Claude は Messages API の SSE (`content_block_delta` / `text_delta`) を既存NDJSON解釈器へ流し込む。`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` は server-side env だけから読む。
- バックグラウンド解析は `/api/background`、品質チェックは `/api/quality`。どちらも安価モデルを使い、失敗してもチャット表示を止めない。
- 古い会話は `/api/summarize` で構造化サマリー化し、`story_summaries` に保存して再利用する。直近会話は最大15件を目安にし、記憶・関係性・明示ユーザー情報は削らない。
- 用途別モデル選択は NSFW、重要イベント smart、低コスト、通常の順で行う。API キーは server-side env だけから読む。
- OpenAI provider は非ストリーム時に Structured Outputs の JSON Schema を使い、ストリーム時は Responses API の `stream:true` を SSE/NDJSON に変換する。失敗時は AI出力全文またはエラー文を narration として返し、usage log の meta に error を残す。
- 月 3,000 円以内を目標に、会話予算と画像予算を分離する。

## 禁止カテゴリ

会話と画像の両方に適用する。`forbidden_content_rules` とアプリ内ルールで管理する。

- 非合意・強制・脅迫・性的暴力
- 近親相姦
- 実在人物の性的ディープフェイク
- 人身売買、搾取、性的虐待
- 動物との性的行為
- 違法コンテンツ
- リベンジポルノや非同意の親密画像

## Prompt Builder 順序

1. アプリ全体ルール
2. 禁止カテゴリルール
3. シナリオ基本設定
4. スタイル設定
5. キャラクター設定
6. ユーザープロフィール
7. 現在のストーリー状態
8. 関係値
9. 関連ロアブック
10. 関連メモリ
11. 会話要約
12. 直近会話ログ
13. ユーザー最新入力

毎回すべてを送らず、ロアブック、メモリ、ログは関連分だけに絞る。圧縮はロアブック、古い履歴の構造化サマリー化、low importance メモリの順で行い、medium/high メモリと関係性データは保持する。

## ディレクトリ構成

- `src/app`: Next.js 画面、API route、PWA metadata
- `src/components/chat`: プレイ画面とチャット UI
- `src/components/scenario`: 作成/編集タブ
- `src/components/memory`: メモリ管理
- `src/components/gallery`: 画像ギャラリー
- `src/components/settings`: アプリ設定、成人確認
- `src/components/ui`: 共通 UI
- `src/lib/ai`: 会話/画像バックエンド抽象化
- `src/lib/domain`: 型、初期データ、定数
- `src/lib/store`: MVP 用 localStorage ストア
- `src/lib/supabase`: Supabase client/storage 接続口
- `supabase/migrations`: DB schema
- `Docs`: AI 作業文脈、タスク、作業ログ

## DB 設計概要

必須テーブルは初期マイグレーションに作成する。

- ユーザー/設定: `users`, `app_settings`, `forbidden_content_rules`
- 作成: `scenarios`, `scenario_characters`, `user_profiles`, `lorebook_entries`, `style_settings`, `intro_settings`
- プレイ: `play_sessions`, `messages`, `relationship_states`, `story_flags`, `story_summaries`
- メモリ: `memories`, `memory_candidates`
- 進行管理: `story_scenes`, `foreshadowing_items`, `narrative_quality_logs`
- 画像: `image_generation_jobs`, `generated_images`
- コスト: `usage_logs`

Supabase の 2026-04-28 breaking change により、新規 public tables は Data API に自動公開されない可能性があるため、`authenticated` への明示 GRANT を入れる。公開 schema の全テーブルで RLS を有効化する。

クライアント側は `sample-rain-route` や `msg-...` のような安定した文字列 ID を使うため、Auth に直結する `users.id` と各 `user_id` は uuid のまま維持し、それ以外の主要 entity ID / FK は text とする。

## MVP 方針

Supabase 接続が未設定でもスマホ上でプレイ体験を確認できるよう、localStorage をフォールバックにする。Supabase Auth でログイン済みの場合は remote state を読み込み、保存時は upsert と削除同期で同一ユーザーの remote state を置き換える。

画像やアバターの Storage 保存は、Supabase 設定済みでも未ログインなら local fallback にする。RLS は `auth.uid() = user_id` を前提にし、ログイン済みユーザーの行だけ remote 保存する。
