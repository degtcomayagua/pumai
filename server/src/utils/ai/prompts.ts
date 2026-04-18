import type { Message, Tool, Options } from "ollama";

import { DEFAULT_SYSTEM_PROMPT } from "../../../../shared/constants/prompts";
import { OllamaMcpServer } from "../../types/ollama";

function formatToolSummary(tools: Tool[]): string {
  if (tools.length === 0) {
    return "";
  }

  return tools
    .map((tool) => {
      const name = tool.function.name ?? "herramienta-sin-nombre";
      const description = tool.function.description?.trim();

      return description ? `- ${name}: ${description}` : `- ${name}`;
    })
    .join("\n");
}

function formatMcpServerSummary(servers: OllamaMcpServer[]): string {
  if (servers.length === 0) {
    return "";
  }

  return servers
    .map((server) => {
      const toolSummary = formatToolSummary(server.tools);
      const lines = [
        `Servidor MCP: ${server.name}`,
        server.description ? `Descripción: ${server.description}` : null,
        toolSummary ? `Herramientas:\n${toolSummary}` : null,
      ].filter(Boolean);

      return lines.join("\n");
    })
    .join("\n\n");
}

export function buildSystemPrompt(params: {
  context?: string;
  tools?: Tool[];
  mcpServers?: OllamaMcpServer[];
  systemPrompt?: string;
} = {}): string {
  const currentDate = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const sections = [
    params.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT.trim(),
    `Fecha actual: ${currentDate}`,
    params.context?.trim()
      ? `Contexto seguro:\n"""\n${params.context.trim()}\n"""`
      : null,
    params.tools?.length
      ? `Herramientas disponibles:\n${formatToolSummary(params.tools)}`
      : null,
    params.mcpServers?.length
      ? `Servidores MCP disponibles:\n${formatMcpServerSummary(params.mcpServers)}`
      : null,
    params.tools?.length || params.mcpServers?.length
      ? "Si necesitas usar una herramienta, hazlo antes de responder y no inventes resultados de herramientas."
      : null,
  ].filter(Boolean);

  return sections.join("\n\n");
}

export function buildFinalPrompt(context: string, prompt: string): string {
  return [
    "Contexto seguro:",
    "```text",
    context.trim(),
    "```",
    "",
    "Pregunta del usuario:",
    "```text",
    prompt.trim(),
    "```",
    "",
    "Responde de forma directa y en español.",
  ].join("\n");
}

export function trimChatHistory(chat: Message[], maxMessages = 20): Message[] {
  const sanitized = chat.filter((message) => {
    if (message.role === "system") {
      return false;
    }

    return message.content.trim().length > 0;
  });

  if (sanitized.length <= maxMessages) {
    return sanitized;
  }

  return sanitized.slice(sanitized.length - maxMessages);
}

