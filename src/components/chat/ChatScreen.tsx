"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, BookOpen, FastForward, ImagePlus, Menu, Pause, Play, ShieldAlert } from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import type {
  Message,
  PlayPaceMode,
  ScenarioCharacter,
  SessionCharacterState,
  SessionEnvironmentState,
  StoryBundle,
  SuggestedReply,
  VisualCue
} from "@/lib/domain/types";
import { ChoiceButtons } from "./ChoiceButtons";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { SceneBackground } from "./SceneBackground";

const VrmViewer = dynamic(() => import("@/components/vrm/VrmViewer").then((m) => ({ default: m.VrmViewer })), { ssr: false });
const SCROLL_BOTTOM_THRESHOLD = 96;

type ChatScrollState = {
  isAtBottom: boolean;
  isUserScrollingHistory: boolean;
  hasNewMessagesBelow: boolean;
};

export function ChatScreen({ sessionId }: { sessionId: string }) {
  const { state, getBundle, sendTurn, continueAutoTurn, sendSilentContinue, skipCurrentTurn, setSessionPlayPaceMode, generateImage, generateSceneBackground, setImageAsBackground, generateVoice, updateSettings, currentSmartReplies, currentContinueSuggestion, currentCharacterControl, getSessionBackground, isSceneGenerating } = useAppStore();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [foreshadowingOpen, setForeshadowingOpen] = useState(false);
  const [infoBoxOpen, setInfoBoxOpen] = useState(false);
  const [choicesVisible, setChoicesVisible] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [scrollState, setScrollState] = useState<ChatScrollState>({
    isAtBottom: true,
    isUserScrollingHistory: false,
    hasNewMessagesBelow: false
  });
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const isAtBottomRef = useRef(true);
  const historyScrollLockedRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  const bottomPanelRef = useRef<HTMLDivElement | null>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(80);
  const session = state.sessions.find((item) => item.id === sessionId);
  const bundle = session ? getBundle(session.scenario_id) : null;
  const messages = state.messages.filter((message) => message.session_id === sessionId);
  const latestMessage = messages.at(-1);
  const latestMessageId = latestMessage?.id;
  const latestMessageContentLength = latestMessage?.content.length ?? 0;
  const messageCountRef = useRef(messages.length);
  const images = state.images.filter((image) => image.session_id === sessionId);
  const environmentState = state.sessionEnvironmentStates.find((item) => item.session_id === sessionId) ?? null;
  const characterStates = state.sessionCharacterStates.filter((item) => item.session_id === sessionId);
  const activeForeshadowing = session
    ? state.foreshadowingItems
        .filter(
          (item) =>
            item.scenario_id === session.scenario_id &&
            (!item.session_id || item.session_id === sessionId) &&
            ["planned", "introduced", "developing", "ready"].includes(item.status)
        )
        .sort((a, b) => foreshadowingRank(b) - foreshadowingRank(a))
    : [];

  const backgroundUrl = getSessionBackground(sessionId);
  const isSceneBgGenerating = isSceneGenerating(sessionId);
  const backgroundTransition = state.settings.background_transition ?? "fade";
  const vrmCharacter = state.settings.vrm_enabled
    ? (bundle?.characters.find((c) => c.model_type === "vrm" && c.model_url) ??
        (bundle?.characters[0] ? { ...bundle.characters[0], model_type: "vrm" as const, model_url: "/models/AvatarSample_M.vrm" } : null))
    : null;

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const withinBottomThreshold = distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD;
    const nearBottom = distanceFromBottom <= 40;
    const previousScrollTop = lastScrollTopRef.current;
    const scrollDelta = container.scrollTop - previousScrollTop;
    const scrolledUp = scrollDelta < -8;
    const scrolledDown = scrollDelta > 8;
    lastScrollTopRef.current = container.scrollTop;

    if (scrolledUp && distanceFromBottom > 40) {
      historyScrollLockedRef.current = true;
    } else if (historyScrollLockedRef.current && scrolledDown && nearBottom) {
      historyScrollLockedRef.current = false;
    } else if (historyScrollLockedRef.current && nearBottom && Math.abs(scrollDelta) <= 8) {
      historyScrollLockedRef.current = false;
    }

    const isAtBottom = withinBottomThreshold && !historyScrollLockedRef.current;
    isAtBottomRef.current = isAtBottom;
    setScrollState((current) => {
      const nextHasNewMessagesBelow = isAtBottom ? false : current.hasNewMessagesBelow;
      const nextIsUserScrollingHistory = historyScrollLockedRef.current || !withinBottomThreshold;
      if (
        current.isAtBottom === isAtBottom &&
        current.isUserScrollingHistory === nextIsUserScrollingHistory &&
        current.hasNewMessagesBelow === nextHasNewMessagesBelow
      ) {
        return current;
      }
      return {
        isAtBottom,
        isUserScrollingHistory: nextIsUserScrollingHistory,
        hasNewMessagesBelow: nextHasNewMessagesBelow
      };
    });
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
      if (behavior === "auto") {
        container.scrollTop = container.scrollHeight;
      }
    } else {
      endRef.current?.scrollIntoView({ block: "end", behavior });
    }
    historyScrollLockedRef.current = false;
    if (container) lastScrollTopRef.current = container.scrollTop;
    isAtBottomRef.current = true;
    setScrollState({
      isAtBottom: true,
      isUserScrollingHistory: false,
      hasNewMessagesBelow: false
    });
    if (behavior === "auto") {
      window.requestAnimationFrame(updateScrollState);
    }
  }, [updateScrollState]);

  useEffect(() => {
    messageCountRef.current = messages.length;
    const frame = window.requestAnimationFrame(() => scrollToBottom("auto"));
    return () => window.cancelAnimationFrame(frame);
    // This effect is session-scoped; message length changes are handled by the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToBottom, sessionId]);

  useEffect(() => {
    const messageCountChanged = messages.length !== messageCountRef.current;
    messageCountRef.current = messages.length;
    if (!messageCountChanged) return;
    if (isAtBottomRef.current) {
      window.requestAnimationFrame(() => scrollToBottom("smooth"));
      return;
    }
    setScrollState((current) => (current.hasNewMessagesBelow ? current : { ...current, hasNewMessagesBelow: true }));
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (!latestMessageId) return;
    if (isAtBottomRef.current) {
      window.requestAnimationFrame(() => scrollToBottom("auto"));
    }
  }, [latestMessageId, latestMessageContentLength, scrollToBottom]);

  useEffect(() => {
    if (!isAtBottomRef.current) return;
    const frame = window.requestAnimationFrame(() => scrollToBottom("auto"));
    return () => window.cancelAnimationFrame(frame);
  }, [keyboardOffset, scrollToBottom]);

  const pendingChoicesKey = session?.pending_choices?.map((c) => c.id).join(",") ?? "";
  useEffect(() => {
    // When new choices arrive, reset to hidden — user must click to reveal
    setChoicesVisible(false);
  }, [pendingChoicesKey]);

  useEffect(() => {
    const panel = bottomPanelRef.current;
    if (!panel) return;
    const syncPadding = () => {
      const h = panel.offsetHeight + 20;
      setBottomPanelHeight((prev) => (Math.abs(prev - h) > 4 ? h : prev));
    };
    const observer = new ResizeObserver(syncPadding);
    observer.observe(panel);
    syncPadding();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const updateKeyboardOffset = () => {
      // iOS Safari and Android Chrome report soft-keyboard overlap through visualViewport;
      // move the composer and the choice panel together so choices stay just above input.
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(offset > 24 ? Math.round(offset) : 0);
    };
    updateKeyboardOffset();
    viewport.addEventListener("resize", updateKeyboardOffset);
    viewport.addEventListener("scroll", updateKeyboardOffset);
    return () => {
      viewport.removeEventListener("resize", updateKeyboardOffset);
      viewport.removeEventListener("scroll", updateKeyboardOffset);
    };
  }, []);

  useEffect(() => {
    if (!session || session.play_pace_mode !== "auto") {
      setAutoRunning(false);
      return;
    }
    if (autoRunning && (session.needs_user_input || !session.auto_continue_allowed)) {
      setAutoRunning(false);
      return;
    }
    if (!autoRunning || busy || !session.auto_continue_allowed || session.needs_user_input) return;

    const timer = setTimeout(() => {
      setBusy(true);
      setError(null);
      continueAutoTurn(sessionId)
        .catch((err) => {
          setAutoRunning(false);
          setError(err instanceof Error ? err.message : "オート進行に失敗しました。");
        })
        .finally(() => setBusy(false));
    }, 900);

    return () => clearTimeout(timer);
  }, [autoRunning, busy, continueAutoTurn, session, sessionId]);

  const infoBoxEnvironment = session && bundle ? resolveInfoBoxEnvironment(environmentState, session, bundle) : emptyInfoBoxEnvironment();
  const infoBoxCharacters = bundle ? resolveInfoBoxCharacters(characterStates, bundle.characters) : [];
  const isDebugInfoBox = state.settings.story_director_debug_enabled;
  const infoBoxCompact = buildInfoBoxCompact(infoBoxEnvironment, infoBoxCharacters);

  if (!session || !bundle) {
    return (
      <main className="app-viewport grid min-h-dvh place-items-center bg-canvas px-4 text-center text-ink">
        <div>
          <p className="mb-4 text-muted">セッションが見つかりません。</p>
          <Link href="/" className="rounded-md bg-brand px-4 py-3 font-semibold text-canvas">
            一覧へ戻る
          </Link>
        </div>
      </main>
    );
  }

  const latestText = messages
    .slice(-6)
    .map((message) => message.content)
    .join(" / ");
  const currentScene = bundle.storyScenes.find((scene) => scene.scene_key === session.current_scene_key);
  const currentBeat = currentScene?.beats[session.current_beat_index] ?? "未設定";
  const latestQuality = state.narrativeQualityLogs.filter((log) => log.session_id === sessionId).at(-1);
  const showBottomActions = !busy;
  const showScrollToLatest = scrollState.isUserScrollingHistory || scrollState.hasNewMessagesBelow;

  const submit = async (text: string, choice?: SuggestedReply) => {
    if (!text.trim() || busy) return;
    const wasAtBottom = isAtBottomRef.current;
    if (wasAtBottom) scrollToBottom("smooth");
    setBusy(true);
    setAutoRunning(false);
    setError(null);
    setDraft("");
    try {
      await sendTurn(sessionId, text.trim(), choice);
      setAutoRunning(session.play_pace_mode === "auto");
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const handleContinue = async () => {
    if (busy || !session.auto_continue_allowed) return;
    scrollToBottom("smooth");
    setBusy(true);
    setAutoRunning(false);
    setError(null);
    try {
      await continueAutoTurn(sessionId, { allowNonAuto: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "続きを生成できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  const handleSilentContinue = async () => {
    if (busy) return;
    scrollToBottom("smooth");
    setBusy(true);
    setAutoRunning(false);
    setError(null);
    try {
      await sendSilentContinue(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "続きを生成できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  const changePaceMode = (mode: PlayPaceMode) => {
    setAutoRunning(false);
    setSessionPlayPaceMode(sessionId, mode);
  };

  const requestSceneBackground = () => {
    if (!session || !bundle || isSceneBgGenerating) return;
    const cue: VisualCue = {
      shouldUpdateVisual: true,
      updateType: "base_scene",
      reason: "manual",
      sceneKey: session.current_scene_key,
      location: environmentState?.location ?? null,
      timeOfDay: environmentState?.time ?? null,
      weather: environmentState?.weather ?? null,
      activeCharacters: bundle.characters.map((c) => c.name),
      targetCharacter: bundle.characters[0]?.name ?? null,
      expression: null,
      pose: null,
      cameraDistance: "medium",
      pov: "first_person",
      priority: "high",
      qualityPreset: state.settings.base_image_quality ?? "standard",
      eventCg: false,
      promptSummary: environmentState?.scene ?? null
    };
    void generateSceneBackground(sessionId, cue);
  };

  const requestImage = async (kind: "scene" | "event" | "character" | "icon", source?: Message) => {
    if (!state.settings.image_generation_enabled || busy) return;
    setBusy(true);
    setError(null);
    try {
      const prompt = kind === "icon"
        ? buildIconPrompt(bundle, characterStates)
        : buildContextualImagePrompt({ kind, bundle, session, environmentState, characterStates, source, latestText });
      const imageId = await generateImage(sessionId, prompt, kind === "event" && source ? "major_event" : "manual", false);
      if (imageId && (kind === "scene" || kind === "event")) {
        setImageAsBackground(sessionId, imageId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "画像生成に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <SceneBackground
      imageUrl={backgroundUrl}
      isGenerating={isSceneBgGenerating}
      transition={backgroundTransition}
    />
    {vrmCharacter && (
      <VrmViewer
        character={vrmCharacter}
        characterControl={currentCharacterControl}
        quality={state.settings.vrm_quality}
        fpsLimit={state.settings.vrm_fps_limit}
        shadowEnabled={state.settings.vrm_shadow_enabled}
        physicsEnabled={state.settings.vrm_physics_enabled}
        className="fixed inset-x-0 top-[6dvh] z-10 mx-auto h-[56dvh] w-full max-w-md overflow-visible opacity-95"
      />
    )}
    <main className="app-viewport relative flex h-dvh min-h-dvh flex-col overflow-hidden text-ink">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-canvas/90 px-3 py-2 shadow-float backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <Link href="/" className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-white/[0.06] transition-colors duration-150 hover:bg-white/[0.1]" aria-label="戻る">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">{bundle.scenario.title}</h1>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
              <span>第{session.chapter_index}章</span>
              <span>{session.current_scene_key}</span>
              <span>{session.progress_percent}%</span>
            </div>
          </div>
          <button type="button" className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-white/[0.06] transition-colors duration-150 hover:bg-white/[0.1]" onClick={() => setMenuOpen((open) => !open)} aria-label="メニュー">
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="mx-auto mt-2 flex max-w-md gap-1 overflow-x-auto rounded-lg bg-white/[0.04] p-1 ring-1 ring-white/[0.06]">
          {[
            ["auto", "オート"],
            ["normal", "ふつう"],
            ["choice_heavy", "選択肢多め"]
          ].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => changePaceMode(mode as PlayPaceMode)}
              className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold transition-all duration-200 ${
                session.play_pace_mode === mode ? "bg-brand text-canvas shadow-glow-sm" : "text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {session.play_pace_mode === "auto" && (
          <div className="mx-auto mt-2 flex max-w-md items-center gap-2 rounded-lg border border-brand/20 bg-brand/10 px-3 py-2 text-xs ring-1 ring-brand/10 animate-fade-in">
            <Play className="h-4 w-4 text-brand" aria-hidden />
            <span className="flex-1 text-brand">
              {autoRunning
                ? `オート進行中 ${session.auto_continue_count}/3`
                : session.needs_user_input
                  ? "入力待ち"
                  : "オート待機中"}
            </span>
            <button
              type="button"
              className="min-h-9 rounded-md bg-panel2 px-3 text-ink disabled:opacity-40"
              disabled={!autoRunning && !session.auto_continue_allowed}
              onClick={() => setAutoRunning((running) => !running)}
            >
              {autoRunning ? <Pause className="mr-1 inline h-4 w-4 align-[-3px]" aria-hidden /> : <Play className="mr-1 inline h-4 w-4 align-[-3px]" aria-hidden />}
              {autoRunning ? "停止" : "再開"}
            </button>
            <button type="button" className="min-h-9 rounded-md bg-panel2 px-3 text-ink" onClick={() => setAutoRunning(false)}>
              今すぐ入力
            </button>
          </div>
        )}
        {menuOpen && (
          <div className="mx-auto mt-2 grid max-w-md gap-2 rounded-lg border border-white/[0.06] bg-panel/90 p-3 text-sm shadow-float backdrop-blur-sm animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-muted">NSFW会話</span>
              <span className={session.nsfw_chat_enabled ? "text-brand" : "text-muted"}>{session.nsfw_chat_enabled ? "ON" : "OFF"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">NSFW画像</span>
              <span className={session.nsfw_image_enabled ? "text-brand" : "text-muted"}>{session.nsfw_image_enabled ? "ON" : "OFF"}</span>
            </div>
            <Link href="/memory" className="min-h-10 rounded-md bg-panel2 px-3 py-2 text-center">
              メモリ管理
            </Link>
            <button
              type="button"
              className="flex min-h-10 items-center justify-between rounded-md bg-panel2 px-3 text-left"
              onClick={() => setForeshadowingOpen((open) => !open)}
            >
              <span className="inline-flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-brand" aria-hidden />
                未回収の伏線
              </span>
              <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">{activeForeshadowing.length}</span>
            </button>
            {foreshadowingOpen && (
              <div className="grid max-h-80 gap-2 overflow-y-auto rounded-md border border-white/10 bg-canvas/60 p-2">
                {activeForeshadowing.length === 0 && <p className="px-2 py-3 text-xs text-muted">未回収の伏線はありません。</p>}
                {activeForeshadowing.map((item) => (
                  <article
                    key={item.id}
                    className={`grid gap-2 rounded-md border p-3 ${
                      item.reveal_readiness === "overdue" ? "border-danger/50 bg-danger/10" : "border-white/10 bg-panel2"
                    }`}
                  >
                    <p className="break-words text-sm leading-6">{item.clue_text}</p>
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      <span className="rounded-full bg-canvas px-2 py-1 text-muted">{statusLabel(item.status)}</span>
                      <span className={`rounded-full px-2 py-1 ${importanceClass(item.importance)}`}>{importanceLabel(item.importance)}</span>
                      <span className={`rounded-full px-2 py-1 ${readinessClass(item.reveal_readiness)}`}>
                        {readinessLabel(item.reveal_readiness)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {state.settings.visual_mode !== "off" && state.settings.image_generation_enabled && (
              <button
                type="button"
                disabled={isSceneBgGenerating}
                onClick={requestSceneBackground}
                className="flex min-h-10 items-center gap-2 rounded-md bg-panel2 px-3 text-left disabled:opacity-40"
              >
                <ImagePlus className="h-4 w-4 text-brand" aria-hidden />
                <span>{isSceneBgGenerating ? "背景生成中…" : "このシーンを背景画像化"}</span>
              </button>
            )}
            <label className="flex min-h-10 items-center justify-between rounded-md bg-panel2 px-3">
              <span>Story Director Debug</span>
              <input
                type="checkbox"
                checked={state.settings.story_director_debug_enabled}
                onChange={(event) => updateSettings({ story_director_debug_enabled: event.target.checked })}
                className="h-5 w-5 accent-brand"
              />
            </label>
          </div>
        )}
      </header>

      <section
        ref={scrollContainerRef}
        className="mx-auto min-h-0 w-full max-w-md flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: bottomPanelHeight + keyboardOffset }}
        onScroll={updateScrollState}
        onTouchEnd={() => {
          window.requestAnimationFrame(() => {
            const container = scrollContainerRef.current;
            if (!container) return;
            const dist = container.scrollHeight - container.scrollTop - container.clientHeight;
            if (dist <= SCROLL_BOTTOM_THRESHOLD) {
              historyScrollLockedRef.current = false;
              isAtBottomRef.current = true;
              setScrollState({ isAtBottom: true, isUserScrollingHistory: false, hasNewMessagesBelow: false });
            }
          });
        }}
      >
        {error && (
          <div className="mx-3 mt-3 flex gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger ring-1 ring-danger/10 animate-fade-in">
            <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}
        <div className="mx-3 mt-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-xs leading-5 backdrop-blur-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left text-sm font-semibold"
            onClick={() => setInfoBoxOpen((open) => !open)}
            aria-expanded={infoBoxOpen}
          >
            <span>Info Box</span>
            <span className="text-xs text-muted">{infoBoxOpen ? "折りたたむ" : "展開"}</span>
          </button>
          <p className="mt-2 text-[11px] text-muted">{infoBoxCompact}</p>
          {infoBoxOpen && (
            <div className="mt-3 grid gap-3">
              <div className="grid gap-2">
                <p className="text-[11px] font-semibold text-muted">環境</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <span className="text-muted">date</span>
                  <span className="break-words">{infoBoxEnvironment.date || "-"}</span>
                  <span className="text-muted">time</span>
                  <span className="break-words">{infoBoxEnvironment.time || "-"}</span>
                  <span className="text-muted">location</span>
                  <span className="break-words">{infoBoxEnvironment.location || "-"}</span>
                  <span className="text-muted">weather</span>
                  <span className="break-words">{infoBoxEnvironment.weather || "-"}</span>
                  <span className="text-muted">scene</span>
                  <span className="break-words">{infoBoxEnvironment.scene || "-"}</span>
                  <span className="text-muted">objective</span>
                  <span className="break-words">{infoBoxEnvironment.current_objective || "-"}</span>
                  <span className="text-muted">recent_event</span>
                  <span className="break-words">{infoBoxEnvironment.recent_event || "-"}</span>
                  <span className="text-muted">next_pressure</span>
                  <span className="break-words">{infoBoxEnvironment.next_pressure || "-"}</span>
                  <span className="text-muted">chapter</span>
                  <span className="break-words">{infoBoxEnvironment.chapter || "-"}</span>
                  <span className="text-muted">scene_key</span>
                  <span className="break-words">{infoBoxEnvironment.scene_key || "-"}</span>
                </div>
              </div>
              <div className="grid gap-2">
                <p className="text-[11px] font-semibold text-muted">キャラクター</p>
                {infoBoxCharacters.length === 0 && <p className="text-[11px] text-muted">キャラクター状態がまだありません。</p>}
                {infoBoxCharacters.map((entry) => (
                  <div key={entry.character_id} className="rounded-md border border-white/10 bg-canvas/70 p-2 text-[11px]">
                    <p className="font-semibold">{entry.name}</p>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <span className="text-muted">mood</span>
                      <span className="break-words">{entry.mood || "-"}</span>
                      <span className="text-muted">condition</span>
                      <span className="break-words">{entry.condition || "-"}</span>
                      <span className="text-muted">outfit</span>
                      <span className="break-words">{entry.outfit || "-"}</span>
                      <span className="text-muted">pose</span>
                      <span className="break-words">{entry.pose || "-"}</span>
                      <span className="text-muted">goal</span>
                      <span className="break-words">{entry.goal || "-"}</span>
                      <span className="text-muted">relationship</span>
                      <span className="break-words">{entry.relationship || "-"}</span>
                      <span className="text-muted">inventory</span>
                      <span className="break-words">{entry.inventory || "-"}</span>
                      <span className="text-muted">last_action</span>
                      <span className="break-words">{entry.last_action || "-"}</span>
                      {isDebugInfoBox && (
                        <>
                          <span className="text-muted">inner_thoughts</span>
                          <span className="break-words">{entry.inner_thoughts || "-"}</span>
                          <span className="text-muted">hidden_intent</span>
                          <span className="break-words">{entry.hidden_intent || "-"}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {state.settings.story_director_debug_enabled && (
          <div className="mx-3 mt-3 grid gap-2 rounded-lg border border-brand/20 bg-brand/[0.03] p-3 text-xs leading-5 ring-1 ring-brand/10">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted">current scene</span>
              <span>{session.current_scene_key}</span>
              <span className="text-muted">current beat</span>
              <span>{currentBeat}</span>
              <span className="text-muted">scene_turn_count</span>
              <span>{session.scene_turn_count}</span>
              <span className="text-muted">stall_count</span>
              <span>{session.stall_count}</span>
              <span className="text-muted">isStalling</span>
              <span>{latestQuality?.is_stalling ? "true" : "false"}</span>
              <span className="text-muted">isRepetitive</span>
              <span>{latestQuality?.is_repetitive ? "true" : "false"}</span>
              <span className="text-muted">hasForwardMotion</span>
              <span>{latestQuality?.has_forward_motion ? "true" : "false"}</span>
              <span className="text-muted">sceneObjectiveProgress</span>
              <span>{latestQuality?.scene_objective_progress ?? "-"}</span>
            </div>
            <div>
              <p className="text-muted">objective</p>
              <p>{currentScene?.objective || session.scene_objective}</p>
            </div>
            <div>
              <p className="text-muted">directorUpdate.reason</p>
              <p>{session.last_director_reason ?? "-"}</p>
            </div>
            <div>
              <p className="text-muted">problem / improvementHint</p>
              <p>{session.last_quality_problem ?? latestQuality?.problem ?? "-"}</p>
              <p>{session.last_improvement_hint ?? latestQuality?.improvement_hint ?? "-"}</p>
            </div>
            <div>
              <p className="text-muted">active foreshadowing</p>
              <div className="mt-1 grid gap-1">
                {activeForeshadowing.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-sm bg-panel2 px-2 py-1">
                    {item.title} / {item.status} / {item.reveal_readiness} / {item.clue_text}
                  </div>
                ))}
                {activeForeshadowing.length === 0 && <span>-</span>}
              </div>
            </div>
          </div>
        )}
        <MessageList
          messages={messages}
          characters={bundle.characters}
          images={images}
          voiceJobs={state.voiceJobs.filter((job) => job.session_id === sessionId)}
          showAuxiliaryActions={showBottomActions}
          onGenerateEventImage={(message) => requestImage("event", message)}
          onGenerateVoice={
            state.settings.voice_enabled
              ? (message, characterId) => void generateVoice(sessionId, message.id, characterId, message.content)
              : null
          }
          onSetImageAsBackground={(imageId) => setImageAsBackground(sessionId, imageId)}
        />
        {busy && (
          <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-muted ring-1 ring-white/[0.06] animate-fade-in">
            <span className="inline-flex min-w-10 items-center gap-1.5" aria-label="入力中">
              <span className="h-2 w-2 animate-dot-pulse rounded-full bg-brand/60" />
              <span className="h-2 w-2 animate-dot-pulse rounded-full bg-brand/60 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-dot-pulse rounded-full bg-brand/60 [animation-delay:300ms]" />
            </span>
            <span className="flex-1">...</span>
            {(state.settings.show_skip_button ?? true) && (
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-1 rounded-md bg-canvas px-3 text-xs font-semibold text-ink"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={skipCurrentTurn}
              >
                <FastForward className="h-4 w-4" aria-hidden />
                スキップ
              </button>
            )}
          </div>
        )}
        {showBottomActions && (
          <div className="mx-3 mb-3 grid gap-2">
            {session.pending_choices.length > 0 && !choicesVisible && (
              <button
                type="button"
                onClick={() => {
                  setChoicesVisible(true);
                  window.requestAnimationFrame(() => scrollToBottom("smooth"));
                }}
                className="min-h-11 rounded-full border border-brand/30 bg-brand/10 px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand/20"
              >
                選択肢を表示（{session.pending_choices.length}件）
              </button>
            )}
            {choicesVisible && (
              <ChoiceButtons
                choices={session.pending_choices}
                disabled={busy}
                showDebug={state.settings.story_director_debug_enabled && (state.settings.show_choice_effect_hints ?? false)}
                onChoice={(choice) => {
                  setChoicesVisible(false);
                  if (state.settings.choice_send_behavior === "insert_into_composer") {
                    setDraft(choice.label);
                  } else {
                    void submit(choice.label, choice);
                  }
                }}
              />
            )}
          </div>
        )}
        <div ref={endRef} />
      </section>

      <div
        ref={bottomPanelRef}
        className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-md gap-1 overscroll-contain transition-transform duration-150"
        style={keyboardOffset ? { transform: `translateY(-${keyboardOffset}px)` } : undefined}
      >
        {showScrollToLatest && (
          <button
            type="button"
            onClick={() => scrollToBottom("auto")}
            className="mx-auto mb-1 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-brand/20 bg-canvas/90 px-4 text-sm font-semibold text-brand shadow-glow-brand backdrop-blur-xl animate-slide-up"
          >
            <ArrowDown className="h-4 w-4" aria-hidden />
            {scrollState.hasNewMessagesBelow ? "新着あり ↓ 最新へ" : "↓ 最新へ"}
          </button>
        )}
        <Composer
          value={draft}
          disabled={busy}
          allowFreeInput={bundle.style.allow_free_input}
          imageEnabled={state.settings.image_generation_enabled && state.settings.allow_manual_image_generation}
          showAuxiliaryActions={showBottomActions}
          onChange={setDraft}
          onSend={() => void submit(draft)}
          onContinue={handleContinue}
          onGenerateImage={(kind) => void requestImage(kind)}
        />
      </div>
    </main>
    </>
  );
}

function foreshadowingRank(item: { importance: number; reveal_readiness: string; status: string }) {
  return (item.reveal_readiness === "overdue" ? 1000 : 0) + item.importance * 100 + (item.status === "ready" ? 30 : 0);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    planned: "予定",
    introduced: "提示済み",
    developing: "進行中",
    ready: "回収可能"
  };
  return labels[status] ?? status;
}

function importanceLabel(importance: number) {
  if (importance >= 4) return "High";
  if (importance >= 3) return "Medium";
  return "Low";
}

function importanceClass(importance: number) {
  if (importance >= 4) return "bg-danger/20 text-danger";
  if (importance >= 3) return "bg-brand/15 text-brand";
  return "bg-white/10 text-muted";
}

function readinessLabel(readiness: string) {
  const labels: Record<string, string> = {
    not_ready: "未準備",
    warming_up: "温まり中",
    ready: "回収準備",
    overdue: "要回収"
  };
  return labels[readiness] ?? readiness;
}

function readinessClass(readiness: string) {
  if (readiness === "overdue") return "bg-danger text-canvas";
  if (readiness === "ready") return "bg-brand text-canvas";
  if (readiness === "warming_up") return "bg-brand/15 text-brand";
  return "bg-white/10 text-muted";
}

type InfoBoxEnvironmentView = {
  date: string;
  time: string;
  location: string;
  weather: string;
  scene: string;
  current_objective: string;
  recent_event: string;
  next_pressure: string;
  chapter: string;
  scene_key: string;
};

type InfoBoxCharacterRow = SessionCharacterState & { name: string };

function emptyInfoBoxEnvironment(): InfoBoxEnvironmentView {
  return {
    date: "",
    time: "",
    location: "",
    weather: "",
    scene: "",
    current_objective: "",
    recent_event: "",
    next_pressure: "",
    chapter: "",
    scene_key: ""
  };
}

function resolveInfoBoxEnvironment(
  environment: SessionEnvironmentState | null,
  session: { chapter_index: number; current_scene_key: string; scene_objective: string },
  bundle: { intro: { start_location: string; start_situation: string }; scenario: { situation: string; objective: string } }
): InfoBoxEnvironmentView {
  const fallback = {
    date: "",
    time: "",
    location: bundle.intro.start_location || "",
    weather: "",
    scene: bundle.intro.start_situation || bundle.scenario.situation || "",
    current_objective: session.scene_objective || bundle.scenario.objective || "",
    recent_event: "",
    next_pressure: "",
    chapter: `第${session.chapter_index}章`,
    scene_key: session.current_scene_key
  };
  return {
    date: pickInfoValue(environment?.date, fallback.date),
    time: pickInfoValue(environment?.time, fallback.time),
    location: pickInfoValue(environment?.location, fallback.location),
    weather: pickInfoValue(environment?.weather, fallback.weather),
    scene: pickInfoValue(environment?.scene, fallback.scene),
    current_objective: pickInfoValue(environment?.current_objective, fallback.current_objective),
    recent_event: pickInfoValue(environment?.recent_event, fallback.recent_event),
    next_pressure: pickInfoValue(environment?.next_pressure, fallback.next_pressure),
    chapter: pickInfoValue(environment?.chapter, fallback.chapter),
    scene_key: pickInfoValue(environment?.scene_key, fallback.scene_key)
  };
}

function resolveInfoBoxCharacters(states: SessionCharacterState[], characters: ScenarioCharacter[]): InfoBoxCharacterRow[] {
  if (states.length === 0) return [];
  const order = new Map(characters.map((character, index) => [character.id, index] as const));
  return [...states]
    .sort((a, b) => (order.get(a.character_id) ?? 999) - (order.get(b.character_id) ?? 999))
    .map((state) => {
      const character = characters.find((item) => item.id === state.character_id);
      return { ...state, name: character?.name ?? state.character_id };
    });
}

function buildInfoBoxCompact(environment: InfoBoxEnvironmentView, characters: InfoBoxCharacterRow[]) {
  const envParts = [environment.location, environment.scene, environment.time, environment.weather]
    .map((value) => shortenInfo(value, 32))
    .filter((value) => value.length > 0);
  const envText = envParts.length ? envParts.join(" / ") : "環境情報なし";
  const characterText = characters.length
    ? characters
        .map((entry) => {
          const mood = entry.mood || entry.goal || entry.condition;
          return mood ? `${entry.name}: ${shortenInfo(mood, 24)}` : entry.name;
        })
        .join(" / ")
    : "キャラ状態なし";
  return `${envText} | ${characterText}`;
}

function pickInfoValue(primary: string | null | undefined, fallback: string) {
  if (typeof primary === "string" && primary.trim().length > 0) return primary;
  return fallback;
}

function shortenInfo(value: string, maxLength: number) {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function buildContextualImagePrompt({
  kind,
  bundle,
  session,
  environmentState,
  characterStates,
  source,
  latestText
}: {
  kind: "scene" | "event" | "character";
  bundle: StoryBundle;
  session: { current_scene_key: string; scene_objective: string };
  environmentState: SessionEnvironmentState | null;
  characterStates: SessionCharacterState[];
  source?: Message;
  latestText: string;
}) {
  const activeCharacters = bundle.characters.slice(0, 3);
  const characterDetails = activeCharacters.map((character) => {
    const state = characterStates.find((item) => item.character_id === character.id);
    return [
      character.name,
      character.appearance ? `appearance: ${shortenInfo(character.appearance, 180)}` : "",
      state?.outfit ? `current outfit: ${shortenInfo(state.outfit, 80)}` : "",
      state?.mood ? `current mood: ${shortenInfo(state.mood, 60)}` : "",
      state?.pose ? `pose: ${shortenInfo(state.pose, 60)}` : ""
    ].filter(Boolean).join(", ");
  });
  const eventText = source?.content ?? latestText;
  const location = environmentState?.location || bundle.intro.start_location || "current scene";
  const scene = environmentState?.scene || bundle.intro.start_situation || bundle.scenario.situation;
  const time = environmentState?.time || "";
  const weather = environmentState?.weather || "";
  const currentAction = kind === "character"
    ? "focused character portrait that matches the active character design"
    : kind === "event"
      ? "event CG capturing the latest story beat"
      : "scene illustration matching the current location and mood";

  return [
    "coherent visual novel anime illustration, single consistent scene, portrait composition",
    `image type: ${currentAction}`,
    `scenario title: ${bundle.scenario.title}`,
    `world setting: ${shortenInfo(bundle.scenario.world_setting || bundle.scenario.description, 220)}`,
    `current scene key: ${session.current_scene_key}`,
    `location: ${location}`,
    time ? `time of day: ${time}` : "",
    weather ? `weather: ${weather}` : "",
    `scene context: ${shortenInfo(scene, 220)}`,
    `relationship setup: ${shortenInfo(bundle.scenario.relationship_setup, 180)}`,
    `latest story beat to visualize: ${shortenInfo(eventText, 260)}`,
    characterDetails.length ? `characters that may appear, no extras: ${characterDetails.join(" | ")}` : "",
    "the protagonist is an adult male; if visible, show him only as a modest partial figure or back-view unless the story beat requires otherwise",
    "match the current dialogue tone and location; do not invent unrelated settings, random props, or extra people",
    "no text, no subtitles, no speech bubbles, no logos, no watermark, no UI elements",
    "high quality, clean composition, stable anatomy, expressive faces, soft cinematic lighting"
  ].filter(Boolean).join(", ");
}

function buildIconPrompt(bundle: StoryBundle, characterStates: SessionCharacterState[]) {
  const character = bundle.characters[0];
  if (!character) return "anime character icon, square portrait, clean background";
  const state = characterStates.find((item) => item.character_id === character.id);
  return [
    "anime character icon, square 1:1 portrait, close-up face shot, centered composition",
    `character: ${character.name}`,
    character.appearance ? `appearance: ${shortenInfo(character.appearance, 250)}` : "",
    character.personality ? `personality vibe: ${shortenInfo(character.personality, 100)}` : "",
    state?.mood ? `current mood/expression: ${shortenInfo(state.mood, 60)}` : "neutral friendly expression",
    state?.outfit ? `outfit: ${shortenInfo(state.outfit, 80)}` : "",
    "simple gradient or solid color background, no scene elements",
    "no text, no speech bubbles, no logos, no watermark",
    "high quality, clean lines, expressive eyes, soft lighting, suitable for app avatar/icon use"
  ].filter(Boolean).join(", ");
}
