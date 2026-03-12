// API
import * as AIAPITypes from "../../../../../contracts/pumai/api/ai";
import * as schemas from "../../../../../contracts/pumai/schemas/ai";
import api from "./api";

// Componentes
import MessageComponent from "./components/Message";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  source: "api" | "local";
  content: string;
  timestamp?: number;
}

export type { AIAPITypes, ChatMessage };
export default {
  api,
  schemas,
  components: {
    MessageComponent,
  },
};
