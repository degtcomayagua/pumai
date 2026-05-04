import retry from "async-retry";
import { performance } from "perf_hooks";

import prismaClient from "../../config/prisma.js";
import {
  Account,
  MetadataSource,
  MetadataStatus,
  Prisma,
  Workflow,
} from "../../../../generated/prisma/client.js";

import LoggingService from "../logging.js";
import { MetadataUpdateHistoryCreateWithoutMetadataInput } from "../../../../generated/prisma/models.js";

type RestoreWorkflowOptions = {
  traceId?: string;
  userAccount?: Account;
};

export class WorkflowNotFoundError extends Error {
  retryable = false;
  constructor(message: string) {
    super(message);
    this.name = "WorkflowNotFoundError";
  }
}

export async function restoreWorkflow(
  workflowId: string,
  options: RestoreWorkflowOptions = {},
): Promise<Workflow> {
  const startTime = performance.now();
  const userAccountId = options.userAccount?.id;

  // fetch workflow with metadata + updateHistory
  const existingWorkflow = await prismaClient.workflow.findFirst({
    where: {
      id: workflowId,
    },
    include: {
      metadata: {
        include: {
          updateHistory: true,
        },
      },
    },
  });

  if (!existingWorkflow || existingWorkflow.metadata?.deleted === false) {
    throw new WorkflowNotFoundError(
      "Workflow not found or already restored",
    );
  }

  const now = new Date();

  const historyEntry: MetadataUpdateHistoryCreateWithoutMetadataInput = {
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    changes: {
      "metadata.deleted": false,
      "metadata.deletedAt": null,
      ...(userAccountId && { "metadata.deletedById": null }),
    },
  };

  const metadataUpdatePayload: Prisma.MetadataUpdateInput = {
    deleted: false,
    deletedAt: null,
    deletedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    updateHistory: { create: historyEntry },
  };

  let updatePayload: Prisma.WorkflowUpdateInput;

  // Update the metadata
  if (existingWorkflow.metadata) {
    updatePayload = { metadata: { update: metadataUpdatePayload } };
  } else {
    // In the unlikely case that metadata doesn't exist, create it and mark as deleted
    updatePayload = {
      metadata: {
        create: {
          documentVersion: 1,
          createdAt: now,
          createdById: userAccountId ?? null,
          updatedAt: now,
          updatedById: userAccountId ?? null,
          deleted: false,
          deletedAt: null,
          deletedById: userAccountId ?? null,
          status: MetadataStatus.active,
          source: MetadataSource.manual,
          notes: "",
          tags: "",
          updateHistory: { create: historyEntry },
        },
      },
    };
  }

  // perform update: set metadata.deleted = true and append updateHistory
  const restored = await prismaClient.workflow.update({
    where: { id: workflowId },
    data: updatePayload,
    include: { metadata: { include: { updateHistory: true } } },
  });

  const durationMs = Number((performance.now() - startTime).toFixed(3));

  LoggingService.log({
    source: "services:workflows:restore",
    level: "important",
    message: "Workflow restored",
    traceId: options.traceId,
    details: {
      workflowId: String(restored.id),
      ...(userAccountId !== null ? { restoredBy: userAccountId } : {}),
    },
    duration: durationMs,
    _references: {
      workflowId: "Workflow",
      ...(userAccountId !== null ? { restoredBy: "Account" } : {}),
    },
  });

  return restored;
}

export async function restoreWorkflowWithRetry(
  workflowId: string,
  options: RestoreWorkflowOptions = {},
): Promise<Workflow> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await restoreWorkflow(workflowId, options);
      } catch (error: any) {
        if (error instanceof WorkflowNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:workflows:restore:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during workflow restoration (attempt ${attempt})`,
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