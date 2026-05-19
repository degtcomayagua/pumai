import { Request, Response, NextFunction } from "express";

import { Prisma } from "@prisma/client";

import * as WorkflowsAPITypes from "../../../../shared/api/workflows.js";

import prismaClient from "../../config/prisma.js";

import LoggingService from "../../services/logging.js";
import { getFieldsToPopulate, getFieldsToSelect } from "../../utils/prisma.js";

type WorkflowSelect = Prisma.WorkflowSelect;
type WorkflowInclude = Prisma.WorkflowInclude;

const handler = async (
  req: Request<{}, {}, WorkflowsAPITypes.ListRequestBody>,
  res: Response<WorkflowsAPITypes.ListResponseData>,
  _next: NextFunction,
) => {
  const start = performance.now();
  const { page, count, fields, populate, search, includeDeleted, filters } =
    req.body;

  try {
    const where: Prisma.WorkflowWhereInput = {};
    const fieldsToSelect = getFieldsToSelect<WorkflowSelect>(fields, {
      id: true,
      name: true,
    });
    const fieldsToPopulate = populate
      ? getFieldsToPopulate<
        WorkflowInclude,
        NonNullable<WorkflowsAPITypes.ListRequestBody["populate"]>
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
      })) as Prisma.WorkflowWhereInput[];
    }

    if (filters) {
      if (filters.protocol !== undefined) where.protocol = filters.protocol;
      if (filters.isRestricted !== undefined)
        where.isRestricted = filters.isRestricted;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
    }

    if (!includeDeleted) {
      // where.metadata = {
      //   deleted: false,
      // };
    }

    const [workflows, totalWorkflows] = await Promise.all([
      prismaClient.workflow.findMany({
        where,
        skip: page * count,
        take: count,
        orderBy: {
          name: "asc",
        },
        select: {
          ...fieldsToSelect,
          ...fieldsToPopulate,
        },
      }),
      prismaClient.workflow.count({ where }),
    ]);

    res.status(200).json({
      status: "success",
      workflows,
      totalWorkflows,
    });
  } catch (error: unknown) {
    console.log(error);
    const duration = performance.now() - start;

    if (error instanceof Error) {
      LoggingService.log({
        source: "api:workflows:list",
        level: "error",
        traceId: req.traceId,
        message: "Unexpected error during workflows listing",
        details: { error: error.message, stack: error.stack },
        duration,
      });
    }

    res.status(500).json({ status: "internal-error" });
    return;
  }
};

export default handler;
