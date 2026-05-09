import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, Input, Spin, message as antdMessage, Select } from "antd";
import { FaPaperPlane } from "react-icons/fa";

import AIFeature, { ChatMessage } from "../features/ai";
import GeneralLayout from "../layouts/User";

import { useTranslation } from "react-i18next";

import { useSelector } from "react-redux";
import type { RootState } from "../store";

export const Route = createFileRoute("/chat")({
  component: Page,
});

const WORKFLOW_SESSION_STORAGE_KEY = "pumai-workflow-session-id";

function formatToolCallContent(name?: string, args?: unknown): string {
  const safeName = name?.trim() || "Tool";

  if (!args) {
    return safeName;
  }

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
  const lastMessage = copy[copy.length - 1];

  if (
    lastMessage?.role === "assistant" &&
    lastMessage.source === "api" &&
    lastMessage.kind === "text"
  ) {
    lastMessage.content = nextText;
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
  const lastMessage = copy[copy.length - 1];

  if (
    lastMessage?.role === "assistant" &&
    lastMessage.source === "api" &&
    lastMessage.kind === "text"
  ) {
    const existing = lastMessage.activityItems ?? [];
    const previous = existing[existing.length - 1];

    if (
      previous &&
      previous.kind === activity.kind &&
      previous.title === activity.title &&
      (previous.details ?? "") === (activity.details ?? "")
    ) {
      return copy;
    }

    lastMessage.activityItems = [
      ...existing,
      {
        ...activity,
        timestamp: Date.now(),
      },
    ];
    return copy;
  }

  copy.push({
    source: "api",
    role: "assistant",
    kind: "text",
    content: "",
    timestamp: Date.now(),
    activityItems: [
      {
        ...activity,
        timestamp: Date.now(),
      },
    ],
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

//#region Page
function Page() {
  const { t } = useTranslation(["pages"], {
    keyPrefix: "chat",
  });

  const { preferences: userPreferences } = useSelector(
    (state: RootState) => state.preferences,
  );

  const [currentWorkflowSessionId, setCurrentWorkflowSessionId] = React.useState<string | null>(null);
  const [availableWorkflows, setAvailableWorkflows] = React.useState<Array<{ name: string; description: string }>>([]);
  const [selectedWorkflow, setSelectedWorkflow] = React.useState<string | null>(null);

  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      source: "api",
      role: "assistant",
      content: `Hola ${userPreferences?.name} 👋 ¿en qué puedo ayudarte hoy?`,
      kind: "text",
      timestamp: Date.now(),
    },
  ]);

  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  React.useEffect(() => {
    // Fetch available workflows for the selector
    (async () => {
      try {
        const res = await fetch("/api/workflows/available", { credentials: "include" });
        if (!res.ok) return;
        const payload = await res.json();
        if (payload?.status === "success") {
          setAvailableWorkflows(payload.workflows ?? []);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const chatHistory = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const userMsg: ChatMessage = {
      source: "local",
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const result = await AIFeature.api.generateStream(
        {
          prompt: trimmed,
          workflowSessionId: currentWorkflowSessionId ?? undefined,
          chat: chatHistory,
          deliveryModes: ["onsite", "online", "hybrid"],
          category: undefined,
          campuses: ["COMAYAGUA"],
          mcpServers: [
            // {
            //   name: "Calendario Académico",
            //   url: "https://n8n.asterki.xyz/mcp/a593f38e-a11d-4f90-89a6-6c10e640ff16",
            //   protocol: "streamable-http",
            //   enabled: true,

            // }
          ]
        },
        {
          onChunk: (chunk, fullText) => {
            setMessages((prev) => {
              const copy = [...prev];

              if (chunk.event === "text") {
                return appendOrUpdateAssistantText(copy, fullText);
              }

              const appendMessage = (message: ChatMessage) => {
                copy.push(message);
                return copy;
              };

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
                return appendMessage({
                  source: "api",
                  role: "assistant",
                  kind: "image",
                  title: chunkData?.title ?? "Imagen",
                  content: chunkData?.url ?? "",
                  timestamp: Date.now(),
                });
              }

              if (chunk.event === "workflow_reply") {
                // Structured single reply from a workflow — show as a single
                // assistant message (or image if the reply indicates an image).
                if (chunkData?.type === "image" && chunkData?.content) {
                  return appendMessage({
                    source: "api",
                    role: "assistant",
                    kind: "image",
                    title: "Workflow image",
                    content: chunkData.content,
                    timestamp: Date.now(),
                  });
                }

                const text = typeof chunkData?.content === "string" ? chunkData.content : String(chunk.data);
                return appendOrUpdateAssistantText(copy, text);
              }

              if (chunk.event === "tool_call") {
                return appendActivityToAssistantText(copy, {
                  kind: "tool_call",
                  title: chunkData?.title ?? "Tool call",
                  details: formatToolCallContent(chunkData?.name, chunkData?.arguments),
                });
              }

              if (chunk.event === "workflow_start") {
                console.log("Workflow start chunk data:", chunkData);
                if (chunkData?.workflowSessionId) {
                  setCurrentWorkflowSessionId(chunkData.workflowSessionId);
                  console.log("Updated workflow session ID:", chunkData.workflowSessionId);
                }

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
                return appendMessage({
                  source: "api",
                  role: "system",
                  kind: "system",
                  title: "System",
                  content: chunk.data,
                  timestamp: Date.now(),
                });
              }

              return copy;
            });
          },
        },
      );


      if (result.status !== "success") {
        setMessages((prev) => prev.slice(0, -1));
        antdMessage.error("Error generando respuesta del modelo.");
      }
    } catch (err) {
      console.error(err);
      antdMessage.error("Error al comunicar con el modelo AI.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const startSelectedWorkflow = async () => {
    if (!selectedWorkflow) return;

    try {
      const res = await fetch("/api/workflows/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: selectedWorkflow }),
      });

      if (!res.ok) {
        antdMessage.error("No se pudo iniciar el flujo.");
        return;
      }

      const payload = await res.json();
      if (payload?.status === "success") {
        setCurrentWorkflowSessionId(payload.workflowSessionId ?? null);

        setMessages((prev) =>
          appendActivityToAssistantText([...prev], {
            kind: "workflow_start",
            title: `Flujo ${selectedWorkflow} Iniciado`,
            details: payload.nextStep ? `Siguiente: ${payload.nextStep}` : "Completado",
          }),
        );

        if (Array.isArray(payload.replies) && payload.replies.length > 0) {
          setMessages((prev) => {
            const copy = [...prev];
            return appendOrUpdateAssistantText(copy, payload.replies.map((r: any) => r.content).join("\n"));
          });
        }
      }
    } catch (err) {
      console.error(err);
      antdMessage.error("Error iniciando el flujo.");
    }
  };

  const cancelWorkflow = async () => {
    if (!currentWorkflowSessionId) return;

    try {
      const res = await fetch("/api/workflows/clear-session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currentWorkflowSessionId }),
      });

      if (res.ok) {
        setCurrentWorkflowSessionId(null);
        setMessages((prev) =>
          appendActivityToAssistantText([...prev], {
            kind: "workflow_step",
            title: "Flujo cancelado",
            details: "El flujo ha sido cancelado por el usuario",
          }),
        );
      } else {
        antdMessage.error("No se pudo cancelar el flujo.");
      }
    } catch (err) {
      console.error(err);
      antdMessage.error("Error al cancelar el flujo.");
    }
  };

  return (
    <GeneralLayout selectedPage="chat">
      <div className="flex flex-col flex-1 min-h-0 rounded-xl overflow-hidden text-white">
        <div
          ref={containerRef}
          className="flex-1 min-h-0 overflow-y-auto max-h-[calc(100vh-184px)] flex flex-col px-6 md:px-40 py-6"
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
            <div className="flex justify-center py-4">
              <Spin tip="Pensando..." />
            </div>
          )}
        </div>

        <div className="bottom-0 h-[120px] absolute w-full shrink-0 border-t border-white/10 bg-white/10">
          <div className="md:p-4 p-2 flex items-end md:gap-3 gap-2">
            <div className="flex items-center gap-2 mr-2">
              <Select
                placeholder="Seleccionar flujo..."
                value={selectedWorkflow ?? undefined}
                onChange={(v) => setSelectedWorkflow(v)}
                style={{ minWidth: 220 }}
                options={availableWorkflows.map((w) => ({ label: `${w.name} — ${w.description}`, value: w.name }))}
                allowClear
              />
              <Button onClick={startSelectedWorkflow} disabled={!selectedWorkflow}>
                Iniciar
              </Button>
              <Button danger onClick={cancelWorkflow} disabled={!currentWorkflowSessionId}>
                Cancelar
              </Button>
            </div>
            <Input.TextArea
              autoSize={{ maxRows: 6 }}
              placeholder={t("input.placeholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              classNames={{
                textarea:
                  "bg-transparent dark:text-white placeholder:text-neutral-400 border-none focus:ring-0 resize-none",
              }}
            />
            <Button
              type="primary"
              icon={<FaPaperPlane />}
              loading={loading}
              onClick={sendMessage}
              className="rounded-full px-5 py-2 font-medium"
            >
              <div className="hidden sm:block">{t("input.sendButton")}</div>
            </Button>
          </div>

          <p className="mb-2 text-center text-sm text-gray-400">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </GeneralLayout>
  );
}
