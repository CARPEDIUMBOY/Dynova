export type UserRole = "agency" | "agent" | "manager" | "lead";
export type TicketStatus = "New" | "Open" | "Pending" | "Escalated" | "Resolved" | "Closed";
export type SlaStatus = "On Track" | "At Risk" | "Breached";
export type PriorityLevel = "Low" | "Medium" | "High" | "Critical";
export type UiListState = "normal" | "loading" | "empty" | "error";

export interface User {
  id: string;
  role: UserRole;
  name: string;
  agencyName?: string;
  email: string;
  phone?: string;
  region: string;
  available?: boolean;
  password?: string;
  token?: string;
}

export interface TimelineItem {
  id: string;
  type: "system" | "public" | "internal";
  author: string;
  text: string;
  time: string;
}

export interface SideConversationMessage {
  sender: string;
  text: string;
  time: string;
}

export interface SideConversation {
  id: string;
  subject: string;
  recipients: string[];
  preservedOnTransfer: boolean;
  messages: SideConversationMessage[];
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  bookingNumber: string;
  agencyId: string;
  agencyName: string;
  region: string;
  priority: PriorityLevel;
  category: string;
  intent: string;
  status: TicketStatus;
  checkInDate: string;
  checkOutDate: string;
  slaStatus: SlaStatus;
  assignedToId: string | null;
  assignedToName: string;
  routingReason: string;
  themes: string[];
  createdAt: string;
  timeline: TimelineItem[];
  sideConversations: SideConversation[];
}

export interface OpsDeskDB {
  inviteCode: string;
  users: User[];
  tickets: Ticket[];
}