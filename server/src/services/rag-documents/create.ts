import mongoose from "mongoose";
import retry from "async-retry";
import { performance } from "perf_hooks";

import RAGDocumentModel from "../../models/RAGDocument";
import { IRAGDocument } from "../../../../shared/models/rag-document";
import { IAccount } from "../../../../shared/models/account";
import {
  CampusCode,
  SourceType,
  DeliveryMode,
  DocumentCategory,
} from "../../../../shared/models/index";

import LoggingService from "../../services/logging";

type CreateRAGDocumentParameters = {
  title: string;
  category: DocumentCategory;

  authorityLevel: number; // higher = stronger authority
  sourceType: SourceType;

  campuses: CampusCode[]; // ["GLOBAL"] or specific campuses
  deliveryModes: DeliveryMode[];

  effectiveFrom: Date;
  effectiveUntil: Date | null;
  archived: boolean;

  warnings: {
    legal?: string;
    timeSensitive?: string;
    campusSpecific?: string;
  };

  summary: string; // auto-generated
  tags: string[];
};

type CreateRAGDocumentOptions = {
  session?: mongoose.ClientSession;
  traceId?: string;
  adminAccount?: IAccount;
};

export async function createRAGDocument(
  params: CreateRAGDocumentParameters,
  options: CreateRAGDocumentOptions = {},
): Promise<IRAGDocument> {
  const startTime = performance.now();

  let session = options.session;
  let sessionCreatedHere = false;

  if (!session) {
    session = await mongoose.startSession();
    session.startTransaction();
    sessionCreatedHere = true;
  }

  try {
    const {
      title,
      category,
      authorityLevel,
      sourceType,
      campuses,
      deliveryModes,
      effectiveFrom = new Date(),
      effectiveUntil = null,
      archived = false,
      warnings = {},
      summary = "",
      tags = [],
    } = params;
    const adminAccount = options.adminAccount;
    const now = new Date();

    const ragDocument = new RAGDocumentModel({
      title,
      category,
      authorityLevel,
      sourceType,
      campuses,
      deliveryModes,
      effectiveFrom,
      effectiveUntil,
      archived,
      warnings,
      summary,
      tags,

      metadata: {
        documentVersion: 1,
        createdAt: now,
        createdBy: adminAccount?._id,
        updatedAt: now,
        updatedBy: adminAccount?._id,
        updateHistory: [],
      },
    });

    await ragDocument.save({ session });

    if (sessionCreatedHere) {
      await session.commitTransaction();
      await session.endSession();
    }

    LoggingService.log({
      source: "services:rag-documents:create",
      level: "important",
      message: "RAG Document created successfully",
      traceId: options.traceId,
      duration: Number((performance.now() - startTime).toFixed(3)),
      details: {
        ragDocumentId: ragDocument._id.toString(),
      },
      _references: {
        ragDocumentId: "RAGDocument",
      },
      metadata: {
        createdBy: adminAccount?._id.toString(),
        createdAt: now,
      },
    });

    return ragDocument;
  } catch (error) {
    if (sessionCreatedHere) {
      await session.abortTransaction();
      await session.endSession();
    }
    throw error;
  }
}

export async function createRAGDocumentWithRetry(
  params: CreateRAGDocumentParameters,
  options: CreateRAGDocumentOptions = {},
): Promise<IRAGDocument> {
  return retry(
    async (_, attempt) => {
      const startTime = performance.now();
      try {
        return await createRAGDocument(params, options);
      } catch (error: any) {
        LoggingService.log({
          source: "services:rag-documents:create:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during rag document creation (attempt ${attempt})`,
          details: {
            error: error.message,
            stack: error.stack,
          },
        });
        throw error;
      }
    },
    {
      retries: 3,
      minTimeout: 1000,
      maxTimeout: 5000,
      factor: 2,
    },
  );
}
