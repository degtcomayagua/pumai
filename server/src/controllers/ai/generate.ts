import { Response, NextFunction } from "express";

import { TypedRequest } from "../../types";
import * as AIAPITypes from "../../../../shared/api/ai";

import OllamaChatService from "../../services/ollama/chat";
import OllamaEmbeddingService from "../../services/ollama/embed";
import ChromaService from "../../services/chroma";

import { ChatResponse } from "ollama";
import { IRAGChunk } from "../../../../shared/models/chroma/rag-chunk";

const handler = async (
  req: TypedRequest<AIAPITypes.GenerateRequestBody>,
  res: Response<AIAPITypes.GenerateResponseData>,
  _next: NextFunction,
) => {
  // TODO: Expand this
  const { prompt, chat, campuses, deliveryModes, category } = req.parsedBody;

  // TODO: Safety checks

  // Get the embedding for the prompt
  const queryEmbedding =
    await OllamaEmbeddingService.getInstance().embedText(prompt);

  // Fetch relevant documents from ChromaDB
  const collection = await ChromaService.getInstance()
    .getClient()
    .getOrCreateCollection({
      name: "rag-documents",
      embeddingFunction: OllamaEmbeddingService.getInstance().getEmbedder(),
    });
  const ragDocuments = await collection!.query({
    queryEmbeddings: [queryEmbedding], // Apply RAG
    // where: {
    //   $and: [
    //     {
    //       campuses_comayagua: campuses.includes("COMAYAGUA"),
    //       campuses_global: campuses.includes("GLOBAL"),
    //     } as Partial<IRAGChunk>,
    //     {
    //       deliveryModes_online: deliveryModes.includes("online"),
    //       deliveryModes_inPerson: deliveryModes.includes("onsite"),
    //       deliveryModes_hybrid: deliveryModes.includes("hybrid"),
    //     } as Partial<IRAGChunk>,
    //     {
    //       category: category,
    //     } as Partial<IRAGChunk>,
    //   ],
    // },
    nResults: 3,
  });

  const finalPrompt = OllamaChatService.getInstance().getFinalPrompt(
    ragDocuments.documents.join("\n"),
    prompt,
  );

  const result: ChatResponse =
    await OllamaChatService.getInstance().generateChat<ChatResponse>(
      finalPrompt,
      chat,
      false,
      { temperature: 0.2 },
    );

  res.status(200).json({ status: "success", result: result.message.content });
};

export default handler;
