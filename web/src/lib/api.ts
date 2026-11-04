import type { Conversation } from "./types";
import { mockConversations } from "./mock-data";

// Returns ONLY the given tenant's conversations.
// In point 3 this filter moves into the FastAPI backend.
export async function getConversations(tenantId: string): Promise<Conversation[]> {
  return mockConversations.filter((c) => c.tenantId === tenantId);
}