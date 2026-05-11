import { Workflow, WorkflowAuthType } from "@prisma/client";

export function buildRequestHeaders(workflow: Workflow): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (workflow.authType === WorkflowAuthType.bearer && workflow.authToken) {
    headers.Authorization = `Bearer ${workflow.authToken}`;
  }

  if (workflow.authType === WorkflowAuthType.api_key && workflow.authKey) {
    headers[workflow.authHeaderName?.trim() || "x-api-key"] = workflow.authKey;
  }

  if (
    workflow.authType === WorkflowAuthType.basic &&
    workflow.authUsername &&
    workflow.authPassword
  ) {
    const token = Buffer.from(
      `${workflow.authUsername}:${workflow.authPassword}`,
    ).toString("base64");
    headers.Authorization = `Basic ${token}`;
  }

  return headers;
}
