import { Request, Response, NextFunction } from "express";
import prismaClient from "../../config/prisma.js";

import * as RAGDocumentAPITypes from "../../../../shared/api/rag-documents.js";

import LoggingService from "../../services/logging.js";

import { Prisma } from "@prisma/client";
type RAGDocumentSelect = Prisma.RAGDocumentSelect;
type RAGDocumentInclude = Prisma.RAGDocumentInclude;

import { getFieldsToPopulate, getFieldsToSelect } from "../../utils/prisma.js";

const handler = async (
  req: Request<{}, {}, RAGDocumentAPITypes.GetRequestBody>,
  res: Response<RAGDocumentAPITypes.GetResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { ragDocumentIds, fields, populate } = req.body;

  try {
    let fieldsToSelect = getFieldsToSelect<RAGDocumentSelect>(fields, {
      id: true,
      title: true
    })
    const fieldsToPopulate = populate
      ? getFieldsToPopulate<
        RAGDocumentInclude,
        NonNullable<RAGDocumentAPITypes.ListRequestBody["populate"]>
      >(populate, {
        "metadata.createdBy": ["id", "name"],
        "metadata.updatedBy": ["id", "name"],
        "metadata.deletedBy": ["id", "name"],
      })
      : {};


    const ragDocuments = await prismaClient.rAGDocument.findMany({
      where: {
        id: {
          in: ragDocumentIds,
        },
        metadata: {
          is: {
            deleted: false,
          },
        },
      },
      select: {
        ...fieldsToSelect,
        ...fieldsToPopulate,
      },
    });

    res.status(200).json({
      status: "success",
      ragDocuments: ragDocuments,
    });
  } catch (error: unknown) {
    console.log(error);
    const duration = performance.now() - start;

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:rag-documents:get",
        level: "error",
        message: "Error during rag documents retrieval",
        traceId: req.traceId,
        duration,
        details: {
          error: error.message,
          stack: error.stack,
          ragDocumentIds,
        },
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;

