import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, Input, Spin, message as antdMessage } from "antd";
import { FaPaperPlane } from "react-icons/fa";

import AIFeature, { ChatMessage } from "../features/ai";
import GeneralLayout from "../layouts/General";

import { useTranslation } from "react-i18next";

import { useSelector } from "react-redux";
import type { RootState } from "../store";

export const Route = createFileRoute("/chat")({
  component: Page,
});

function Page() {
  const { t } = useTranslation(["pages"], {
    keyPrefix: "chat",
  });

  const { preferences: userPreferences } = useSelector(
    (state: RootState) => state.preferences,
  );

  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      source: "api",
      role: "assistant",
      content: `Hola ${userPreferences?.name} 👋 ¿en qué puedo ayudarte hoy?`,
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
      setMessages((prev) => [
        ...prev,
        {
          source: "api",
          role: "assistant",
          content: "",
          timestamp: Date.now(),
        },
      ]);

      const result = await AIFeature.api.generateStream(
        {
          prompt: trimmed,
          chat: chatHistory,
          deliveryModes: ["onsite", "online", "hybrid"],
          category: undefined,
          campuses: ["TEGUCIGALPA"],
          mcpServers: [
            {
              name: "Calendario Académico",
              url: "https://n8n.asterki.xyz/mcp/a593f38e-a11d-4f90-89a6-6c10e640ff16",
              protocol: "streamable-http",
              enabled: true,

            }
          ]
        },
        {
          onChunk: (_chunk, fullText) => {
            setMessages((prev) => {
              const copy = [...prev];
              const lastMessage = copy[copy.length - 1];

              if (
                lastMessage?.role === "assistant" &&
                lastMessage.source === "api"
              ) {
                lastMessage.content = fullText;
                return copy;
              }

              copy.push({
                source: "api",
                role: "assistant",
                content: fullText,
                timestamp: Date.now(),
              });

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
          className="flex-1 min-h-0 overflow-y-auto max-h-[calc(100vh-184px)] flex flex-col gap-4 px-6 md:px-40 py-6"
        >
          {messages.map((msg, i) => (
            <AIFeature.components.MessageComponent key={i} {...msg} />
          ))}

          {loading && (
            <div className="flex justify-center py-4">
              <Spin tip="Pensando..." />
            </div>
          )}
        </div>

        <div className="bottom-0 h-[120px] absolute w-full shrink-0 border-t border-white/10 bg-white/10">
          <div className="md:p-4 p-2 flex items-end md:gap-3 gap-2">
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
