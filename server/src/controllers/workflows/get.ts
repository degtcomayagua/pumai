import { Request, Response, NextFunction } from "express";
import prismaClient from "../../config/prisma.js";

import * as WorkflowsAPITypes from "../../../../shared/api/workflows.js";

import LoggingService from "../../services/logging.js";
import { WorkflowInclude, WorkflowSelect } from "../../../../generated/prisma/models.js";

import { getFieldsToPopulate, getFieldsToSelect } from "../../utils/prisma.js";

const handler = async (
  req: Request<{}, {}, WorkflowsAPITypes.GetRequestBody>,
  res: Response<WorkflowsAPITypes.GetResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { workflowIds, fields, populate } = req.body;

  try {
    const fieldsToSelect = getFieldsToSelect<WorkflowSelect>(fields, {
      id: true,
      name: true,
    });

    const fieldsToPopulate = populate
      ? getFieldsToPopulate<
        WorkflowInclude,
        NonNullable<WorkflowsAPITypes.GetRequestBody["populate"]>
      >(populate, {
        "metadata.createdBy": ["id", "name"],
        "metadata.updatedBy": ["id", "name"],
        "metadata.deletedBy": ["id", "name"],
      })
      : {};

    const workflows = await prismaClient.workflow.findMany({
      where: {
        id: {
          in: workflowIds,
        },
        metadata: {
          is: {
            deleted: {
              not: true, // Could be undefined
            }
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
      workflows,
    });
  } catch (error: unknown) {
    console.log(error);
    const duration = performance.now() - start;

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:workflows:get",
        level: "error",
        message: "Error during workflows retrieval",
        traceId: req.traceId,
        duration,
        details: {
          error: error.message,
          stack: error.stack,
          workflowIds,
        },
      });
    }

    res.status(500).json({
      status: "internal-error",
    });
  }
};

export default handler;