import { randomUUID } from "crypto";

import { getRedisClient } from "../../config/redis.js";
import type { WorkflowSession } from "../../types/workflows.js";

import WorkflowsRegistry, {
  type WorkflowRemoteStep,
} from "./registry.js";

const SESSION_KEY_PREFIX = "workflow-session";
const ACTIVE_ACCOUNT_SESSION_PREFIX = "workflow-session-active-account";
const DEFAULT_TTL_SECONDS = 60 * 60;

type WorkflowSessionPatch = Partial<
  Pick<WorkflowSession, "currentStep" | "data" | "steps">
>;

type CreateSessionInput = {
  accountId: string;
  workflow: string;
  currentStep?: string;
  data?: Record<string, unknown>;
  steps?: WorkflowRemoteStep[];
  ttlSeconds?: number;
};

function keyBySessionId(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}:${sessionId}`;
}

function keyByAccountId(accountId: string): string {
  return `${ACTIVE_ACCOUNT_SESSION_PREFIX}:${accountId}`;
}

function parseSession(raw: string | null): WorkflowSession | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as WorkflowSession;
    return {
      ...parsed,
      startedAt: new Date(parsed.startedAt),
      updatedAt: new Date(parsed.updatedAt),
    };
  } catch {
    return null;
  }
}

function getSafeTtl(ttlSeconds?: number): number {
  if (!ttlSeconds || Number.isNaN(ttlSeconds) || ttlSeconds < 60) {
    return DEFAULT_TTL_SECONDS;
  }

  return Math.floor(ttlSeconds);
}

async function setSession(
  session: WorkflowSession,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const redis = getRedisClient();
  const safeTtl = getSafeTtl(ttlSeconds);

  await redis.multi()
    .set(keyBySessionId(session.sessionId), JSON.stringify(session), {
      EX: safeTtl,
    })
    .set(keyByAccountId(session.accountId), session.sessionId, {
      EX: safeTtl,
    })
    .exec();
}

export async function createSession(
  input: CreateSessionInput,
): Promise<WorkflowSession> {
  const registry = WorkflowsRegistry.getInstance();
  await registry.initialize();

  const workflow = registry.resolveIntent(input.workflow);
  const sessionId = randomUUID();
  const now = new Date();

  const session: WorkflowSession = {
    sessionId,
    accountId: input.accountId,
    activeWorkflow: workflow?.name ?? input.workflow,
    currentStep: input.currentStep ?? workflow?.info?.steps[0]?.name ?? "start",
    data: input.data ?? {},
    steps: input.steps ?? workflow?.info?.steps ?? [],
    startedAt: now,
    updatedAt: now,
  };

  await setSession(session, input.ttlSeconds);

  return session;
}

export async function getWorkflowSession(
  sessionId: string,
): Promise<WorkflowSession | null> {
  const redis = getRedisClient();
  return parseSession(await redis.get(keyBySessionId(sessionId)));
}

export async function getActiveWorkflowSession(
  accountIdOrSessionId: string,
): Promise<WorkflowSession | null> {
  const bySessionId = await getWorkflowSession(accountIdOrSessionId);
  if (bySessionId) {
    return bySessionId;
  }

  const redis = getRedisClient();
  const sessionId = await redis.get(keyByAccountId(accountIdOrSessionId));

  if (!sessionId) {
    return null;
  }

  return getWorkflowSession(sessionId);
}

export async function updateWorkflowSession(
  sessionId: string,
  patch: WorkflowSessionPatch,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<WorkflowSession | null> {
  const existing = await getWorkflowSession(sessionId);

  if (!existing) {
    return null;
  }

  const updated: WorkflowSession = {
    ...existing,
    ...patch,
    data: patch.data ?? existing.data,
    steps: patch.steps ?? existing.steps,
    updatedAt: new Date(),
  };

  await setSession(updated, ttlSeconds);

  return updated;
}

export async function clearWorkflowSession(sessionId: string): Promise<void> {
  const existing = await getWorkflowSession(sessionId);
  if (!existing) {
    return;
  }

  const redis = getRedisClient();
  await redis.multi()
    .del(keyBySessionId(sessionId))
    .del(keyByAccountId(existing.accountId))
    .exec();
}

export async function clearAccountWorkflowSession(accountId: string): Promise<void> {
  const redis = getRedisClient();
  const sessionId = await redis.get(keyByAccountId(accountId));

  if (!sessionId) {
    return;
  }

  await redis.multi()
    .del(keyBySessionId(sessionId))
    .del(keyByAccountId(accountId))
    .exec();
}
