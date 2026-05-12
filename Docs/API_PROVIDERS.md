# API Providers

AI API 接続とモデル切替の実装メモ。詳細仕様ではなく、Codex が作業開始時に判断できる短い索引用。

## 会話 API

- プレイ中のメイン会話は `/api/story/{storyId}/chat/stream` を優先する。
- ストリーム非対応、provider不一致、通信失敗時は `/api/conversation` に fallback し、フロント側で疑似ストリーム表示する。
- `/api/conversation` は非ストリーム互換 route として維持する。
- Provider は `src/lib/ai/conversation/provider.ts` から取得する。
- OpenAI 実接続は `src/lib/ai/conversation/openaiProvider.ts`。API key は server-side env `OPENAI_API_KEY` のみ。
- ストリーム route は OpenAI Responses API `stream:true` を使い、モデル出力の NDJSON を app SSE events (`timeline_item`, `choices`, `director_update`, `usage`, `done`, `error`) に変換する。
- メイン応答のクリティカルパスは `timeline`, `suggestedReplies`, `directorUpdate` のみ。
- 互換性のため `ConversationResponse` 型には `memoryCandidates`, `relationshipDelta`, `imageCue`, `foreshadowingUpdates`, `qualityCheck` の既定値を持たせるが、メインAIには生成させない。

## バックグラウンド解析

- `/api/background` はメイン応答表示後に非同期で呼ぶ。
- 安価モデルを使い、`foreshadowingUpdates`, `memoryCandidates`, `relationshipDelta`, `imageCue` を抽出する。
- 失敗時は heuristic fallback を返し、フロント側では `console.warn` のみでプレイ表示を止めない。
- `imageCue` は画像生成そのものではなく、重要イベント/章開始/特別分岐の候補判定だけ。

## 品質チェック

- `/api/quality` は3ターンに1回だけ非同期実行する。
- メイン応答をブロックしない。
- 低スコア時はセッションに改善ヒントを保存し、次ターンの Prompt Builder が軽量な改善指示として読む。

## 会話サマリー

- `/api/summarize` は古い会話5ターン分を構造化サマリーに圧縮する。
- 実行は15ターン超過後のバックグラウンド処理。
- 保存先は `story_summaries`。最大3個を Prompt Builder に投入し、それ以上は古いサマリーを統合する。
- サマリーは出来事、約束、感情/関係、ユーザーが話したこと、未解決事項を必ず含む。

## モデル選択

会話モデル選択順:

1. NSFW会話ON: `nsfw_conversation_provider/model`
2. 重要イベントかつ smart ON: `smart_conversation_provider/model`
3. 低コストONまたは予算不足: `cheap_conversation_provider/model`
4. 通常: `normal_conversation_provider/model`

バックグラウンド解析と品質チェックは cheap → normal の順で provider/model を選ぶ。

## 画像 API

- 画像生成は `/api/images/generate`。
- Provider は `src/lib/ai/image/provider.ts` 経由。
- 会話APIとは分離する。
- 毎ターン自動生成は禁止。手動、重要イベント、章開始、特別分岐だけをトリガーにする。
