import { getRedisClient } from "../../config/redis";

import { WorkflowName, type WorkflowSession } from "../../types/workflows";

const SESSION_KEY_PREFIX = "workflow:session:";
const SESSION_TTL_SECONDS = 60 * 60;

function toSessionKey(sessionId: string): string {
  return sessionId.startsWith(SESSION_KEY_PREFIX)
    ? sessionId
    : `${SESSION_KEY_PREFIX}${sessionId}`;
}

export interface CreateSessionParams {
  accountId: string;
  workflow: WorkflowName;
}
export async function createSession(params: CreateSessionParams) {
  const redis = getRedisClient();
  const sessionId = `session_${params.accountId}_${Date.now()}`;
  const sessionKey = toSessionKey(sessionId);

  const sessionData: WorkflowSession = {
    sessionId,
    userId: params.accountId,
    activeWorkflow: params.workflow,
    currentStep: "start",
    data: {},
    startedAt: new Date(),
  };
  await redis.set(sessionKey, JSON.stringify(sessionData), {
    EX: SESSION_TTL_SECONDS,
  });

  return sessionData;
}

export async function getActiveWorkflowSession(
  sessionId: string,
): Promise<WorkflowSession | null> {
  const redis = getRedisClient();
  const sessionKey = toSessionKey(sessionId);
  const raw = await redis.get(sessionKey);

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
    await redis.del(sessionKey);
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

  await redis.set(toSessionKey(sessionId), JSON.stringify(updatedSession), {
    EX: SESSION_TTL_SECONDS,
  });
}

export async function clearWorkflowSession(sessionId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(toSessionKey(sessionId));
}

export async function clearExpiredSessions(): Promise<void> {
  const redis = getRedisClient();
  const keys = await redis.keys("workflow:session:*");
  if (keys.length > 0) {
    await redis.del(keys);
  }
}