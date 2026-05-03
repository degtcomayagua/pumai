import { Request, Response, NextFunction } from "express";

import { Prisma } from "../../../../generated/prisma/client.js";

import * as RAGDocumentsAPITypes from "../../../../shared/api/rag-documents.js";

import prismaClient from "../../config/prisma.js";

import LoggingService from "../../services/logging.js";
import { getFieldsToPopulate, getFieldsToSelect } from "../../utils/prisma.js";
import {
  RAGDocumentInclude,
  RAGDocumentSelect,
} from "../../../../generated/prisma/models.js";

const handler = async (
  req: Request<{}, {}, RAGDocumentsAPITypes.ListRequestBody>,
  res: Response<RAGDocumentsAPITypes.ListResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { page, count, fields, populate, search, includeDeleted } = req.body;

  try {
    const where: Prisma.RAGDocumentWhereInput = {};
    const fieldsToSelect = getFieldsToSelect<RAGDocumentSelect>(fields, {
      id: true,
      title: true,
    });
    const fieldsToPopulate = populate
      ? getFieldsToPopulate<
        RAGDocumentInclude,
        NonNullable<RAGDocumentsAPITypes.ListRequestBody["populate"]>
      >(populate, {
        "metadata.createdBy": ["id", "name"],
        "metadata.updatedBy": ["id", "name"],
        "metadata.deletedBy": ["id", "name"],
      })
      : {};

    if (search && search.query.length > 0 && search.searchIn.length > 0) {
      where.OR = search.searchIn.map((field) => ({
        [field]: {
          contains: search.query,
        },
      })) as Prisma.RAGDocumentWhereInput[];
    }

    if (!includeDeleted) {
      where.metadata = {
        is: {
          deleted: {
            not: true, // Could be undefined
          },
        },
      };
    }

    const [ragDocuments, totalRagDocuments] = await Promise.all([
      prismaClient.rAGDocument.findMany({
        where,
        skip: page * count,
        take: count,
        orderBy: {
          authorityLevel: "asc",
        },
        select: {
          ...fieldsToSelect,
          ...fieldsToPopulate,
        },
      }),
      prismaClient.rAGDocument.count({ where }),
    ]);

    res.status(200).json({
      status: "success",
      ragDocuments,
      totalRagDocuments,
    });
  } catch (error: unknown) {
    console.log(error);
    const duration = performance.now() - start;

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:rag-documents:list",
        level: "error",
        traceId: req.traceId,
        message: "Unexpected error during rag documents listing",
        details: { error: error.message, stack: error.stack },
        duration,
      });
    }

    res.status(500).json({ status: "internal-error" });
    return;
  }
};

export default handler;
