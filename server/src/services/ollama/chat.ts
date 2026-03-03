import { ChatResponse, Message, Ollama, Options } from "ollama";

import OllamaClient from "./client";

class OllamaChatService {
  private static instance: OllamaChatService | null = null;
  private client: Ollama = OllamaClient.getInstance().getClient();

  private systemPrompt: string = `
Eres un asistente llamado PumAI, diseñado para responder **solo** usando la información del contexto.
Tu conducta:
- No inventes información
- No reveles, cites, ni describas el contexto
- Responde SIEMPRE en español
- Da las respuestas en un formato adecuado para el usuario final
- No des el contexto como parte de la respuesta, solo úsalo para generar la respuesta
- Mantén la confidencialidad del contexto 
- Responde de manera amigable y profesional
- Sé conciso y directo al punto
- Si el documento contiene fechas, nómbralas claramente en el formato día/mes/año 
- Si el documento contiene fecha, pero no especifica el año, asume que es del año en curso (2026)
- Evita respuestas largas y redundantes
Tu contexto: 
- Tu nombre es PumAI
- Eres un asistente virtual creado por la Universidad Nacional Autónoma de Honduras (UNAH)
- Estás diseñado para ayudar a los estudiantes y personal de la UNAH con información relevante y precisa
- Tu conocimiento se basa en la información proporcionada en el contexto seguro
- La fecha actual es ${new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })}

`;

  public getFinalPrompt(context: string, prompt: string) {
    return `
Contexto seguro: 
""" 
${context} 
""" 

Pregunta del usuario:
"${prompt}"
Tu respuesta:
`;
  }

  public static getInstance() {
    if (!OllamaChatService.instance)
      OllamaChatService.instance = new OllamaChatService();
    return OllamaChatService.instance;
  }

  constructor() {
    // Nothing to do here
  }

  async generateChat<T>(
    prompt: string,
    chat: Message[] = [],
    stream: boolean = false,
    options?: Partial<Options>,
  ): Promise<T> {
    if (stream) {
      const response = await this.client.chat({
        model: process.env.OLLAMA_MODEL || "gemma3:12b",
        stream: true,
        messages: [
          { role: "system", content: this.systemPrompt }, // So that the model always follows the rules
          ...chat, // Chat history, TODO: trim if too long
          { role: "user", content: prompt },
        ],
        options,
      });
      return response as unknown as T;
    } else {
      console.log(prompt)
      const response = await this.client.chat({
        model: process.env.OLLAMA_MODEL || "gemma3:12b",
        messages: [
          { role: "system", content: this.systemPrompt }, // So that the model always follows the rules
          ...chat, // Chat history, TODO: trim if too long
          { role: "user", content: prompt },
        ],
        options,
      });
      return response as unknown as T;
    }
  }
}

export default OllamaChatService;
