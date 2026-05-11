import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, Input, Spin, message as antdMessage, Select, Tag, Tabs, Divider, Empty } from "antd";
import { FaPaperPlane, FaRobot, FaMagic, FaTimes } from "react-icons/fa";

import AIFeature, { ChatMessage } from "../features/ai";
import GeneralLayout from "../layouts/User";

import { useTranslation } from "react-i18next";

import { useSelector } from "react-redux";
import type { RootState } from "../store";

export const Route = createFileRoute("/chat")({
  component: Page,
});

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

  // If the last message is an assistant text, update it in place.
  if (
    lastMessage?.role === "assistant" &&
    lastMessage.source === "api" &&
    lastMessage.kind === "text"
  ) {
    // Avoid updating if the content is identical (no-op)
    if (lastMessage.content === nextText) return copy;
    lastMessage.content = nextText;
    return copy;
  }

  // Otherwise, check the most recent assistant text message anywhere in the
  // history to avoid pushing duplicates when other items (images, system
  // messages) were inserted between incremental updates.
  for (let i = copy.length - 1; i >= 0; i--) {
    const msg = copy[i];
    if (msg.source === "api" && msg.role === "assistant" && msg.kind === "text") {
      if (msg.content === nextText) {
        // Duplicate of the most recent assistant text — do not push.
        return copy;
      }
      break;
    }
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

  // Left commented for a future feature to allow users to select workflows and MCP servers for each message 
  // const [availableWorkflows, setAvailableWorkflows] = React.useState<Array<{ name: string; description: string }>>([]);
  // const [availableMcpServers, setAvailableMcpServers] = React.useState<Array<{ id: string; name: string; description?: string; url: string; protocol?: string }>>([]);
  // const [selectedMcpServers, setSelectedMcpServers] = React.useState<string[]>([]);
  // const [mcpServersLoading, setMcpServersLoading] = React.useState(false);
  // const [workflowsLoading, setWorkflowsLoading] = React.useState(false);

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
  const lastChunkKeyRef = React.useRef<string | null>(null);
  const EVENT_SEPARATOR = "<<EVENT SEPARATOR>>";
  const lastFullTextRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  React.useEffect(() => {
    // Fetch available workflows for the selector
    // (async () => {
    //   try {
    //     setWorkflowsLoading(true);
    //     const res = await fetch("/api/workflows/available", { credentials: "include" });
    //     if (!res.ok) return;
    //     const payload = await res.json();
    //     if (payload?.status === "success") {
    //       setAvailableWorkflows(payload.workflows ?? []);
    //     }
    //   } catch (e) {
    //     // ignore
    //   } finally {
    //     setWorkflowsLoading(false);
    //   }
    // })();

    // // Fetch available MCP servers
    // (async () => {
    //   try {
    //     setMcpServersLoading(true);
    //     const res = await fetch("/api/mcp-servers", { credentials: "include" });
    //     if (!res.ok) return;
    //     const payload = await res.json();
    //     if (payload?.status === "success" && Array.isArray(payload.mcpServers)) {
    //       setAvailableMcpServers(payload.mcpServers ?? []);
    //     }
    //   } catch (e) {
    //     // ignore
    //   } finally {
    //     setMcpServersLoading(false);
    //   }
    // })();
  }, []);

  const segmentStartRef = React.useRef<number>(0);
  const forceNewMessageRef = React.useRef<boolean>(false);
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

    // Reset all streaming state before a new request
    segmentStartRef.current = 0;
    lastFullTextRef.current = null;
    lastChunkKeyRef.current = null;
    forceNewMessageRef.current = false;

    try {
      const result = await AIFeature.api.generateStream(
        {
          prompt: trimmed,
          workflowSessionId: currentWorkflowSessionId ?? undefined,
          chat: chatHistory,
          deliveryModes: ["onsite", "online", "hybrid"],
          category: undefined,
          campuses: ["COMAYAGUA"],
        },
        {
          onChunk: (chunk, rawFul) => {
            setMessages((prev) => {
              const copy = [...prev];

              const appendMessage = (message: ChatMessage) => {
                copy.push(message);
                return copy;
              };

              if (chunk.event === "separator") {
                const fullText = rawFul ?? "";
                // Only take the slice for THIS segment, not the entire accumulated string
                const segmentText = fullText.slice(segmentStartRef.current);

                if (segmentText && lastFullTextRef.current !== segmentText) {
                  lastFullTextRef.current = segmentText;
                  appendOrUpdateAssistantText(copy, segmentText, false);
                }

                // Advance the segment start offset to the current end of rawFul
                segmentStartRef.current = fullText.length;

                // Force the next text chunk to create a NEW message bubble
                forceNewMessageRef.current = true;
                lastFullTextRef.current = null;
                lastChunkKeyRef.current = null;

                return copy;
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

              if (chunk.event === "text") {
                // Compute only the text belonging to the current segment
                const segmentText = (rawFul ?? "").slice(segmentStartRef.current);

                if (lastFullTextRef.current === segmentText) return copy;
                lastFullTextRef.current = segmentText;

                // forceNewMessageRef is consumed inside appendOrUpdateAssistantText
                return appendOrUpdateAssistantText(copy, segmentText, forceNewMessageRef.current);
              }

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
                const replyData = tryParseJson<{ type: string; content: string }>(chunk.data);
                if (replyData?.type === "image" && replyData?.content) {
                  return appendMessage({
                    source: "api",
                    role: "assistant",
                    kind: "image",
                    title: "Workflow image",
                    content: replyData.content,
                    timestamp: Date.now(),
                  });
                }

                const text =
                  typeof replyData?.content === "string"
                    ? replyData.content
                    : String(chunk.data);
                return appendOrUpdateAssistantText(copy, text, forceNewMessageRef.current);
              }

              if (chunk.event === "tool_call") {
                return appendActivityToAssistantText(copy, {
                  kind: "tool_call",
                  title: chunkData?.title ?? "Tool call",
                  details: formatToolCallContent(chunkData?.name, chunkData?.arguments),
                });
              }

              if (chunk.event === "workflow_start") {
                if (chunkData?.workflowSessionId) {
                  setCurrentWorkflowSessionId(chunkData.workflowSessionId);
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
  return (
    <GeneralLayout selectedPage="chat">
      {/* Floating Image Background (decorative, subtle) */}
      <img
        src="/assets/img/sol-cut-right.png"
        alt="background decoration"
        className="absolute right-0 top-0 h-[80vh] z-10 overflow-hidden opacity-[0.03] pointer-events-none select-none"
      />

      <div className="relative flex flex-col h-[calc(100vh-80px)] z-20 text-white overflow-hidden">
        {/* Chat Messages Area - fills remaining space and scrolls */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 overflow-y-auto flex flex-col px-6 md:px-60 py-6 relative z-10 pb-28"
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

        {/* Input Area - sticky at bottom */}
        <div className="sticky bottom-0 shrink-0 border-t border-white/10 bg-white/10 py-3 px-4 z-30">
          <div className="flex items-end gap-3">
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 6 }}
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
              className="rounded-full px-5 py-2 font-medium h-10"
            >
              <div className="hidden sm:block">{t("input.sendButton")}</div>
            </Button>
          </div>

          <p className="mt-2 text-center text-xs text-gray-400">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </GeneralLayout>
  );
}
