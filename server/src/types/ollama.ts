import type { Message, Tool, Options } from "ollama";

export type OllamaToolDefinition = Tool;

export type OllamaMcpServer = {
  name: string;
  description?: string;
  tools: Tool[];
};

export type OllamaChatRequest = {
  prompt: string;
  chat?: Message[];
  stream?: boolean;
  options?: Partial<Options>;
  tools?: Tool[];
  mcpServers?: OllamaMcpServer[];
  systemPrompt?: string;
  context?: string;
};