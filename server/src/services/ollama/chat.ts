import { ChatRequest, Message, Ollama, Options, Tool } from "ollama";

import OllamaClient from "./client";
import {
  buildFinalPrompt,
  buildSystemPrompt as composeSystemPrompt,
  trimChatHistory,
} from "../../utils/ai/prompts";
import type { OllamaChatRequest, OllamaMcpServer } from "./types";

class OllamaChatService {
  private static instance: OllamaChatService | null = null;
  private client: Ollama = OllamaClient.getInstance().getClient();

  public getFinalPrompt(context: string, prompt: string) {
    return buildFinalPrompt(context, prompt);
  }

  public buildSystemPrompt(
    context?: string,
    tools?: Tool[],
    mcpServers?: OllamaMcpServer[],
    systemPrompt?: string,
  ) {
    return composeSystemPrompt({ context, tools, mcpServers, systemPrompt });
  }

  public static getInstance() {
    if (!OllamaChatService.instance)
      OllamaChatService.instance = new OllamaChatService();
    return OllamaChatService.instance;
  }

  constructor() {
    // Nothing to do here
  }

  private resolveModel() {
    return process.env.OLLAMA_MODEL || "gemma3:12b";
  }

  private buildRequest(request: OllamaChatRequest): ChatRequest {
    const chat = trimChatHistory(request.chat ?? []);
    const tools = [
      ...(request.tools ?? []),
      ...(request.mcpServers ?? []).flatMap((server) => server.tools),
    ];

    return {
      model: this.resolveModel(),
      stream: request.stream ?? false,
      messages: [
        {
          role: "system",
          content: this.buildSystemPrompt(
            request.context,
            request.tools,
            request.mcpServers,
            request.systemPrompt,
          ),
        },
        ...chat,
        { role: "user", content: request.prompt },
      ] as Message[],
      tools: tools.length ? tools : undefined,
      options: {
        ...request.options,
        num_gpu: 9999,
        temperature: 0.2
      },
    };
  }

  async generateChat<T>(request: OllamaChatRequest): Promise<T>;
  async generateChat<T>(
    prompt: string,
    chat?: Message[],
    stream?: boolean,
    options?: Partial<Options>,
    tools?: Tool[],
    mcpServers?: OllamaMcpServer[],
    systemPrompt?: string,
  ): Promise<T>;
  async generateChat<T>(
    promptOrRequest: string | OllamaChatRequest,
    chat: Message[] = [],
    stream = false,
    options?: Partial<Options>,
    tools: Tool[] = [],
    mcpServers: OllamaMcpServer[] = [

    ],
    systemPrompt?: string,
  ): Promise<T> {
    const request =
      typeof promptOrRequest === "string"
        ? {
          prompt: promptOrRequest,
          chat,
          stream,
          options,
          tools,
          mcpServers,
          systemPrompt,
        }
        : promptOrRequest;

    const requestPayload = this.buildRequest(request);

    if (requestPayload.stream) {
      const response = await this.client.chat({
        ...requestPayload,
        stream: true,
      });

      return response as unknown as T;
    }

    const response = await this.client.chat({
      ...requestPayload,
      stream: false,
    });

    return response as unknown as T;
  }
}

export default OllamaChatService;
