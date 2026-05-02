import retry from "async-retry";
import { performance } from "perf_hooks";

import prismaClient from "../../config/prisma";
import {
  Account,
  RAGDocument,
  MetadataSource,
  MetadataStatus,
  Prisma,
  DocumentCategory,
  CampusCode,
  DeliveryMode,
  SourceType,
} from "../../../../generated/prisma/client";

import LoggingService from "../../services/logging";

type CreateRAGDocumentParameters = {
  title: string;
  category: DocumentCategory;

  authorityLevel: number;
  sourceType: SourceType;

  campuses: CampusCode[];
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
  traceId?: string;
  userAccount?: Account;
};

export class RAGDocumentAlreadyExistsError extends Error {
  retryable = false;
  constructor(message = "rag-document-title-in-use") {
    super(message);
    this.name = "RAGDocumentAlreadyExistsError";
  }
}

export async function createRAGDocument(
  params: CreateRAGDocumentParameters,
  options: CreateRAGDocumentOptions = {},
): Promise<RAGDocument> {
  const startTime = performance.now();

  const {
    archived,
    authorityLevel,
    category,
    effectiveFrom,
    effectiveUntil,
    sourceType,
    summary,
    title,
    warnings,
  } = params;

  const now = new Date();
  const userAccount = options.userAccount;

  try {
    // create metadata first
    const metadata = await prismaClient.metadata.create({
      data: {
        documentVersion: 1,
        createdAt: now,
        createdById: userAccount?.id ?? null,
        updatedAt: now,
        updatedById: userAccount?.id ?? null,
        deleted: false,
        deletedAt: null,
        deletedById: null,
        status: MetadataStatus.active,
        source: MetadataSource.manual,
        notes: "",
        tags: "",
      },
    });

    const uniqueCampuses = [...new Set(params.campuses)];
    const uniqueDeliveryModes = [...new Set(params.deliveryModes)];
    const uniqueTags = [...new Set(params.tags.map((tag) => tag.trim()).filter(Boolean))];

    // create account role referencing metadataId
    const ragDocument = await prismaClient.rAGDocument.create({
      data: {
        archived,
        authorityLevel,
        category,
        effectiveFrom,
        effectiveUntil,
        warningLegal: warnings.legal,
        warningTimeSensitive: warnings.timeSensitive,
        warningCampusSpecific: warnings.campusSpecific,
        sourceType,
        summary,
        title,
        metadataId: metadata.id,
        campuses: {
          createMany: {
            data: uniqueCampuses.map((campus) => ({
              campus,
            })),
            skipDuplicates: true,
          },
        },
        deliveryModes: {
          createMany: {
            data: uniqueDeliveryModes.map((deliveryMode) => ({
              deliveryMode,
            })),
            skipDuplicates: true,
          },
        },
        tags: {
          createMany: {
            data: uniqueTags.map((tag) => ({
              tag,
            })),
            skipDuplicates: true,
          },
        },
      },
    });

    const duration = Number((performance.now() - startTime).toFixed(3));

    LoggingService.log({
      source: "services:rag-documents:create",
      level: "important",
      message: "RAG Document created in database successfully",
      traceId: options.traceId,
      duration,
      details: {
        ragDocumentId: ragDocument.id,
        name: ragDocument.title,
      },
      _references: {
        ragDocumentId: "RAGDocument",
      },
    });

    return ragDocument;
  } catch (err: any) {
    // handle unique constraint on name (P2002)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      if ((err.meta as any)?.target?.includes?.("name")) {
        throw new RAGDocumentAlreadyExistsError();
      }
    }
    throw err;
  }
}

export async function createRAGDocumentWithRetry(
  params: CreateRAGDocumentParameters,
  options: CreateRAGDocumentOptions = {},
): Promise<RAGDocument> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await createRAGDocument(params, options);
      } catch (error: any) {
        // non-retryable
        if (error instanceof RAGDocumentAlreadyExistsError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:rag-documents:create:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during RAG document creation (attempt ${attempt})`,
          details: {
            error: error?.message,
            stack: error?.stack,
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