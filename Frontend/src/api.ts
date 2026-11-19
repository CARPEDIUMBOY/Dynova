import type {
  OpsDeskDB,
  PriorityLevel,
  SlaStatus,
  Ticket,
  TicketStatus,
  User,
  UserRole
} from "./types";
import { INITIAL_OPSDESK_DATA } from "./data";

const STORAGE_KEY = "opsdesk_db_v1";
const SESSION_KEY = "opsdesk_session_v1";

export const OpsDeskAPI = {
  // Flip USE_BACKEND_API to true when your teammate's backend server is ready!
  USE_BACKEND_API: false,
  BASE_URL: "http://localhost:5000/api",

  getHeaders(): Record<string, string> {
    const user = this.getCurrentUser();
    return {
      "Content-Type": "application/json",
      "X-User-Id": user ? user.id : "",
      "X-User-Role": user ? user.role : "",
      ...(user && user.token ? { Authorization: `Bearer ${user.token}` } : {})
    };
  },

  initDB(): void {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_OPSDESK_DATA));
    }
  },

  getDB(): OpsDeskDB {
    this.initDB();
    return JSON.parse(localStorage.getItem(STORAGE_KEY) as string) as OpsDeskDB;
  },

  saveDB(db: OpsDeskDB): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  },

  resetDB(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_OPSDESK_DATA));
  },

  getCurrentUser(): User | null {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  },

  async login(role: UserRole, email: string, password: string): Promise<User> {
    if (this.USE_BACKEND_API) {
      const res = await fetch(`${this.BASE_URL}/auth/login`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ role, email, password })
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const user = (await res.json()) as User;
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return user;
    }

    const db = this.getDB();
    const user = db.users.find(
      (u) => u.role === role && u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) throw new Error("Invalid email, password, or role selection.");
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  async register(
    role: UserRole,
    payload: {
      name: string;
      agencyName?: string;
      email: string;
      phone?: string;
      region?: string;
      password: string;
      inviteCode?: string;
    }
  ): Promise<User> {
    if (this.USE_BACKEND_API) {
      const res = await fetch(`${this.BASE_URL}/auth/register`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ role, ...payload })
      });
      if (!res.ok) throw new Error("Registration failed");
      const user = (await res.json()) as User;
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return user;
    }

    const db = this.getDB();
    if (role !== "agency" && payload.inviteCode !== db.inviteCode) {
      throw new Error(`Invalid staff invite code. Use ${db.inviteCode} for the demo.`);
    }
    if (db.users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
      throw new Error("A user with this email already exists.");
    }

    const newUser: User = {
      id: `u-${role}-${Date.now()}`,
      role,
      name: payload.name,
      agencyName: role === "agency" ? payload.agencyName : undefined,
      email: payload.email,
      phone: payload.phone || "",
      region: payload.region || "Global",
      available: true,
      password: payload.password
    };
    db.users.push(newUser);
    this.saveDB(db);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    return newUser;
  },

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  detectCategoryFromText(text = ""): string {
    const lower = text.toLowerCase();
    if (lower.includes("refund") || lower.includes("wallet") || lower.includes("credit")) return "Refund";
    if (lower.includes("cancel") || lower.includes("waiver")) return "Cancellation";
    if (lower.includes("name") || lower.includes("date") || lower.includes("modify")) return "Hotel Modification";
    if (lower.includes("voucher") || lower.includes("overbook") || lower.includes("check-in")) return "Booking Issue";
    return "General Support";
  },

  calculateTravelSLA(checkInDate: string, priority: PriorityLevel): SlaStatus {
    if (!checkInDate) return "On Track";
    const today = new Date("2026-11-11");
    const checkIn = new Date(checkInDate);
    const diffDays = (checkIn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 0 || priority === "Critical") return "Breached";
    if (diffDays <= 2 || priority === "High") return "At Risk";
    return "On Track";
  },

  async getTickets(): Promise<Ticket[]> {
    if (this.USE_BACKEND_API) {
      const res = await fetch(`${this.BASE_URL}/tickets`, {
        method: "GET",
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return (await res.json()) as Ticket[];
    }

    const db = this.getDB();
    const user = this.getCurrentUser();
    if (user && user.role === "agency") {
      return db.tickets.filter((t) => t.agencyId === user.id || t.agencyName === user.agencyName);
    }
    return db.tickets;
  },

  async getTicketById(ticketId: string): Promise<Ticket | null> {
    if (this.USE_BACKEND_API) {
      const res = await fetch(`${this.BASE_URL}/tickets/${ticketId}`, {
        method: "GET",
        headers: this.getHeaders()
      });
      if (!res.ok) return null;
      return (await res.json()) as Ticket;
    }

    const tickets = await this.getTickets();
    return tickets.find((t) => t.id === ticketId) || null;
  },

  async createTicket(payload: {
    title: string;
    description: string;
    bookingNumber: string;
    region: string;
    category: string;
    priority: PriorityLevel;
    checkInDate: string;
    checkOutDate: string;
  }): Promise<Ticket> {
    if (this.USE_BACKEND_API) {
      const res = await fetch(`${this.BASE_URL}/tickets`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to create ticket");
      return (await res.json()) as Ticket;
    }

    const db = this.getDB();
    const user = this.getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const region = payload.region || user.region || "India";
    let matchingAgent = db.users.find(
      (u) => u.role === "agent" && u.region === region && u.available
    );
    if (!matchingAgent) {
      matchingAgent =
        db.users.find((u) => u.role === "agent" && u.region === region) ||
        db.users.find((u) => u.role === "agent" && u.available);
    }

    const slaStatus = this.calculateTravelSLA(payload.checkInDate, payload.priority);
    const newId = `TCK-${1010 + db.tickets.length}`;

    const newTicket: Ticket = {
      id: newId,
      title: payload.title,
      description: payload.description,
      bookingNumber: payload.bookingNumber.toUpperCase(),
      agencyId: user.id,
      agencyName: user.agencyName || user.name,
      region,
      priority: payload.priority,
      category: payload.category,
      intent: payload.category,
      status: matchingAgent ? "Open" : "New",
      checkInDate: payload.checkInDate,
      checkOutDate: payload.checkOutDate,
      slaStatus,
      assignedToId: matchingAgent ? matchingAgent.id : null,
      assignedToName: matchingAgent ? matchingAgent.name : "Unassigned",
      routingReason: matchingAgent
        ? `Auto-routed to ${matchingAgent.name}: Matched Selected Region (${region}) + Priority (${payload.priority})`
        : `Placed in Unassigned Queue: No agent found for ${region}`,
      themes: [payload.category === "Refund" ? "Refund Delay" : payload.category],
      createdAt: "2026-11-11 15:30",
      timeline: [
        {
          id: `tl-${Date.now()}`,
          type: "system",
          author: "OpsDesk Smart Router",
          text: `Ticket created by ${user.agencyName || user.name} for Region '${region}'. Automatically assigned to ${matchingAgent ? matchingAgent.name : "Unassigned Pool"} (${region} Region). SLA evaluated from check-in (${payload.checkInDate}) as '${slaStatus}'.`,
          time: "2026-11-11 15:30"
        }
      ],
      sideConversations: []
    };

    db.tickets.unshift(newTicket);
    this.saveDB(db);
    return newTicket;
  },

  async deleteTicket(ticketId: string): Promise<boolean> {
    if (this.USE_BACKEND_API) {
      const res = await fetch(`${this.BASE_URL}/tickets/${ticketId}`, {
        method: "DELETE",
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error("Failed to delete ticket");
      return true;
    }

    const db = this.getDB();
    const user = this.getCurrentUser();
    const index = db.tickets.findIndex((t) => t.id === ticketId);
    if (index === -1) throw new Error("Ticket not found");

    const ticket = db.tickets[index];
    if (user && user.role === "agency" && ticket.agencyId !== user.id && ticket.agencyName !== user.agencyName) {
      throw new Error("You can only delete your own agency's tickets.");
    }

    db.tickets.splice(index, 1);
    this.saveDB(db);
    return true;
  },

  async updateTicketNumber(oldTicketId: string, newTicketId: string, newBookingNumber: string): Promise<Ticket> {
    if (this.USE_BACKEND_API) {
      const res = await fetch(`${this.BASE_URL}/tickets/${oldTicketId}/number`, {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify({ newTicketId, newBookingNumber })
      });
      if (!res.ok) throw new Error("Failed to update ticket number");
      return (await res.json()) as Ticket;
    }

    const db = this.getDB();
    const user = this.getCurrentUser();
    const ticket = db.tickets.find((t) => t.id === oldTicketId);
    if (!ticket) throw new Error("Ticket not found");

    const cleanedTicketId = (newTicketId || "").trim().toUpperCase();
    const cleanedBooking = (newBookingNumber || ticket.bookingNumber).trim().toUpperCase();

    if (!cleanedTicketId) throw new Error("Ticket number cannot be empty.");
    if (cleanedTicketId !== oldTicketId && db.tickets.some((t) => t.id.toUpperCase() === cleanedTicketId)) {
      throw new Error(`Ticket number ${cleanedTicketId} already exists.`);
    }

    const prevId = ticket.id;
    const prevBooking = ticket.bookingNumber;
    ticket.id = cleanedTicketId;
    ticket.bookingNumber = cleanedBooking;

    ticket.timeline.push({
      id: `tl-${Date.now()}`,
      type: "system",
      author: user ? user.name : "Support Agent",
      text: `Updated Ticket Number (${prevId} → ${ticket.id}) and Booking Ref (${prevBooking} → ${ticket.bookingNumber}).`,
      time: "2026-11-11 15:34"
    });

    this.saveDB(db);
    return ticket;
  },

  async updateTicketStatus(ticketId: string, newStatus: TicketStatus, noteText = ""): Promise<Ticket> {
    if (this.USE_BACKEND_API) {
      const res = await fetch(`${this.BASE_URL}/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify({ status: newStatus, noteText })
      });
      if (!res.ok) throw new Error("Failed to update status");
      return (await res.json()) as Ticket;
    }

    const db = this.getDB();
    const user = this.getCurrentUser();
    const ticket = db.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error("Ticket not found");

    ticket.status = newStatus;
    ticket.timeline.push({
      id: `tl-${Date.now()}`,
      type: "system",
      author: user ? user.name : "System",
      text: `Status changed to ${newStatus}${noteText ? ` — ${noteText}` : ""}`,
      time: "2026-11-11 15:35"
    });
    this.saveDB(db);
    return ticket;
  },

  async assignTicket(ticketId: string, targetUserId: string, reasonNote = ""): Promise<Ticket> {
    if (this.USE_BACKEND_API) {
      const res = await fetch(`${this.BASE_URL}/tickets/${ticketId}/assign`, {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify({ targetUserId, reasonNote })
      });
      if (!res.ok) throw new Error("Failed to assign ticket");
      return (await res.json()) as Ticket;
    }

    const db = this.getDB();
    const actor = this.getCurrentUser();
    const ticket = db.tickets.find((t) => t.id === ticketId);
    const targetUser = db.users.find((u) => u.id === targetUserId);
    if (!ticket || !targetUser) throw new Error("Invalid ticket or assignee");

    const previousOwner = ticket.assignedToName;
    ticket.assignedToId = targetUser.id;
    ticket.assignedToName = targetUser.name;
    if (ticket.status === "New") ticket.status = "Open";
    ticket.routingReason = reasonNote || `Assigned to ${targetUser.name} (${targetUser.region}) by ${actor?.name || "Staff"}`;

    ticket.sideConversations.forEach((sc) => {
      sc.preservedOnTransfer = true;
    });

    ticket.timeline.push({
      id: `tl-${Date.now()}`,
      type: "system",
      author: actor ? actor.name : "Staff",
      text: `Ticket reassigned from ${previousOwner} to ${targetUser.name}. All ${ticket.sideConversations.length} side conversation recipient lists preserved.`,
      time: "2026-11-11 15:36"
    });

    this.saveDB(db);
    return ticket;
  },

  async escalateTicket(ticketId: string): Promise<Ticket> {
    if (this.USE_BACKEND_API) {
      const res = await fetch(`${this.BASE_URL}/tickets/${ticketId}/escalate`, {
        method: "POST",
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error("Failed to escalate ticket");
      return (await res.json()) as Ticket;
    }

    const db = this.getDB();
    const actor = this.getCurrentUser();
    const ticket = db.tickets.find((t) => t.id === ticketId);
    const manager = db.users.find((u) => u.role === "manager");
    if (!ticket || !manager) throw new Error("Manager not found");

    ticket.status = "Escalated";
    ticket.assignedToId = manager.id;
    ticket.assignedToName = `${manager.name} (Escalation Manager)`;
    ticket.routingReason = `Escalated by ${actor?.name || "Agent"} due to travel check-in deadline (${ticket.checkInDate})`;

    ticket.timeline.push({
      id: `tl-${Date.now()}`,
      type: "system",
      author: actor ? actor.name : "Agent",
      text: `ESCALATED TO MANAGER (${manager.name}) — Check-in date ${ticket.checkInDate} requires immediate executive intervention.`,
      time: "2026-11-11 15:38"
    });

    this.saveDB(db);
    return ticket;
  },

  async addComment(ticketId: string, commentType: "public" | "internal", text: string): Promise<Ticket> {
    if (this.USE_BACKEND_API) {
      const res = await fetch(`${this.BASE_URL}/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ type: commentType, text })
      });
      if (!res.ok) throw new Error("Failed to add comment");
      return (await res.json()) as Ticket;
    }

    const db = this.getDB();
    const user = this.getCurrentUser();
    const ticket = db.tickets.find((t) => t.id === ticketId);
    if (!ticket || !user) throw new Error("Ticket or user not found");

    ticket.timeline.push({
      id: `tl-${Date.now()}`,
      type: commentType,
      author: `${user.name} (${user.role.toUpperCase()})`,
      text,
      time: "2026-11-11 15:40"
    });
    this.saveDB(db);
    return ticket;
  },

  async createSideConversation(
    ticketId: string,
    subject: string,
    recipientsCsv: string,
    message: string
  ): Promise<Ticket> {
    if (this.USE_BACKEND_API) {
      const res = await fetch(`${this.BASE_URL}/tickets/${ticketId}/side-conversations`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ subject, recipientsCsv, message })
      });
      if (!res.ok) throw new Error("Failed to create side conversation");
      return (await res.json()) as Ticket;
    }

    const db = this.getDB();
    const user = this.getCurrentUser();
    const ticket = db.tickets.find((t) => t.id === ticketId);
    if (!ticket || !user) throw new Error("Ticket not found");

    const recipients = recipientsCsv
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    ticket.sideConversations.push({
      id: `sc-${Date.now()}`,
      subject,
      recipients,
      preservedOnTransfer: true,
      messages: [
        {
          sender: user.name,
          text: message,
          time: "2026-11-11 15:42"
        }
      ]
    });

    ticket.timeline.push({
      id: `tl-${Date.now()}`,
      type: "system",
      author: user.name,
      text: `Started Side Conversation "${subject}" with [${recipients.join(", ")}].`,
      time: "2026-11-11 15:42"
    });

    this.saveDB(db);
    return ticket;
  },

  async replySideConversation(ticketId: string, scId: string, text: string): Promise<Ticket> {
    if (this.USE_BACKEND_API) {
      const res = await fetch(`${this.BASE_URL}/tickets/${ticketId}/side-conversations/${scId}/reply`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error("Failed to reply to side conversation");
      return (await res.json()) as Ticket;
    }

    const db = this.getDB();
    const user = this.getCurrentUser();
    const ticket = db.tickets.find((t) => t.id === ticketId);
    const thread = ticket?.sideConversations.find((s) => s.id === scId);
    if (!thread || !ticket || !user) throw new Error("Thread not found");

    thread.messages.push({
      sender: user.name,
      text,
      time: "2026-11-11 15:44"
    });
    this.saveDB(db);
    return ticket;
  },

  async toggleAgentAvailability(agentId: string): Promise<User | undefined> {
    if (this.USE_BACKEND_API) {
      const res = await fetch(`${this.BASE_URL}/users/${agentId}/availability`, {
        method: "PATCH",
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error("Failed to toggle availability");
      return (await res.json()) as User;
    }

    const db = this.getDB();
    const agent = db.users.find((u) => u.id === agentId);
    if (agent) {
      agent.available = !agent.available;
      this.saveDB(db);
    }
    return agent;
  }
};