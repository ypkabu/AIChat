"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, Edit3, Home, Menu, MessageCircle, Play, Star, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import type { ScenarioCharacter } from "@/lib/domain/types";

export function ScenarioDetailScreen({ scenarioId }: { scenarioId: string }) {
  const router = useRouter();
  const { state, getBundle, startOrResumeScenario, toggleScenarioBookmark } = useAppStore();
  const [introExpanded, setIntroExpanded] = useState(false);
  const bundle = useMemo(() => getBundle(scenarioId), [getBundle, scenarioId]);

  if (!bundle) {
    return (
      <main className="app-viewport grid min-h-dvh place-items-center bg-canvas px-4 text-center text-ink">
        <div>
          <p className="mb-4 text-muted">作品が見つかりません。</p>
          <Link href="/" className="rounded-md bg-brand px-4 py-3 font-semibold text-canvas">
            一覧へ戻る
          </Link>
        </div>
      </main>
    );
  }

  const { scenario, characters, userProfiles, intro, style } = bundle;
  const activeSession = state.sessions.find((session) => session.scenario_id === scenario.id && session.status === "active");
  const scenarioSessions = state.sessions.filter((session) => session.scenario_id === scenario.id);
  const scenarioMessages = state.messages.filter((message) => scenarioSessions.some((session) => session.id === message.session_id));
  const linkedLorebookCount = (state.lorebookLinks ?? []).filter((link) => link.plot_id === scenario.id && link.enabled).length;
  const bookmarked = (state.bookmarkedScenarioIds ?? []).includes(scenario.id);
  const profile = userProfiles.find((item) => item.id === intro.user_profile_id) ?? userProfiles[0];
  const safeScenarioImage = state.images.find((image) => image.scenario_id === scenario.id && !image.is_nsfw && !image.blur_by_default);
  const coverImage =
    scenario.cover_image_url ||
    characters.find((character) => character.avatar_url)?.avatar_url ||
    safeScenarioImage?.thumbnail_url ||
    safeScenarioImage?.public_url ||
    null;
  const introMessages = intro.initial_character_messages.filter((message) => message.content.trim());
  const shownIntroMessages = introExpanded ? introMessages : introMessages.slice(0, 2);
  const modeLabel = style.mode_optimization === "girlfriend" ? "AI彼女" : style.mode_optimization === "story" ? "物語" : "標準";

  const begin = () => {
    const sessionId = activeSession?.id || startOrResumeScenario(scenario.id);
    if (sessionId) router.push(`/play/${sessionId}`);
  };

  return (
    <main className="app-viewport min-h-dvh bg-canvas pb-28 text-ink">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-canvas/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <button type="button" onClick={() => router.back()} className="grid min-h-11 min-w-11 place-items-center rounded-md bg-panel2" aria-label="戻る">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold">{scenario.title}</h1>
          <Link href="/" className="grid min-h-11 min-w-11 place-items-center rounded-md bg-panel2" aria-label="ホーム">
            <Home className="h-5 w-5" aria-hidden />
          </Link>
          <Link href={`/scenarios/${scenario.id}/edit`} className="grid min-h-11 min-w-11 place-items-center rounded-md bg-panel2" aria-label="編集">
            <Edit3 className="h-5 w-5" aria-hidden />
          </Link>
          <button type="button" className="grid min-h-11 min-w-11 place-items-center rounded-md bg-panel2" aria-label="メニュー">
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-md px-4 py-4">
        <div className="overflow-hidden rounded-md border border-white/10 bg-panel">
          <div className="relative h-56 bg-panel2">
            {coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImage} alt={`${scenario.title}のカバー`} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center bg-panel2 px-6 text-center">
                <div>
                  <p className="text-4xl font-bold text-brand">{scenario.title.slice(0, 1)}</p>
                  <p className="mt-2 text-sm text-muted">カバー画像未設定</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
              <div className="flex min-w-0 gap-1.5 overflow-x-auto">
                {characters.map((character) => (
                  <CharacterThumb key={character.id} character={character} />
                ))}
              </div>
              <button
                type="button"
                onClick={() => toggleScenarioBookmark(scenario.id)}
                className={`grid min-h-11 min-w-11 place-items-center rounded-md border backdrop-blur ${
                  bookmarked ? "border-brand bg-brand text-canvas" : "border-white/15 bg-canvas/80 text-ink"
                }`}
                aria-label="ブックマーク"
              >
                <Bookmark className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <section className="grid gap-3">
            <div>
              <h2 className="break-words text-2xl font-bold leading-tight">{scenario.title}</h2>
              <p className="mt-2 text-sm leading-7 text-muted">{scenario.description || "紹介文はまだありません。"}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(scenario.tags.length ? scenario.tags : ["タグなし"]).map((tag) => (
                <span key={tag} className="rounded-full bg-brand/12 px-2.5 py-1 text-xs text-brand">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Metric icon={<MessageCircle className="h-4 w-4" />} label="会話" value={`${scenarioMessages.length}`} />
              <Metric icon={<Users className="h-4 w-4" />} label="キャラ" value={`${characters.length}`} />
              <Metric icon={<Star className="h-4 w-4" />} label="連動ロア" value={`${linkedLorebookCount}`} />
            </div>
          </section>

          <ReadableSection title="状況" text={scenario.situation || intro.start_situation || "開始時の状況はまだ設定されていません。"} />
          <ReadableSection title="関係性" text={scenario.relationship_setup || profile?.relationship_to_characters || "関係性はまだ設定されていません。"} />
          <ReadableSection title="世界観" text={scenario.world_setting || "世界観はまだ設定されていません。"} />

          <section className="rounded-md border border-white/10 bg-panel p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">主人公</h2>
              <span className="rounded-full bg-panel2 px-2 py-1 text-xs text-muted">{modeLabel}モード</span>
            </div>
            <InfoGrid
              rows={[
                ["名前", profile?.display_name || "あなた"],
                ["一人称", profile?.first_person || "未設定"],
                ["立場", profile?.role || "未設定"],
                ["話し方", profile?.speaking_style || "未設定"],
                ["性格", profile?.personality || "未設定"],
                ["背景", profile?.background || "未設定"]
              ]}
            />
          </section>

          <section className="grid gap-3">
            <h2 className="text-sm font-semibold">キャラクター</h2>
            {characters.map((character) => (
              <details key={character.id} open className="overflow-hidden rounded-md border border-white/10 bg-panel">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center gap-3 p-3">
                    <CharacterThumb character={character} large />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold">{character.name}</p>
                      <p className="line-clamp-2 text-xs leading-5 text-muted">{character.role || character.personality || "役割未設定"}</p>
                    </div>
                  </div>
                </summary>
                <div className="border-t border-white/10 p-4">
                  <InfoGrid
                    rows={[
                      ["一人称", character.first_person || "未設定"],
                      ["呼び方", character.user_call_name || "未設定"],
                      ["口調", character.speaking_style || "未設定"],
                      ["性格", character.personality || "未設定"],
                      ["好き", character.likes || "未設定"],
                      ["苦手", character.dislikes || "未設定"],
                      ["外見", character.appearance || "未設定"],
                      ["関係性", scenario.relationship_setup || "未設定"]
                    ]}
                  />
                  <p className="mt-3 rounded-md bg-canvas/60 px-3 py-2 text-xs leading-5 text-muted">
                    秘密・伏線・hidden_truth はこのページには表示しません。
                  </p>
                </div>
              </details>
            ))}
          </section>

          <section className="rounded-md border border-white/10 bg-panel p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">イントロ</h2>
              {introMessages.length > 2 && (
                <button type="button" onClick={() => setIntroExpanded((value) => !value)} className="text-xs font-semibold text-brand">
                  {introExpanded ? "閉じる" : "もっと見る"}
                </button>
              )}
            </div>
            <div className="grid gap-3">
              {(intro.initial_narration || intro.start_text) && (
                <p className="rounded-md bg-panel2 px-3 py-3 text-sm leading-7 text-muted">
                  {intro.initial_narration || intro.start_text}
                </p>
              )}
              {shownIntroMessages.map((message, index) => {
                const character = characters.find((item) => item.id === message.characterId);
                return (
                  <div key={`${message.characterId}-${index}`} className="flex items-start gap-2">
                    <CharacterThumb character={character} />
                    <div className="min-w-0 max-w-[82%] rounded-md bg-panel2 px-3 py-2.5">
                      <p className="mb-1 text-[11px] text-muted">{character?.name ?? message.characterName}</p>
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                    </div>
                  </div>
                );
              })}
              {intro.initial_choices[0]?.label && (
                <div className="ml-auto max-w-[82%] rounded-md bg-brand px-3 py-2.5 text-sm leading-6 text-canvas">
                  {intro.initial_choices[0].label}
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-canvas/95 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md gap-2">
          <button
            type="button"
            onClick={() => toggleScenarioBookmark(scenario.id)}
            className={`grid min-h-12 min-w-12 place-items-center rounded-md border ${
              bookmarked ? "border-brand bg-brand text-canvas" : "border-white/10 bg-panel2 text-ink"
            }`}
            aria-label="ブックマーク"
          >
            <Bookmark className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={begin}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-brand px-4 font-semibold text-canvas"
          >
            <Play className="h-4 w-4" aria-hidden />
            {activeSession ? "トークを続ける" : "トークを開始"}
          </button>
        </div>
      </div>
    </main>
  );
}

function CharacterThumb({ character, large = false }: { character?: ScenarioCharacter; large?: boolean }) {
  const sizeClass = large ? "h-14 w-14" : "h-10 w-10";
  if (character?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={character.avatar_url} alt={character.name} className={`${sizeClass} shrink-0 rounded-md border border-white/20 object-cover`} />
    );
  }
  return (
    <div
      className={`${sizeClass} grid shrink-0 place-items-center rounded-md border border-white/20 text-sm font-bold text-canvas`}
      style={{ backgroundColor: character?.display_color ?? "#8b5cf6" }}
    >
      {(character?.name ?? "?").slice(0, 1)}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-panel p-3">
      <div className="flex items-center gap-1.5 text-brand">{icon}</div>
      <p className="mt-2 text-[11px] text-muted">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function ReadableSection({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-md border border-white/10 bg-panel p-4">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <p className="whitespace-pre-wrap text-sm leading-7 text-muted">{text}</p>
    </section>
  );
}

function InfoGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-2">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 rounded-md bg-panel2 px-3 py-2.5">
          <dt className="text-[11px] text-muted">{label}</dt>
          <dd className="whitespace-pre-wrap text-sm leading-6">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
