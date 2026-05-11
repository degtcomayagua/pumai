// So, this file is pretty much about handling workflow sessions
// We use redis for handling sessions, since they are short-lived
// And need quite a lot of read/write operations

import crypto from "crypto";

import { getRedisClient } from "../../config/redis.js";

import { WorkflowSession } from "../../types/workflows.js";

const SESSION_PREFIX = "workflow:session";
const SESSION_TTL_SECONDS = 15 * 60;

type CreateWorkflowSessionParams = {
  accountId: string;
  workflow: string;
  currentStep: string;
  data?: Record<string, any>;
};

type UpdateWorkflowSessionParams = {
  currentStep?: string;
  data?: Record<string, any>;
};

//#region Session Helpers
function buildSessionKey(sessionId: string): string {
  return `${SESSION_PREFIX}:${sessionId}`;
}

function generateSessionId(accountId: string, workflow: string): string {
  const seed = `${accountId}:${workflow}:${Date.now()}:${crypto.randomUUID()}`;
  return crypto
    .createHash("sha256")
    .update(seed)
    .digest("base64url")
    .slice(0, 32);
}
//#endregion

//#region Session Serialization
function serializeSession(session: WorkflowSession): string {
  return JSON.stringify({
    ...session,
    startedAt: session.startedAt.toISOString(),
  });
}

function deserializeSession(raw: string): WorkflowSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<WorkflowSession> & {
      startedAt?: string;
    };

    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.activeWorkflow !== "string" ||
      typeof parsed.currentStep !== "string" ||
      typeof parsed.data !== "object" ||
      parsed.data === null ||
      typeof parsed.startedAt !== "string"
    ) {
      return null;
    }

    return {
      sessionId: parsed.sessionId,
      userId: parsed.userId,
      activeWorkflow: parsed.activeWorkflow,
      currentStep: parsed.currentStep,
      data: parsed.data,
      startedAt: new Date(parsed.startedAt),
    };
  } catch {
    return null;
  }
}
//#endregion

//#region Session Management
async function saveSession(session: WorkflowSession): Promise<void> {
  const redisClient = getRedisClient();
  await redisClient.setEx(
    buildSessionKey(session.sessionId),
    SESSION_TTL_SECONDS,
    serializeSession(session),
  );
}

export async function createWorkflowSession(
  params: CreateWorkflowSessionParams,
): Promise<WorkflowSession> {
  const session: WorkflowSession = {
    sessionId: generateSessionId(params.accountId, params.workflow),
    userId: params.accountId,
    activeWorkflow: params.workflow,
    currentStep: params.currentStep,
    data: params.data ?? {},
    startedAt: new Date(),
  };

  await saveSession(session);
  return session;
}

export async function getActiveWorkflowSession(
  sessionId: string,
): Promise<WorkflowSession | null> {
  const redisClient = getRedisClient();
  const rawSession = await redisClient.get(buildSessionKey(sessionId));

  if (!rawSession) {
    return null;
  }

  // Refresh TTL on read so active interactions keep session alive.
  try {
    await redisClient.expire(buildSessionKey(sessionId), SESSION_TTL_SECONDS);
  } catch {
    // Ignore TTL refresh errors; still return the session.
  }

  return deserializeSession(rawSession);
}

export async function updateWorkflowSession(
  sessionId: string,
  updates: UpdateWorkflowSessionParams,
): Promise<WorkflowSession | null> {
  const currentSession = await getActiveWorkflowSession(sessionId);

  if (!currentSession) {
    return null;
  }

  const updatedSession: WorkflowSession = {
    ...currentSession,
    currentStep: updates.currentStep ?? currentSession.currentStep,
    data: updates.data ?? currentSession.data,
  };

  await saveSession(updatedSession);
  return updatedSession;
}

export async function clearWorkflowSession(sessionId: string): Promise<void> {
  const redisClient = getRedisClient();
  await redisClient.del(buildSessionKey(sessionId));
}
//#endregion
