import retry from "async-retry";
import { performance } from "perf_hooks";
import {
  Prisma,
  MetadataSource,
  MetadataStatus,
  Account,
  MetadataUpdateHistory,
  Workflow,
} from "@prisma/client";

import prismaClient from "../../config/prisma.js";
import LoggingService from "../logging.js";
import { DeepPartial } from "@shared/types/custom.js";

type UpdateWorkflowOptions = {
  traceId?: string;
  userAccount?: Account;
};

type UpdateWorkflowParameters = DeepPartial<Omit<Workflow, "id" | "metadata">> & {
  workflowId: string;
};

export class WorkflowNotFoundError extends Error {
  retryable = false;
  constructor() {
    super("not-found");
    this.name = "WorkflowNotFoundError";
  }
}

export async function updateWorkflow(
  params: UpdateWorkflowParameters,
  options: UpdateWorkflowOptions = {},
): Promise<Workflow> {
  const startTime = performance.now();
  const userAccountId = options.userAccount?.id;

  const existing = await prismaClient.workflow.findUnique({
    where: {
      id: params.workflowId,
    },
    include: { metadata: true },
  });

  if (!existing || existing.metadata?.deleted) throw new WorkflowNotFoundError();

  const now = new Date();
  const changes: MetadataUpdateHistory["changes"] = {};
  const updatePayload: Prisma.WorkflowUpdateInput = {};

  for (const key of Object.keys(params) as (keyof Omit<Workflow, "id" | "metadata" | "metadataId">)[]) {
    if (params[key] !== existing[key]) {
      updatePayload[key] = params[key] as any;
      changes[key] = params[key]?.toString();
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    // No changes, return existing
    return existing;
  }

  const historyEntry: Prisma.MetadataUpdateHistoryCreateWithoutMetadataInput = {
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    changes,
  };

  const metadataUpdatePayload: Prisma.MetadataUpdateInput = {
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    updateHistory: { create: historyEntry },
  };

  if (existing.metadata) {
    updatePayload.metadata = { update: metadataUpdatePayload };
  } else {
    updatePayload.metadata = {
      create: {
        documentVersion: 1,
        createdAt: now,
        createdById: userAccountId,
        updatedAt: now,
        updatedById: userAccountId,
        deleted: false,
        deletedAt: null,
        deletedById: null,
        status: MetadataStatus.active,
        source: MetadataSource.manual,
        notes: "",
        tags: "",
        updateHistory: { create: historyEntry },
      },
    };
  }

  const updated = await prismaClient.workflow.update({
    where: { id: params.workflowId },
    data: updatePayload,
    include: { metadata: { include: { updateHistory: true } } },
  });

  LoggingService.log({
    source: "services:workflows:update",
    level: "important",
    message: "Admin updated workflow",
    traceId: options.traceId,
    duration: Number((performance.now() - startTime).toFixed(3)),
    details: {
      workflowId: updated.id,
      updatedBy: userAccountId != null ? userAccountId : undefined,
    },
    _references: {
      workflowId: "Workflow",
      updatedBy: "Account",
    },
  });

  return updated;
}

export async function updateWorkflowWithRetry(
  params: UpdateWorkflowParameters,
  options: UpdateWorkflowOptions = {},
): Promise<Workflow> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await updateWorkflow(params, options);
      } catch (err: any) {
        if (err instanceof WorkflowNotFoundError) {
          bail(err);
        }

        LoggingService.log({
          source: "services:workflows:update:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during workflow update (attempt ${attempt})`,
          details: {
            error: err?.message,
            stack: err?.stack,
          },
        });

        throw err;
      }
    },
    { retries: 3, minTimeout: 1000, maxTimeout: 5000, factor: 2 },
  );
}