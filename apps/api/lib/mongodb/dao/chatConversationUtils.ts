export function buildChatConversationKey(userIdA: string, userIdB: string): string {
  return [userIdA.trim(), userIdB.trim()].sort((a, b) => a.localeCompare(b)).join(':');
}
