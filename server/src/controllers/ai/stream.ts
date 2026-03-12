import { Response, NextFunction } from "express";
import { TypedRequest } from "../../types";
import * as AIAPITypes from "../../../../shared/api/ai";
import OllamaChatService from "../../services/ollama/chat";
import OllamaEmbeddingService from "../../services/ollama/embed";
import { AbortableAsyncIterator, ChatResponse } from "ollama";

const handler = async (
  req: TypedRequest<AIAPITypes.GenerateRequestBody>,
  res: Response<AIAPITypes.GenerateResponseData>,
  _next: NextFunction,
) => {
  try {
    const { prompt } = req.parsedBody;

    // Get context from embedding service
    const context =
      await OllamaEmbeddingService.getInstance().getContext(prompt);

    // Construct final prompt
    const finalPrompt = OllamaChatService.getInstance().getFinalPrompt(
      context.documents.join("\n"),
      prompt,
    );

    // Generate chat response
    const result: AbortableAsyncIterator<ChatResponse> =
      await OllamaChatService.getInstance().generateChat<
        AbortableAsyncIterator<ChatResponse>
      >(finalPrompt, [], true, { temperature: 0.2 }); // Consider making temperature a parameter

    res.status(200);

    for await (const part of result) {
      try {
        // Type safety: Ensure content is a string
        const chunk: string = part.message.content as string; // Explicit type assertion

        res.write(chunk);
      } catch (writeError) {
        console.error("Error writing chunk to response:", writeError);
        // Handle the error.  Maybe send an error response to the client?
        res.status(500).send({ status: "internal-error", result: "" });
        return; // Important to stop processing if writing fails.
      }
    }

    res.end();
  } catch (error) {
    console.error("Error generating chat response:", error);
    res.status(500).send({ status: "internal-error", result: "" });
  }
};

export default handler;
