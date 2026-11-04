export type Channel = "voice" | "whatsapp" | "email" | "web";

export type ConversationStatus =
  | "active"
  | "waiting_approval"
  | "resolved"
  | "escalated";

export interface Conversation {
  id: string;
  tenantId: string;
  channel: Channel;
  callerName: string;
  summary: string;
  status: ConversationStatus;
  emergency: boolean;
  startedAt: string; // ISO 8601 string, exactly as the API will send it
}