// API
import * as AIAPITypes from "../../../../shared/api/ai";
import * as schemas from "../../../../shared/schemas/ai";
import api from "./api";

// Componentes
import MessageComponent from "./components/Message";

interface ChatMessageActivityItem {
  kind: "tool_call" | "workflow_start" | "workflow_step";
  title: string;
  details?: string;
  timestamp: number;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  source: "api" | "local";
  content: string;
  timestamp?: number;
  kind?:
  | "text"
  | "tool_call"
  | "workflow_start"
  | "workflow_step"
  | "image"
  | "system";
  title?: string;
  activityItems?: ChatMessageActivityItem[];
}

export type { AIAPITypes, ChatMessage };
export default {
  api,
  schemas,
  components: {
    MessageComponent,
  },
};
