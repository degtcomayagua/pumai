// API
import * as AIAPITypes from "../../../../shared/api/ai";
import * as schemas from "../../../../shared/schemas/ai";
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
