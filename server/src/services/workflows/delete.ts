import retry from "async-retry";
import { performance } from "perf_hooks";

import prismaClient from "../../config/prisma.js";
import {
  Account,
  MetadataSource,
  MetadataStatus,
  Prisma,
  Workflow,
} from "@prisma/client";

import LoggingService from "../logging.js";

type DeleteWorkflowOptions = {
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

export async function deleteWorkflow(
  workflowId: string,
  options: DeleteWorkflowOptions = {},
): Promise<Workflow> {
  const startTime = performance.now();
  const userAccountId = options.userAccount?.id;

  // fetch Workflow Server with metadata + updateHistory
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

  if (!existingWorkflow || existingWorkflow.metadata?.deleted === true) {
    throw new WorkflowNotFoundError("Workflow not found or already deleted");
  }

  const now = new Date();

  const historyEntry: Prisma.MetadataUpdateHistoryCreateWithoutMetadataInput = {
    updatedAt: now,
    updatedBy: userAccountId ? { connect: { id: userAccountId } } : undefined,
    changes: {
      "metadata.deleted": true,
      "metadata.deletedAt": now.toISOString(),
      ...(userAccountId && { "metadata.deletedById": userAccountId }),
    },
  };

  const metadataUpdatePayload: Prisma.MetadataUpdateInput = {
    deleted: true,
    deletedAt: now,
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
          deleted: true,
          deletedAt: now,
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
  const deleted = await prismaClient.workflow.update({
    where: { id: workflowId },
    data: updatePayload,
    include: { metadata: { include: { updateHistory: true } } },
  });

  const durationMs = Number((performance.now() - startTime).toFixed(3));

  LoggingService.log({
    source: "services:workflows:delete",
    level: "important",
    message: "Workflow deleted",
    traceId: options.traceId,
    details: {
      workflowId: String(deleted.id),
      ...(userAccountId !== null ? { deletedBy: String(userAccountId) } : {}),
    },
    duration: durationMs,
    _references: {
      workflowId: "Workflow",
    },
  });

  return deleted;
}

export async function deleteWorkflowWithRetry(
  workflowId: string,
  options: DeleteWorkflowOptions = {},
): Promise<Workflow> {
  return retry(
    async (bail, attempt) => {
      const startTime = performance.now();
      try {
        return await deleteWorkflow(workflowId, options);
      } catch (error: any) {
        if (error instanceof WorkflowNotFoundError) {
          bail(error);
        }

        LoggingService.log({
          source: "services:workflows:delete:retry",
          level: "warning",
          traceId: options.traceId,
          duration: Number((performance.now() - startTime).toFixed(3)),
          message: `Retryable error during workflow deletion (attempt ${attempt})`,
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
