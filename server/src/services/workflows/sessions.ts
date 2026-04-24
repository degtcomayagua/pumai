import { getRedisClient } from "../../config/redis";

import { WorkflowName, type WorkflowSession } from "../../types/workflows";

export interface CreateSessionParams {
  accountId: string;
  workflow: WorkflowName;
}
export function createSession(params: CreateSessionParams) {
  const redis = getRedisClient();
  const sessionId = `session_${params.accountId}_${Date.now()}`;

  const sessionData: WorkflowSession = {
    sessionId,
    userId: params.accountId,
    activeWorkflow: params.workflow,
    currentStep: "start",
    data: {},
    startedAt: new Date(),
  };

  redis.set(`workflow:session:${sessionId}`, JSON.stringify(sessionData), {
    EX: 60 * 60, // 1 hour expiration
  });

  return sessionData;
}

export async function getActiveWorkflowSession(
  sessionId: string,
): Promise<WorkflowSession | null> {
  const redis = getRedisClient();
  const raw = await redis.get(`workflow:session:${sessionId}`);
  console.log("RAW", raw)

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Omit<WorkflowSession, "startedAt"> & {
      startedAt: string;
    };

    return {
      ...parsed,
      startedAt: new Date(parsed.startedAt),
    };
  } catch {
    await redis.del(`workflow:session:${sessionId}`);
    return null;
  }
}

export async function updateWorkflowSession(
  sessionId: string,
  updates: Partial<Pick<WorkflowSession, "currentStep" | "data">>,
): Promise<void> {
  const redis = getRedisClient();
  const session = await getActiveWorkflowSession(sessionId);

  if (!session) {
    throw new Error("Workflow session not found");
  }

  const updatedSession: WorkflowSession = {
    ...session,
    ...updates,
  };

  await redis.set(`workflow:session:${sessionId}`, JSON.stringify(updatedSession), {
    EX: 60 * 60, // Reset expiration on update
  });
}

export async function clearWorkflowSession(sessionId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`workflow:session:${sessionId}`);
}

export async function clearExpiredSessions(): Promise<void> {
  const redis = getRedisClient();
  const keys = await redis.keys("workflow:session:*");
  if (keys.length > 0) {
    await redis.del(keys);
  }
}