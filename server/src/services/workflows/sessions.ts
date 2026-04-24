export interface CreateSessionParams {
  accountId: string;
  workflow: string;
}
export function createSession(accountId: string)