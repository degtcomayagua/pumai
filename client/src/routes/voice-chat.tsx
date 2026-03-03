import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, Spin, message as antdMessage, Typography, Card } from "antd";
import { AudioOutlined, StopOutlined } from "@ant-design/icons";

import AIFeature, { ChatMessage } from "../features/ai";
import GeneralLayout from "../layouts/General";

import { useSelector } from "react-redux";
import type { RootState } from "../store";

export const Route = createFileRoute("/voice-chat")({
  component: Page,
});

/**
 * Notes:
 * - Uses Web Speech API (SpeechRecognition) for transcription (best in Chrome/Edge).
 * - Uses Web Audio API (AnalyserNode) for volume -> circle size.
 * - Uses SpeechSynthesis to speak the AI response.
 */

type SpeechRecognitionType = typeof window & {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
};

function Page() {
  const { preferences: userPreferences } = useSelector(
    (state: RootState) => state.preferences,
  );

  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      source: "api",
      role: "assistant",
      content: `Hola ${userPreferences?.name ?? ""} ¿en qué puedo ayudarte hoy?`,
      timestamp: Date.now(),
    },
  ]);

  const [loading, setLoading] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [partial, setPartial] = React.useState<string>("");
  const [lastTranscript, setLastTranscript] = React.useState<string>("");

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Speech recognition refs
  const recognitionRef = React.useRef<any>(null);
  const finalTextRef = React.useRef<string>("");

  // Audio visualization refs
  const streamRef = React.useRef<MediaStream | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const rafRef = React.useRef<number | null>(null);

  // Circle size (0..1)
  const [level, setLevel] = React.useState(0);

  React.useEffect(() => {
    const container = containerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, loading]);

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

      setSpeaking(true);
      // Replace all instances of UNAH to una
      text = text.replace(/UNAH/gi, "una");
      text = text.replace(/PHUMA/gi, "puma");
      text = text.replace(/\*/gi, "");

      if (!("speechSynthesis" in window)) return;

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "es"; // set your locale if needed, e.g. "es-HN"
      utter.rate = 1;
      utter.pitch = 1;

      window.speechSynthesis.speak(utter);

      const onEnd = () => {
        setSpeaking(false);
        utter.removeEventListener("end", onEnd);
        utter.removeEventListener("error", onEnd);
      };
      utter.addEventListener("end", onEnd);
      utter.addEventListener("error", onEnd);
    },
    [stopSpeaking],
  );

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

      // RMS on waveform -> 0..1-ish
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length); // ~0..0.5 typical
      const normalized = Math.min(1, Math.max(0, rms * 3)); // boost

      // Light smoothing in state updates
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

    const s = streamRef.current;
    if (s) s.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const ensureRecognition = React.useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;

    const w = window as SpeechRecognitionType;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return null;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "es"; // set "es-HN" if you prefer

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res?.[0]?.transcript ?? "";
        if (res.isFinal) {
          finalTextRef.current += text;
        } else {
          interim += text;
        }
      }
      setPartial(interim.trim());
      setLastTranscript(finalTextRef.current.trim());
    };

    rec.onerror = (e: any) => {
      console.error("SpeechRecognition error", e);
      // Don’t hard-fail; user can retry
    };

    rec.onend = () => {
      // Browser stops recognition sometimes; if user is still "listening",
      // we do nothing here and rely on our stop handler to end session.
    };

    recognitionRef.current = rec;
    return rec;
  }, []);

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

      try {
        const result = await AIFeature.api.generate({
          prompt: trimmed,
          chat: [...messages, userMsg],
          deliveryModes: ["onsite", "online", "hybrid"],
          category: undefined,
          campuses: ["COMAYAGUA"],
        });

        if (result.status === "success") {
          const aiMsg: ChatMessage = {
            source: "api",
            role: "assistant",
            content: result.result,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, aiMsg]);
          speak(result.result);
        } else {
          antdMessage.error("Error generando respuesta del modelo.");
        }
      } catch (err) {
        console.error(err);
        antdMessage.error("Error al comunicar con el modelo AI.");
      } finally {
        setLoading(false);
      }
    },
    [messages, speak],
  );

  const startListening = React.useCallback(async () => {
    if (loading) return;

    const rec = ensureRecognition();
    if (!rec) {
      antdMessage.error(
        "Tu navegador no soporta SpeechRecognition. Usa Chrome/Edge o implementa STT en servidor.",
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
      // start() can throw if already started
      console.error(e);
      setListening(true);
    }
  }, [ensureRecognition, loading, startAudioMeter, stopSpeaking]);

  const stopListening = React.useCallback(async () => {
    if (!listening) return;

    setListening(false);

    const rec = recognitionRef.current;
    try {
      rec?.stop?.();
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

  // Spacebar: hold-to-talk (press = start, release = stop)
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (e.repeat) return;
      // Avoid interfering with focused inputs if any exist
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

  // Cleanup on unmount
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

  const circleScale = 0.9 + level * 0.9; // 0.9..1.8-ish

  return (
    <GeneralLayout selectedPage="chat">
      <div className="flex flex-col flex-1 min-h-0 rounded-xl overflow-hidden">
        {/* Top area: visual + controls */}
        <div className="relative flex items-center justify-center px-6 py-6">
          <div className="w-full flex flex-col items-center gap-4">
            <Typography.Title level={3} className="!m-0 text-center">
              Chat por voz
            </Typography.Title>

            <div className="flex gap-10 justify-center w-full">
              {/* Messages */}

              <div>
                <div className="flex items-start gap-10 flex-wrap justify-center">
                  <Button
                    type="primary"
                    icon={listening ? <StopOutlined /> : <AudioOutlined />}
                    danger={listening}
                    onMouseDown={() => void startListening()}
                    onMouseUp={() => void stopListening()}
                    onMouseLeave={() => void stopListening()}
                    onTouchStart={() => void startListening()}
                    onTouchEnd={() => void stopListening()}
                    disabled={loading}
                  >
                    {listening ? "Soltar para enviar" : "Mantener para hablar"}
                  </Button>

                  <Card size="small" style={{ minWidth: 320 }}>
                    <div style={{ fontSize: 12, color: "#4b5563" }}>
                      Transcripción (en vivo)
                    </div>
                    <div style={{ marginTop: 6, minHeight: 22 }}>
                      {partial || lastTranscript || (
                        <span style={{ color: "#9ca3af" }}>…</span>
                      )}
                    </div>
                  </Card>
                </div>
                <div
                  ref={containerRef}
                  className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 px-6 py-6 w-full"
                  style={{
                    background: "#f5f7fb",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  {messages.map((msg, i) => (
                    <AIFeature.components.MessageComponent key={i} {...msg} />
                  ))}
                </div>
              </div>

              <div className="w-1/2 flex items-center justify-start flex-col gap-10">
                {!speaking && !listening && (
                  <img
                    src="/assets/img/puma.png"
                    alt="Puma"
                    style={{ height: 480 }}
                  />
                )}

                {!speaking && listening && (
                  <img
                    src="/assets/img/puma-listening.png"
                    alt="Puma speaking + listening"
                    style={{ height: 480 }}
                  />
                )}

                {speaking && !listening && (
                  <img
                    src="/assets/img/puma-speaking.png"
                    alt="Puma speaking"
                    style={{ height: 480 }}
                  />
                )}

                <div className="w-full flex items-center justify-center">
                  <div className="relative h-[260px] w-[260px] flex items-center justify-center">
                    <div
                      className={[
                        "absolute inset-0 rounded-full transition-transform duration-75",
                        listening ? "shadow-lg" : "shadow-md",
                      ].join(" ")}
                      style={{
                        transform: `scale(${circleScale})`,
                        background: listening
                          ? "rgba(30,57,118,0.15)"
                          : "rgba(30,57,118,0.08)",
                        border: `2px solid ${listening ? "rgba(30,57,118,0.55)" : "rgba(30,57,118,0.30)"}`,
                      }}
                    />
                    <div
                      className="relative z-10 rounded-full flex flex-col items-center justify-center text-center px-6"
                      style={{
                        height: 160,
                        width: 160,
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "#1f2937" }}>
                        {listening ? "Escuchando" : "Listo"}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#4b5563", marginTop: 6 }}
                      >
                        {listening
                          ? "Suelta Space para enviar"
                          : "Mantén Space o usa el botón"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {loading && (
              <div className="flex justify-center py-2">
                <Spin tip="Pensando..." />
              </div>
            )}
          </div>
        </div>
      </div>
    </GeneralLayout>
  );
}
