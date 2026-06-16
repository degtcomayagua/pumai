import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, Input, Spin, message as antdMessage, Modal, Tabs, List, Empty, Skeleton } from "antd";
import { FaPaperPlane, FaPlus } from "react-icons/fa";

import AIFeature, { ChatMessage } from "../features/ai";
import GeneralLayout from "../layouts/User";
import WorkflowsFeature from "../features/workflows";
import MCPServersFeature from "../features/mcp-servers";

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
  const [selectedWorkflows, setSelectedWorkflows] = React.useState<string[]>([]);
  const [selectedMCPServers, setSelectedMCPServers] = React.useState<string[]>([]);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = React.useState(false);

  // Workflows hook
  const { workflows, fetchWorkflows, workflowsListState } = WorkflowsFeature.hooks.useWorkflowsList({});

  // MCP Servers hook
  const { mcpServers, fetchMCPServers, mcpServersListState } = MCPServersFeature.hooks.useMCPServerList({});

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

  // Fetch workflows and MCP servers when modal opens
  React.useEffect(() => {
    if (isSelectionModalOpen) {
      fetchWorkflows({});
      fetchMCPServers({});
    }
  }, [isSelectionModalOpen]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

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
          mcpServers: selectedMCPServers
            .map((serverId) => mcpServers.mcpServers.find((s) => s.id === serverId))
            .filter(Boolean)
            .map((server) => ({
              name: server!.name,
              url: server!.url,
              protocol: "streamable-http" as const,
              enabled: true,
            })),
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

        <div className="bottom-0 h-[120px] bg-white z-100 absolute w-full shrink-0 border-t border-white/10">
          <div className="md:p-4 p-2 flex items-end md:gap-3 gap-2">
            {/* <Button
              icon={<FaPlus />}
              onClick={() => setIsSelectionModalOpen(true)}
              className="rounded-full p-2 h-auto"
              title="Select workflows or MCP servers"
            /> */}
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

        <div className="fixed top-0 right-0 h-screen overflow-hidden">
          <img
            src="/assets/img/sol-cut.png"
            className="-scale-x-100 h-screen w-auto max-w-none opacity-10"
          />
        </div>

        {/* Selection Modal */}
        <Modal
          title="Select Workflows or MCP Servers"
          open={isSelectionModalOpen}
          onCancel={() => setIsSelectionModalOpen(false)}
          width={700}
          footer={[
            <Button key="cancel" onClick={() => setIsSelectionModalOpen(false)}>
              Cancel
            </Button>,
            <Button
              key="submit"
              type="primary"
              onClick={() => setIsSelectionModalOpen(false)}
            >
              Done
            </Button>,
          ]}
        >
          <Tabs
            items={[
              {
                key: "workflows",
                label: "Workflows",
                children: (
                  <div>
                    {workflowsListState.loading ? (
                      <Skeleton active paragraph={{ rows: 4 }} />
                    ) : workflows.workflows.length === 0 ? (
                      <Empty description="No workflows found" />
                    ) : (
                      <List
                        dataSource={workflows.workflows.filter((w) => w.isActive)}
                        renderItem={(workflow) => (
                          <List.Item
                            key={workflow.id}
                            onClick={() => {
                              setSelectedWorkflows((prev) =>
                                prev.includes(workflow.id)
                                  ? prev.filter((id) => id !== workflow.id)
                                  : [...prev, workflow.id]
                              );
                            }}
                            className={`cursor-pointer p-3 rounded border ${selectedWorkflows.includes(workflow.id)
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-gray-300 hover:border-gray-400"
                              }`}
                          >
                            <List.Item.Meta
                              title={workflow.name}
                              description={`Type: ${workflow.type} | URL: ${workflow.url}`}
                            />
                          </List.Item>
                        )}
                      />
                    )}
                  </div>
                ),
              },
              {
                key: "mcp-servers",
                label: "MCP Servers",
                children: (
                  <div>
                    {mcpServersListState.loading ? (
                      <Skeleton active paragraph={{ rows: 4 }} />
                    ) : mcpServers.mcpServers.length === 0 ? (
                      <Empty description="No MCP servers found" />
                    ) : (
                      <List
                        dataSource={mcpServers.mcpServers.filter((s) => s.isActive)}
                        renderItem={(server) => (
                          <List.Item
                            key={server.id}
                            onClick={() => {
                              setSelectedMCPServers((prev) =>
                                prev.includes(server.id)
                                  ? prev.filter((id) => id !== server.id)
                                  : [...prev, server.id]
                              );
                            }}
                            className={`cursor-pointer p-3 rounded border ${selectedMCPServers.includes(server.id)
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-gray-300 hover:border-gray-400"
                              }`}
                          >
                            <List.Item.Meta
                              title={server.name}
                              description={`URL: ${server.url}`}
                            />
                          </List.Item>
                        )}
                      />
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Modal>
      </div>
    </GeneralLayout>
  );
}
