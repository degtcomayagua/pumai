import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import * as LogsAPITypes from "../../../../shared/api/logs";

import LogsModel from "../../models/Log";
import AccountModel from "../../models/Account";
import AccountRoleModel from "../../models/AccountRole";
import ConfigModel from "../../models/Config";
import RAGDocumentModel from "../../models/RAGDocument";
import { IAccount } from "../../../../shared/models/account";
import { ILog } from "../../../../shared/models/log";

import LoggingService from "../../services/logging";

export const ALLOWED_FIELDS_PER_MODEL = {
  Account: ["data.role", "data.status", "email.value", "profile.name"],
  AccountRole: ["name", "permissions"],
  RAGDocument: ["title", "summary", "category", "authorityLevel"],
  RagDocument: ["title", "summary", "category", "authorityLevel"],
  Config: ["key", "value"],
} as const;

const MODEL_BY_NAME = {
  Account: AccountModel,
  AccountRole: AccountRoleModel,
  Config: ConfigModel,
  RAGDocument: RAGDocumentModel,
  RagDocument: RAGDocumentModel,
} as const;

const toObjectRecord = (
  value: Record<string, any> | Map<string, any> | undefined,
): Record<string, any> => {
  if (!value) {
    return {};
  }

  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }

  return value;
};

const normalizeReferenceId = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "object") {
    if (
      "_id" in (value as Record<string, unknown>) &&
      typeof (value as Record<string, unknown>)._id === "string"
    ) {
      return (value as Record<string, string>)._id;
    }

    if ("toString" in value && typeof value.toString === "function") {
      const asString = value.toString();
      return asString && asString !== "[object Object]" ? asString : undefined;
    }
  }

  return undefined;
};

const shouldPopulateReference = (
  populateSet: Set<string>,
  detailKey: string,
  modelName: string,
): boolean => {
  if (populateSet.size === 0) {
    return false;
  }

  return (
    populateSet.has(detailKey) ||
    populateSet.has(`details.${detailKey}`) ||
    populateSet.has(modelName)
  );
};

const toSelectableFields = (modelName: string): string | undefined => {
  const allowedFields =
    ALLOWED_FIELDS_PER_MODEL[
    modelName as keyof typeof ALLOWED_FIELDS_PER_MODEL
    ];

  if (!allowedFields?.length) {
    return undefined;
  }

  return allowedFields.join(" ");
};

const handler = async (
  req: Request<{}, {}, LogsAPITypes.ListRequestBody>,
  res: Response<LogsAPITypes.ListResponseData>,
  _next: NextFunction,
) => {
  const { page, count, filters, fields, populate, search, includeDeleted } =
    req.body;
  const adminAccount = req.user!;

  try {
    // let queryFilters: Record<string, any> = {};

    // if (search && search.query.length > 0 && search.searchIn.length > 0) {
    //   const searchRegex = new RegExp(search.query, "i");
    //   queryFilters = {
    //     ...queryFilters,
    //     $or: search.searchIn.map((field) => ({
    //       [field]: searchRegex,
    //     })),
    //   };
    // }

    // if (filters) {
    //   if (filters.startDate || filters.endDate) {
    //     queryFilters.date = {};
    //     if (filters.startDate) {
    //       queryFilters.date.$gte = filters.startDate;
    //     }
    //     if (filters.endDate) {
    //       queryFilters.date.$lte = filters.endDate;
    //     }
    //   }

    //   if (filters.level) {
    //     queryFilters.level = filters.level;
    //   }

    //   if (filters.source) {
    //     queryFilters.source = { $regex: filters.source, $options: "i" };
    //   }

    //   if (filters.traceId) {
    //     queryFilters.traceId = filters.traceId;
    //   }
    // }

    // if (!includeDeleted) {
    //   queryFilters["metadata.deleted"] = { $ne: true };
    // }

    // let cursor = LogsModel.find(queryFilters)
    //   .skip(page * count)
    //   .limit(count)
    //   .sort({ "metadata.createdAt": -1 });

    // if (fields?.length) {
    //   cursor = cursor.select(fields.join(" "));
    // }

    // const [rawLogs, totalLogs] = await Promise.all([
    //   cursor.lean().exec(),
    //   LogsModel.countDocuments(queryFilters),
    // ]);

    // const populateSet = new Set((populate ?? []).map((field) => field.trim()));
    // const logs = rawLogs as Array<Record<string, any>>;

    // if (populateSet.size > 0) {
    //   const idsByModelName = new Map<string, Set<string>>();

    //   for (const log of logs) {
    //     const details = toObjectRecord(log.details);
    //     const references = toObjectRecord(log._references);

    //     for (const [detailKey, modelNameRaw] of Object.entries(references)) {
    //       if (typeof modelNameRaw !== "string" || modelNameRaw.length === 0) {
    //         continue;
    //       }

    //       if (!shouldPopulateReference(populateSet, detailKey, modelNameRaw)) {
    //         continue;
    //       }

    //       const referenceId = normalizeReferenceId(details[detailKey]);
    //       if (!referenceId || !mongoose.Types.ObjectId.isValid(referenceId)) {
    //         continue;
    //       }

    //       if (!idsByModelName.has(modelNameRaw)) {
    //         idsByModelName.set(modelNameRaw, new Set<string>());
    //       }

    //       idsByModelName.get(modelNameRaw)?.add(referenceId);
    //     }
    //   }

    //   const documentsByModelName = new Map<string, Map<string, any>>();

    //   await Promise.all(
    //     Array.from(idsByModelName.entries()).map(async ([modelName, ids]) => {
    //       const model =
    //         MODEL_BY_NAME[modelName as keyof typeof MODEL_BY_NAME] ??
    //         mongoose.models[modelName];

    //       if (!model || ids.size === 0) {
    //         return;
    //       }

    //       const typedModel = model as mongoose.Model<any>;
    //       const modelCursor = typedModel.find({ _id: { $in: Array.from(ids) } });
    //       const selectableFields = toSelectableFields(modelName);
    //       if (selectableFields) {
    //         modelCursor.select(selectableFields);
    //       }

    //       const documents = await modelCursor.lean().exec();
    //       const mapById = new Map<string, any>();

    //       for (const document of documents as Array<Record<string, any>>) {
    //         if (document?._id) {
    //           mapById.set(String(document._id), document);
    //         }
    //       }

    //       documentsByModelName.set(modelName, mapById);
    //     }),
    //   );

    //   for (const log of logs) {
    //     const details = toObjectRecord(log.details);
    //     const references = toObjectRecord(log._references);

    //     for (const [detailKey, modelNameRaw] of Object.entries(references)) {
    //       if (typeof modelNameRaw !== "string" || modelNameRaw.length === 0) {
    //         continue;
    //       }

    //       if (!shouldPopulateReference(populateSet, detailKey, modelNameRaw)) {
    //         continue;
    //       }

    //       const value = details[detailKey];
    //       const referenceId = normalizeReferenceId(value);
    //       const document = referenceId
    //         ? documentsByModelName.get(modelNameRaw)?.get(referenceId) ?? null
    //         : null;

    //       details[detailKey] = {
    //         value,
    //         document,
    //       };
    //     }

    //     log.details = details;
    //   }
    // }

    res.status(200).json({
      status: "success",
      logs: [],
      totalLogs: 0,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      LoggingService.log({
        source: "api:logs:list",
        level: "error",
        traceId: req.traceId,
        message: "Unexpected error during log listing",
        details: { error: error.message, stack: error.stack },

      });
    }

    res.status(500).json({ status: "internal-error" });
    return;
  }
};

export default handler;
