# STORY_SYSTEM.md

ストーリー会話システムの仕様。Prompt Builder・フロント表示・Director・伏線管理の設計を定義する。

---

## 1. 出力フォーマット

ストリーミング時、AIは1行1JSONのNDJSON形式で出力する。非ストリーム fallback では同じ意味の構造化JSONを使い、フロントで同じタイムライン表示へ変換する。

### timeline item types

| type | 用途 | speaker | content |
|------|------|---------|---------|
| narration | 環境・状況・雰囲気 | なし | 1〜2文。短い。 |
| dialogue | キャラの行動描写+セリフ | キャラ名 | 行動とセリフを \n で区切る |
| choices | 選択肢 | なし | items配列 |
| director | Director更新 | なし | scene_objective, remaining_turns |

### 出力例
{"type":"dialogue","speaker":"シルバー","content":"もこもこの尻尾を抱えながら。パジャマ姿。狼の耳がくるくる動いていた。\nえへへ、眠れなくて。\nするりと部屋に入り込んで、ベッドの端にちょこんと座った。\n今日さ、楽しかったなあって。"}
{"type":"narration","content":"廊下から足音。重い。陽葵だ。"}
{"type":"dialogue","speaker":"陽葵","content":"ノックなしでドアを開けた。タンクトップに短パン。\nおいシルバー抜け駆けすん——\n固まった。目を見開く。\nずりいぞ！俺も混ぜろ！"}
{"type":"dialogue","speaker":"シルバー","content":"耳ぺたん。\n抜け駆けじゃないもん……"}
{"type":"narration","content":"騒ぎを聞きつけたのか、向かいの壁がこんこんと二回鳴った。"}
{"type":"choices","items":[{"label":"入れてやるよ","type":"talk"},{"label":"静かにしろって言う","type":"action"},{"label":"黙って様子を見る","type":"observe"}]}
{"type":"director","scene_objective":"深夜の部屋に仲間が集まり親密度が上がる","remaining_turns":4}

---

## 2. 文体ルール

- ライトノベル風。短文。体言止め多用。
- 行動描写は三人称。短く鋭く。「耳ぺたん。」「目を逸らす。」「唇を噛んだ。」
- セリフは口語。キャラの個性が出る話し方。
- 行動描写とセリフを交互に混ぜる。1つの dialogue item 内で \n で区切る。
- ナレーションは環境・状況・雰囲気だけ。1〜2文。セリフを入れない。
- 各 content は最大4行(\n区切り)まで。
- 同じキャラが連続で2つの dialogue item を出さない。間にナレーションか別キャラを挟む。

---

## 3. {{user}}の描写ルール

### 共通（全モード）
- {{user}}の感情・思考は、テキストや会話の流れから自然に推測できる範囲なら書いてよい。
  - OK:「胸の奥がじんわり温かくなった。」（キャラに優しくされた流れ）
  - OK:「少しだけ気まずい。」（気まずい状況の流れ）
  - NG:「{{user}}は実はシルバーのことが好きだった。」（ユーザーが示していない重大な感情の捏造）
- {{user}}の感情描写もライトノベル風の短文で書く。

### 自由入力モード
- {{user}}のセリフはユーザー入力テキストのみ。追加セリフ禁止。
- {{user}}の行動はユーザー入力から推測できる範囲のみ。
  - OK: ユーザーが「おはよう」→「軽く手を挙げた。」
  - NG: ユーザーが「おはよう」→「シルバーの頭を撫でた。」

### 選択肢モード
- {{user}}の行動・セリフ・感情・思考を自由に書いてよい。
- 選択肢の意図に沿った描写にする。大きく逸脱しない。
- {{user}}の描写は timeline の最初の 1〜2 item で行い、その後にキャラの反応を続ける。

---

## 4. 進行モード

### auto
- timeline item: 6〜8個
- choices: 出さない（0個）
- ユーザー入力がなくても場面を進める
- ナレーション多め、キャラ行動を自動描写

### normal
- timeline item: 5〜7個
- choices: 2〜3個

### choice_heavy
- timeline item: 3〜5個
- choices: 4〜5個（各選択肢に結果ヒント付き）
- ユーザーの選択を待ってから展開する

---

## 5. 選択肢システム

### 選択肢タイプ
talk / action / observe / silence / approach / leave / question / avoid / honest / flirt / intimate

### ルール
- 毎回異なる type を最低2種類含める
- talk と action だけに偏らない
- choice_heavy では各選択肢に（結果ヒント）を付ける
  - 例:「正直に話す（相手は驚くかもしれない）」

### ユーザー入力の組み立て
- free_text: ユーザーのテキストをそのまま user message に
- choice_selected: 「{{user}}は【label】を選んだ。（type: xxx） この選択に基づいて{{user}}の行動と周囲の反応を描写しろ。」

---

## 6. Story Director

system prompt の最優先位置に配置する。

### 構成要素
- Scene Objective: 現在のシーンの目的
- Turn Budget: 残りターン数（毎ターン -1）
- Current Conflict: 現在の対立・緊張
- Hook: 次の展開への引き
- Anti-Stall Rule: 停滞防止

### Turn Budget
- 毎ターン終了時に remaining_turns を -1
- 0 になったらシーン遷移を強制指示

### Anti-Stall Rule
- 直近3ターンに新情報（場面変化/キャラ行動/感情変化/伏線提示）がない場合に発火
- 発火時: 次ターンのプロンプトに「展開を進めろ。同じ会話を繰り返すな」を追加

---

## 7. 伏線管理

### 伏線フィールド
clue_text / hidden_truth / related_character / introduced_scene / planned_reveal_scene / reveal_condition / importance / status / visibility

### status遷移（この順序のみ許可）
planned → introduced → developing → ready → revealed
任意の状態 → discarded

### ルール
- clue_text はユーザーに見せる
- hidden_truth はAI/Directorだけが知る。ユーザーUIに絶対表示しない
- 関連伏線だけプロンプトに入れる
  - related_character が現在のシーンの登場キャラと一致
  - status が planned / introduced / developing / ready
  - importance: high は常に含める
- フィルタ結果が0件ならセクション省略
- メイン会話AIには伏線更新データを返させない。伏線の状態更新は表示後の `/api/background` が担当し、更新がなければ `foreshadowingUpdates: []` を返す
- `/api/background` は planned の既存伏線を初めて本文に出した場合は `introduce`、introduced/developing/ready を重ねた場合だけ `reinforce` を使う

### reveal_readiness 判定
- not_ready: status = planned
- warming_up: status = introduced or developing
- ready: status = ready
- overdue: status = ready かつ turns_since_introduced >= 20

---

## 8. Prompt Builder 構造

system prompt の組み立て順序:

1. [STORY DIRECTOR] シーン目的 / Turn Budget / Anti-Stall
2. [出力ルール] フォーマット + 文体ルール + {{user}}描写ルール
3. [ストーリー設定] シナリオ概要（短縮版）
4. [キャラクター] 現在のシーンの登場キャラのみ
5. [ユーザープロフィール] {{user}} の名前・外見・性格（短縮版）
6. [ロアブック] 関連エントリのみ（0件なら省略）
7. [伏線] 関連伏線のみ（0件なら省略）
8. [メモリ] 関連メモリのみ（0件なら省略）
9. [直近会話] 最大15ターン

### トークン目標
- system prompt 本体（会話履歴除く）: 2000トークン以内
- 合計プロンプト上限: 4000トークン（超えたら動的圧縮）

### 動的圧縮

#### 圧縮の基本方針

速度より記憶を優先する。「覚えていてほしいことを忘れる」は最悪のUX。圧縮してよいのは「なくても会話が成立するもの」だけ。

#### 圧縮の優先順位

1. ロアブックの関連度が低いエントリ（世界設定・雑学）
   - 会話の成立に直接関係しないため、最初に削ってよい。
2. 会話履歴の古い部分を「構造化サマリー」に置き換え
   - 削除ではなく圧縮する。
3. メモリのうち importance が low のもの
   - low だけ。medium / high は絶対に削らない。
4. 削ってはいけないもの
   - importance: high / medium のメモリ
   - 関係性データ
   - ユーザーが明示的に伝えた自分の情報（名前・職業・好み等）
   - 伏線（関連伏線フィルタは維持し、importance: high は常に残す）

#### 会話履歴の構造化サマリー

安価モデルで非同期生成し、以下を必ず含める。

- 起きた出来事: 何が起きたか（行動・イベント）
- 決まったこと・約束: キャラやユーザーが決めたこと、約束したこと
- 感情・関係の変化: 誰が誰に対してどう感じたか、関係がどう変わったか
- {{user}}が話したこと: ユーザーが自分について話した内容
- 未解決のこと: まだ答えが出ていない問い・続きがある話題

プロンプト挿入形式:

```text
[N〜Mターンのサマリー]
起きた出来事: ...
決まったこと: ...
感情・関係の変化: ...
{{user}}が話したこと: ...
未解決のこと: ...
```

#### サマリー化のタイミング

- 会話履歴が15ターンを超えた時点で、古い5ターン分をサマリー化する。
- サマリーはDBに保存し、会話再開時も使い回す。
- サマリーの上限は最大3個。それ以上古いサマリーはさらに1つに統合する。

#### トークン上限

- デフォルト上限: 4000トークン。
- 削減がそれでも間に合わない場合のみ、ロアブックをさらに削る。
- メモリは上限を超えても medium / high は削らない。

### 出力トークン上限
- auto: max_tokens = 1200
- normal: max_tokens = 1000
- choice_heavy: max_tokens = 800

---

## 9. フロント表示

### 吹き出しスタイル
- dialogue (AIキャラ): 左寄せ、キャラアイコン+キャラ名、暗め吹き出し
- dialogue ({{user}}): 右寄せ、ユーザーアイコン、紫系吹き出し
  - AI生成の{{user}}描写には小マーク（✦）を付けて区別
- narration: アイコンなし、全幅、小さめフォント or 薄い色、左端に ≡ アイコン

### dialogue content の表示
- \n を改行として表示
- 行動描写（「」で囲まれていない行）: 薄い色 or イタリック
- セリフ（「」で囲まれている行）: 通常色

### 表示間隔（疑似ストリーミング）
- narration: 前のitemから 500ms 後
- dialogue: 前のitemから 600ms 後
- choices: 最後のitemから 800ms 後

### スキップ
- 画面タップで残りitemを即時全表示

### 未回収伏線リスト
- プレイ画面メニューから確認できる。
- 表示対象は status が planned / introduced / developing / ready の伏線のみ。
- 表示項目は clue_text / status / importance / reveal_readiness。
- hidden_truth は通常プレイUIに絶対表示しない。
- importance high と reveal_readiness overdue を目立たせる。

---

## 10. レスポンス分離

### クリティカルパス（同期・メインAPI）
- timeline items
- choices
- directorUpdate

### バックグラウンド（非同期・安価モデル）
- foreshadowingUpdates
- memoryCandidates
- relationshipDelta
- imageCue
- qualityCheck（3ターンに1回）

---

## 11. Narrative Quality Check

### 実行タイミング
- 3ターンに1回（ターン数 % 3 === 0）
- 非同期・バックグラウンド・安価モデル

### チェック項目（各 0 or 1、合計 0〜10）
a. 新情報があるか
b. キャラの具体的行動があるか
c. 感情変化があるか
d. 関係性変化があるか
e. 場面変化があるか
f. 伏線提示/強化/回収があるか
g. ユーザーに選択圧があるか
h. 同じ質問を繰り返していないか
i. 停滞していないか
j. シーン目的に近づいているか

### 低スコア時（4以下）
- 次ターンのプロンプトに低スコア項目を列挙し改善指示を追加
