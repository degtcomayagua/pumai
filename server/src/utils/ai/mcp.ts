import { Tool, ToolCall } from "ollama";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

import { OllamaMcpServer } from "../../types/ollama.js";
import {
  ExecutedToolCall,
  MCPDiscoveryCacheValue,
  MCPServerConfig,
  MCPServerProtocol,
  ResolvedMcpCatalog,
} from "../../types/mcp.js";

const MCP_DISCOVERY_CACHE_TTL_MS = 60_000;

const mcpDiscoveryCache = new Map<string, MCPDiscoveryCacheValue>();

/// TODO: Replace with a more robust solution if we end up with many MCP servers or large tool lists, but this will help avoid repeated discovery calls during development and testing. We can also consider adding an endpoint to manually trigger cache invalidation if needed.
export const CENTRALIZED_AI_MCP_SERVERS: MCPServerConfig[] = [
  {
    name: "Calendario Académico",
    description:
      "Proporciona información sobre eventos y fechas importantes en el calendario académico de la UNAH.",
    url:
      process.env.MCP_CALENDAR_URL ??
      "https://n8n.asterki.xyz/mcp/a593f38e-a11d-4f90-89a6-6c10e640ff16",
    protocol: "streamable-http",
    enabled: true,
  },
];

function getMcpCacheKey(server: MCPServerConfig, protocol: MCPServerProtocol) {
  return `${server.name}:${protocol}:${server.url}`;
}

function mapMcpToolToOllamaTool(tool: {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}): Tool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  };
}

function normalizeMcpServers(
  requestServers: MCPServerConfig[] = [],
): MCPServerConfig[] {
  const centralizedServers = CENTRALIZED_AI_MCP_SERVERS.filter(
    (server) => server.enabled !== false,
  );

  const merged = [...centralizedServers, ...requestServers];
  const uniqueByEndpoint = new Map<string, MCPServerConfig>();

  for (const server of merged) {
    if (server.enabled === false) {
      continue;
    }

    const protocol = server.protocol ?? "streamable-http";
    uniqueByEndpoint.set(`${protocol}:${server.url}`, {
      ...server,
      protocol,
    });
  }

  return Array.from(uniqueByEndpoint.values());
}

function getTransport(url: string, protocol: MCPServerProtocol) {
  const serverUrl = new URL(url);
  return protocol === "sse"
    ? new SSEClientTransport(serverUrl)
    : new StreamableHTTPClientTransport(serverUrl);
}

function formatCallToolResult(result: any): string {
  const content = Array.isArray(result?.content) ? result.content : [];
  const textParts: string[] = [];

  for (const item of content) {
    if (item?.type === "text" && typeof item.text === "string") {
      textParts.push(item.text);
      continue;
    }

    if (item?.type === "resource" && typeof item?.resource?.text === "string") {
      textParts.push(item.resource.text);
      continue;
    }

    textParts.push(JSON.stringify(item));
  }

  if (textParts.length > 0) {
    return textParts.join("\n").trim();
  }

  if (typeof result === "string") {
    return result;
  }

  return JSON.stringify(result);
}

async function discoverMcpToolsWithProtocol(
  server: MCPServerConfig,
  protocol: MCPServerProtocol,
): Promise<OllamaMcpServer> {
  const cacheKey = getMcpCacheKey(server, protocol);
  const cached = mcpDiscoveryCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const client = new Client(
    {
      name: "pumai-mcp-discovery-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  const transport = getTransport(server.url, protocol);

  try {
    await client.connect(transport);
    const toolsResult = await client.listTools();

    const discoveredServer: OllamaMcpServer = {
      name: server.name,
      description: server.description,
      tools: toolsResult.tools.map((tool) =>
        mapMcpToolToOllamaTool({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }),
      ),
    };

    mcpDiscoveryCache.set(cacheKey, {
      expiresAt: Date.now() + MCP_DISCOVERY_CACHE_TTL_MS,
      value: discoveredServer,
    });

    return discoveredServer;
  } finally {
    try {
      await client.close();
    } catch {
      // Ignore MCP transport close errors during cleanup.
    }
  }
}

async function discoverMcpTools(
  server: MCPServerConfig,
): Promise<OllamaMcpServer | null> {
  const preferredProtocol = server.protocol ?? "streamable-http";

  try {
    return await discoverMcpToolsWithProtocol(server, preferredProtocol);
  } catch (primaryError) {
    if (preferredProtocol !== "streamable-http") {
      console.error(
        `[MCP] Failed to connect to '${server.name}' over ${preferredProtocol}:`,
        primaryError,
      );
      return null;
    }

    try {
      return await discoverMcpToolsWithProtocol(server, "sse");
    } catch (fallbackError) {
      console.error(
        `[MCP] Failed to connect to '${server.name}' over streamable-http and SSE fallback:`,
        fallbackError,
      );
      return null;
    }
  }
}

export async function resolveAiMcpCatalog(
  requestServers: MCPServerConfig[] = [],
): Promise<ResolvedMcpCatalog> {
  const servers = normalizeMcpServers(requestServers);

  if (!servers.length) {
    return {
      servers: [],
      toolServerByName: new Map(),
    };
  }

  const discoveredServers = await Promise.all(
    servers.map((server) => discoverMcpTools(server)),
  );

  const filteredServers = discoveredServers.filter(
    (server): server is OllamaMcpServer =>
      Boolean(server && server.tools.length > 0),
  );

  const toolServerByName = new Map<string, MCPServerConfig>();

  for (const discoveredServer of filteredServers) {
    const matchingServer = servers.find(
      (server) => server.name === discoveredServer.name,
    );

    if (!matchingServer) {
      continue;
    }

    for (const tool of discoveredServer.tools) {
      const toolName = tool.function?.name;
      if (!toolName) {
        continue;
      }

      if (toolServerByName.has(toolName)) {
        console.warn(
          `[MCP] Duplicate tool '${toolName}' detected. Keeping first registration from '${toolServerByName.get(toolName)?.name}'.`,
        );
        continue;
      }

      toolServerByName.set(toolName, matchingServer);
    }
  }

  return {
    servers: filteredServers,
    toolServerByName,
  };
}

async function callMcpToolWithProtocol(
  server: MCPServerConfig,
  protocol: MCPServerProtocol,
  toolName: string,
  toolArguments: Record<string, unknown>,
): Promise<string> {
  const client = new Client(
    {
      name: "pumai-mcp-execution-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  const transport = getTransport(server.url, protocol);

  try {
    await client.connect(transport);

    console.log(
      `[MCP] Calling tool '${toolName}' on '${server.name}' via ${protocol} (${server.url}) with args:`,
      toolArguments,
    );

    const result = await client.callTool({
      name: toolName,
      arguments: toolArguments,
    });

    const formattedResult = formatCallToolResult(result);

    console.log(
      `[MCP] Tool '${toolName}' response from '${server.name}':`,
      formattedResult,
    );

    return formattedResult;
  } finally {
    try {
      await client.close();
    } catch {
      // Ignore MCP transport close errors during cleanup.
    }
  }
}

async function callMcpTool(
  server: MCPServerConfig,
  toolName: string,
  toolArguments: Record<string, unknown>,
): Promise<string> {
  const preferredProtocol = server.protocol ?? "streamable-http";

  try {
    return await callMcpToolWithProtocol(
      server,
      preferredProtocol,
      toolName,
      toolArguments,
    );
  } catch (primaryError) {
    if (preferredProtocol !== "streamable-http") {
      throw primaryError;
    }

    return callMcpToolWithProtocol(server, "sse", toolName, toolArguments);
  }
}

export async function executeMcpToolCalls(
  toolCalls: ToolCall[],
  catalog: ResolvedMcpCatalog,
): Promise<ExecutedToolCall[]> {
  const executions: ExecutedToolCall[] = [];

  for (const toolCall of toolCalls) {
    const toolName = toolCall.function.name;
    const toolArguments = (toolCall.function.arguments ?? {}) as Record<
      string,
      unknown
    >;
    const targetServer = catalog.toolServerByName.get(toolName);

    if (!targetServer) {
      const message = `No MCP server is registered for tool '${toolName}'.`;
      console.error(`[MCP] ${message}`);

      executions.push({
        name: toolName,
        arguments: toolArguments,
        serverName: "unknown",
        result: message,
      });

      continue;
    }

    try {
      const result = await callMcpTool(targetServer, toolName, toolArguments);

      executions.push({
        name: toolName,
        arguments: toolArguments,
        serverName: targetServer.name,
        result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[MCP] Failed calling tool '${toolName}' on '${targetServer.name}':`,
        error,
      );

      executions.push({
        name: toolName,
        arguments: toolArguments,
        serverName: targetServer.name,
        result: `Tool call failed: ${message}`,
      });
    }
  }

  return executions;
}

export function buildToolContext(executions: ExecutedToolCall[]): string {
  if (!executions.length) {
    return "";
  }

  const parts = executions.map((execution) => {
    const args = JSON.stringify(execution.arguments);
    return [
      `Tool: ${execution.name}`,
      `Server: ${execution.serverName}`,
      `Arguments: ${args}`,
      `Result: ${execution.result}`,
    ].join("\n");
  });

  return `MCP tool results:\n\n${parts.join("\n\n")}`;
}
