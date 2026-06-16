import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Spin, message as antdMessage } from "antd";
import { AudioOutlined, StopOutlined } from "@ant-design/icons";

import AIFeature, { ChatMessage } from "../features/ai";
import GeneralLayout from "../layouts/User";

import { useSelector } from "react-redux";
import type { RootState } from "../store";

export const Route = createFileRoute("/voice-chat")({
  component: Page,
});

// ─── helpers ────────────────────────────────────────────────────────────────

type SpeechRecognitionWindow = typeof window & {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
};

function formatToolCallContent(name?: string, args?: unknown): string {
  const safeName = name?.trim() || "Tool";
  if (!args) return safeName;
  try {
    const serialized =
      typeof args === "string" ? args : JSON.stringify(args, null, 2);
    return `${safeName}\n\n\`\`\`json\n${serialized}\n\`\`\``;
  } catch {
    return safeName;
  }
}

function appendOrUpdateAssistantText(
  copy: ChatMessage[],
  nextText: string,
): ChatMessage[] {
  const last = copy[copy.length - 1];
  if (
    last?.role === "assistant" &&
    last.source === "api" &&
    last.kind === "text"
  ) {
    last.content = nextText;
    return copy;
  }
  copy.push({
    source: "api",
    role: "assistant",
    kind: "text",
    content: nextText,
    timestamp: Date.now(),
    activityItems: [],
  });
  return copy;
}

function appendActivityToAssistantText(
  copy: ChatMessage[],
  activity: {
    kind: "tool_call" | "workflow_start" | "workflow_step";
    title: string;
    details?: string;
  },
): ChatMessage[] {
  const last = copy[copy.length - 1];
  if (
    last?.role === "assistant" &&
    last.source === "api" &&
    last.kind === "text"
  ) {
    const existing = last.activityItems ?? [];
    const prev = existing[existing.length - 1];
    if (
      prev &&
      prev.kind === activity.kind &&
      prev.title === activity.title &&
      (prev.details ?? "") === (activity.details ?? "")
    ) {
      return copy;
    }
    last.activityItems = [
      ...existing,
      { ...activity, timestamp: Date.now() },
    ];
    return copy;
  }
  copy.push({
    source: "api",
    role: "assistant",
    kind: "text",
    content: "",
    timestamp: Date.now(),
    activityItems: [{ ...activity, timestamp: Date.now() }],
  });
  return copy;
}

function tryParseJson<T = Record<string, unknown>>(value: string): T | null {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

// ─── component ──────────────────────────────────────────────────────────────

function Page() {
  const { preferences: userPreferences } = useSelector(
    (state: RootState) => state.preferences,
  );

  // ── state ────────────────────────────────────────────────────────────────
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      source: "api",
      role: "assistant",
      kind: "text",
      content: `Hola ${userPreferences?.name ?? ""} 👋 ¿en qué puedo ayudarte hoy?`,
      timestamp: Date.now(),
      activityItems: [],
    },
  ]);

  const [loading, setLoading] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [partial, setPartial] = React.useState("");
  const [lastTranscript, setLastTranscript] = React.useState("");
  const [level, setLevel] = React.useState(0);

  // ── refs ─────────────────────────────────────────────────────────────────
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<any>(null);
  const finalTextRef = React.useRef("");
  const streamRef = React.useRef<MediaStream | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const rafRef = React.useRef<number | null>(null);

  // ── auto-scroll ───────────────────────────────────────────────────────────
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── TTS ──────────────────────────────────────────────────────────────────
  const stopSpeaking = React.useCallback(() => {
    try {
      window.speechSynthesis?.cancel?.();
    } catch {
      // noop
    }
  }, []);

  const speak = React.useCallback(
    (text: string) => {
      stopSpeaking();
      if (!("speechSynthesis" in window)) return;

      const cleaned = text
        .replace(/UNAH/gi, "una")
        .replace(/PHUMA/gi, "puma")
        .replace(/\*/g, "");

      setSpeaking(true);
      const utter = new SpeechSynthesisUtterance(cleaned);
      utter.lang = "es";
      utter.rate = 1;
      utter.pitch = 1;

      const onEnd = () => {
        setSpeaking(false);
        utter.removeEventListener("end", onEnd);
        utter.removeEventListener("error", onEnd);
      };
      utter.addEventListener("end", onEnd);
      utter.addEventListener("error", onEnd);
      window.speechSynthesis.speak(utter);
    },
    [stopSpeaking],
  );

  // ── audio meter ───────────────────────────────────────────────────────────
  const startAudioMeter = React.useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    streamRef.current = stream;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AudioCtx();
    audioCtxRef.current = ctx;

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.85;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      const a = analyserRef.current;
      if (!a) return;
      a.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const normalized = Math.min(1, Math.max(0, rms * 3));
      setLevel((prev) => prev * 0.7 + normalized * 0.3);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopAudioMeter = React.useCallback(async () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setLevel(0);
    try {
      analyserRef.current?.disconnect?.();
    } catch {
      // noop
    }
    analyserRef.current = null;
    try {
      await audioCtxRef.current?.close?.();
    } catch {
      // noop
    }
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // ── speech recognition ────────────────────────────────────────────────────
  const ensureRecognition = React.useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    const w = window as SpeechRecognitionWindow;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return null;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "es";

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res?.[0]?.transcript ?? "";
        if (res.isFinal) finalTextRef.current += text;
        else interim += text;
      }
      setPartial(interim.trim());
      setLastTranscript(finalTextRef.current.trim());
    };

    rec.onerror = (e: any) => console.error("SpeechRecognition error", e);
    rec.onend = () => {
      /* handled via stopListening */
    };

    recognitionRef.current = rec;
    return rec;
  }, []);

  // ── send via generateStream endpoint ─────────────────────────────────────
  const sendPrompt = React.useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;

      const userMsg: ChatMessage = {
        source: "local",
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let finalAssistantText = "";

      try {
        const result = await AIFeature.api.generateStream(
          {
            prompt: trimmed,
            chat: chatHistory,
            deliveryModes: ["onsite", "online", "hybrid"],
            category: undefined,
            campuses: ["COMAYAGUA"],
            mcpServers: [],
          },
          {
            onChunk: (chunk, fullText) => {
              setMessages((prev) => {
                const copy = [...prev];

                if (chunk.event === "text") {
                  finalAssistantText = fullText;
                  return appendOrUpdateAssistantText(copy, fullText);
                }

                const chunkData = tryParseJson<{
                  url?: string;
                  workflow?: string;
                  name?: string;
                  step?: string;
                  arguments?: unknown;
                  title?: string;
                  workflowSessionId?: string;
                }>(chunk.data);

                if (chunk.event === "image") {
                  copy.push({
                    source: "api",
                    role: "assistant",
                    kind: "image",
                    title: chunkData?.title ?? "Imagen",
                    content: chunkData?.url ?? "",
                    timestamp: Date.now(),
                  });
                  return copy;
                }

                if (chunk.event === "tool_call") {
                  return appendActivityToAssistantText(copy, {
                    kind: "tool_call",
                    title: chunkData?.title ?? "Tool call",
                    details: formatToolCallContent(
                      chunkData?.name,
                      chunkData?.arguments,
                    ),
                  });
                }

                if (chunk.event === "workflow_start") {
                  return appendActivityToAssistantText(copy, {
                    kind: "workflow_start",
                    title: `Flujo ${chunkData?.workflow ?? ""} Iniciado`,
                    details: chunkData?.title ?? "Iniciando flujo...",
                  });
                }

                if (chunk.event === "workflow_step") {
                  return appendActivityToAssistantText(copy, {
                    kind: "workflow_step",
                    title: chunkData?.step ?? "Workflow step",
                    details: chunkData?.title ?? "Procesando paso...",
                  });
                }

                if (chunk.event === "system") {
                  copy.push({
                    source: "api",
                    role: "system",
                    kind: "system",
                    title: "System",
                    content: chunk.data,
                    timestamp: Date.now(),
                  });
                  return copy;
                }

                return copy;
              });
            },
          },
        );

        if (result.status !== "success") {
          setMessages((prev) => prev.slice(0, -1));
          antdMessage.error("Error generando respuesta del modelo.");
        } else if (finalAssistantText) {
          speak(finalAssistantText);
        }
      } catch (err) {
        console.error(err);
        antdMessage.error("Error al comunicar con el modelo AI.");
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    },
    [messages, speak],
  );

  // ── listen controls ───────────────────────────────────────────────────────
  const startListening = React.useCallback(async () => {
    if (loading) return;

    const rec = ensureRecognition();
    if (!rec) {
      antdMessage.error(
        "Tu navegador no soporta SpeechRecognition. Usa Chrome/Edge.",
      );
      return;
    }

    stopSpeaking();
    finalTextRef.current = "";
    setPartial("");
    setLastTranscript("");

    try {
      await startAudioMeter();
    } catch (e) {
      console.error(e);
      antdMessage.error("No se pudo acceder al micrófono. Revisa permisos.");
      return;
    }

    try {
      rec.start();
      setListening(true);
    } catch (e) {
      console.error(e);
      setListening(true);
    }
  }, [ensureRecognition, loading, startAudioMeter, stopSpeaking]);

  const stopListening = React.useCallback(async () => {
    if (!listening) return;

    setListening(false);

    try {
      recognitionRef.current?.stop?.();
    } catch {
      // noop
    }

    await stopAudioMeter();

    const finalText = (finalTextRef.current || "").trim();
    setPartial("");
    setLastTranscript(finalText);

    if (finalText) {
      await sendPrompt(finalText);
    } else {
      antdMessage.info("No se detectó voz. Intenta de nuevo.");
    }
  }, [listening, sendPrompt, stopAudioMeter]);

  // ── spacebar hold-to-talk ─────────────────────────────────────────────────
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      e.preventDefault();
      void startListening();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      void stopListening();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [startListening, stopListening]);

  // ── cleanup on unmount ────────────────────────────────────────────────────
  React.useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // noop
      }
      stopSpeaking();
      void stopAudioMeter();
    };
  }, [stopAudioMeter, stopSpeaking]);

  // ── derived visuals ───────────────────────────────────────────────────────
  const circleScale = 0.85 + level * 1.0;

  const avatarSrc = speaking
    ? "/assets/img/puma-speaking.png"
    : listening
      ? "/assets/img/puma-listening.png"
      : "/assets/img/puma.png";

  const statusLabel = loading
    ? "Pensando..."
    : speaking
      ? "Respondiendo"
      : listening
        ? "Escuchando..."
        : "Listo";

  const statusColor = loading
    ? "#f59e0b"
    : speaking
      ? "#10b981"
      : listening
        ? "#3b82f6"
        : "#6b7280";

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-1 min-h-0 overflow-hidden rounded-se-4xl"
      style={{ height: "calc(100vh)" }}
    >
      {/* ── LEFT PANEL: avatar + controls ────────────────────────────── */}
      <div
        className="flex flex-col items-center justify-between shrink-0"
        style={{
          width: 380,
          background:
            "linear-gradient(160deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)",
          padding: "32px 24px 28px",
          borderRight: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
              marginBottom: 4,
            }}
          >
            Asistente IA
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>
            PumAI
          </div>
        </div>

        {/* Avatar + audio ring */}
        <div
          className="flex flex-col items-center"
          style={{ flex: 1, justifyContent: "center" }}
        >
          <div style={{ width: 240, height: 300 }}>
            <img
              src={avatarSrc}
              alt="Avatar"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                transition: "opacity 0.3s ease",
                filter:
                  "drop-shadow(0 8px 32px rgba(59,130,246,0.35))",
              }}
            />
          </div>

          {/* Audio visualizer ring */}
          <div
            className="relative flex items-center justify-center"
            style={{ width: 180, height: 180, marginTop: -8 }}
          >
            {/* Pulsing outer ring (only while listening) */}
            {listening && (
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: "2px solid rgba(59,130,246,0.4)",
                  transform: `scale(${circleScale})`,
                  transition: "transform 75ms ease-out",
                  background: `radial-gradient(circle, rgba(59,130,246,${0.05 + level * 0.15}) 0%, transparent 70%)`,
                }}
              />
            )}
            {/* Static mid ring */}
            <div
              className="absolute rounded-full"
              style={{
                inset: 20,
                border: `1.5px solid ${listening ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.1)"}`,
                transition: "border-color 0.3s",
              }}
            />
            {/* Center badge */}
            <div
              className="relative z-10 flex flex-col items-center justify-center rounded-full"
              style={{
                width: 112,
                height: 112,
                background: listening
                  ? "rgba(59,130,246,0.18)"
                  : speaking
                    ? "rgba(16,185,129,0.15)"
                    : "rgba(255,255,255,0.06)",
                border: `1.5px solid ${listening ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.12)"}`,
                backdropFilter: "blur(8px)",
                transition: "all 0.3s ease",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: statusColor,
                  transition: "color 0.3s",
                }}
              >
                {statusLabel}
              </div>
              {!loading && (
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.4)",
                    marginTop: 4,
                    textAlign: "center",
                    lineHeight: 1.4,
                  }}
                >
                  {listening ? "Suelta Space" : "Mantén Space"}
                </div>
              )}
              {loading && (
                <Spin size="small" style={{ marginTop: 4 }} />
              )}
            </div>
          </div>
        </div>

        {/* Live transcript bubble */}
        {(partial || (lastTranscript && !loading)) && (
          <div
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 12,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
                marginBottom: 4,
              }}
            >
              Transcripción
            </div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.75)",
                lineHeight: 1.5,
              }}
            >
              {partial || lastTranscript}
            </div>
          </div>
        )}

        {/* Mic button */}
        <button
          disabled={loading}
          onMouseDown={() => void startListening()}
          onMouseUp={() => void stopListening()}
          onMouseLeave={() => {
            if (listening) void stopListening();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            void startListening();
          }}
          onTouchEnd={() => void stopListening()}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            background: listening
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            opacity: loading ? 0.5 : 1,
            transition: "all 0.2s ease",
            boxShadow: listening
              ? "0 4px 20px rgba(239,68,68,0.4)"
              : "0 4px 20px rgba(37,99,235,0.35)",
          }}
        >
          {listening ? (
            <>
              <StopOutlined style={{ fontSize: 16 }} />
              Soltar para enviar
            </>
          ) : (
            <>
              <AudioOutlined style={{ fontSize: 16 }} />
              Mantener para hablar
            </>
          )}
        </button>
      </div>

      {/* ── RIGHT PANEL: chat history ─────────────────────────────────── */}
      <div
        className="flex flex-col flex-1 min-w-0"
        style={{ background: "#f8fafc" }}
      >
        {/* Panel header */}
        <div
          style={{
            padding: "18px 28px",
            borderBottom: "1px solid #e2e8f0",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: loading
                ? "#f59e0b"
                : speaking
                  ? "#10b981"
                  : listening
                    ? "#3b82f6"
                    : "#94a3b8",
              transition: "background 0.3s",
              boxShadow: `0 0 0 3px ${loading
                ? "rgba(245,158,11,0.15)"
                : speaking
                  ? "rgba(16,185,129,0.15)"
                  : listening
                    ? "rgba(59,130,246,0.15)"
                    : "transparent"
                }`,
            }}
          />
          <span
            style={{ fontWeight: 600, color: "#1e293b", fontSize: 15 }}
          >
            Historial de conversación
          </span>
          <span
            style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}
          >
            {messages.length} mensaje{messages.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Messages list */}
        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {messages.map((msg, i) => {
            const previous = messages[i - 1];
            const groupedWithPrevious =
              msg.source === "api" && previous?.source === "api";
            return (
              <AIFeature.components.MessageComponent
                key={i}
                {...msg}
                showHandle={!groupedWithPrevious}
                groupedWithPrevious={groupedWithPrevious}
              />
            );
          })}

          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 0",
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              <Spin size="small" />
              <span>Generando respuesta...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Footer hint */}
        <div
          style={{
            padding: "12px 28px",
            borderTop: "1px solid #e2e8f0",
            background: "#fff",
            fontSize: 12,
            color: "#94a3b8",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          Mantén{" "}
          <kbd
            style={{
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: 4,
              padding: "1px 6px",
              fontFamily: "monospace",
              fontSize: 11,
            }}
          >
            Espacio
          </kbd>{" "}
          para hablar, suelta para enviar
        </div>
      </div>
    </div>
  );
}