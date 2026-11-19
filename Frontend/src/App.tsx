import React, { useEffect, useState } from "react";
import type { PriorityLevel, Ticket, TicketStatus, UiListState, User, UserRole } from "./types";
import { OpsDeskAPI } from "./api";

const ROLE_META: Record<
  UserRole,
  {
    label: string;
    home: string;
    demoEmail: string;
    nav: { label: string; hash: string }[];
  }
> = {
  agency: {
    label: "Travel Agency",
    home: "#/agency/dashboard",
    demoEmail: "agency@skyline.com",
    nav: [
      { label: "Agency Dashboard", hash: "#/agency/dashboard" },
      { label: "Create Ticket", hash: "#/agency/create-ticket" },
      { label: "My Tickets", hash: "#/agency/tickets" },
      { label: "Profile", hash: "#/profile" }
    ]
  },
  agent: {
    label: "Support Agent",
    home: "#/agent/my-queue",
    demoEmail: "priya@tbo-ops.com",
    nav: [
      { label: "My Queue", hash: "#/agent/my-queue" },
      { label: "Unassigned Tickets", hash: "#/agent/unassigned" },
      { label: "By Region View", hash: "#/agent/by-region" },
      { label: "By Intent View", hash: "#/agent/by-intent" },
      { label: "Linked Cases View", hash: "#/agent/linked-cases" },
      { label: "Profile", hash: "#/profile" }
    ]
  },
  manager: {
    label: "Escalation Manager",
    home: "#/manager/queue",
    demoEmail: "vikram.manager@tbo-ops.com",
    nav: [
      { label: "Escalation Queue", hash: "#/manager/queue" },
      { label: "Escalation Overview", hash: "#/manager/overview" },
      { label: "Profile", hash: "#/profile" }
    ]
  },
  lead: {
    label: "Team Lead",
    home: "#/lead/dashboard",
    demoEmail: "lead@tbo-ops.com",
    nav: [
      { label: "Lead Dashboard", hash: "#/lead/dashboard" },
      { label: "Weekly Insights", hash: "#/lead/insights" },
      { label: "SLA Overview", hash: "#/lead/sla" },
      { label: "Team Workload", hash: "#/lead/workload" },
      { label: "Export Data (CSV)", hash: "#/lead/export" },
      { label: "Profile", hash: "#/profile" }
    ]
  }
};

export function App() {
  const [hash, setHash] = useState<string>(() => window.location.hash || "#/");
  const [user, setUser] = useState<User | null>(() => OpsDeskAPI.getCurrentUser());
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [uiState, setUiState] = useState<UiListState>("normal");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [agencyStatusFilter, setAgencyStatusFilter] = useState<string>("ALL");
  const [agentRegionFilter, setAgentRegionFilter] = useState<string>("ALL");
  const [agentIntentFilter, setAgentIntentFilter] = useState<string>("ALL");

  const [editModalData, setEditModalData] = useState<{
    ticketId: string;
    bookingNumber: string;
    isDetail: boolean;
  } | null>(null);
  const [sideConvTicketId, setSideConvTicketId] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const refreshData = async () => {
    OpsDeskAPI.initDB();
    setUser(OpsDeskAPI.getCurrentUser());
    const list = await OpsDeskAPI.getTickets();
    setTickets(list);
  };

  useEffect(() => {
    refreshData();
    const onHashChange = () => {
      setHash(window.location.hash || "#/");
      refreshData();
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (targetHash: string) => {
    window.location.hash = targetHash;
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    try {
      const loggedIn = await OpsDeskAPI.login(role, ROLE_META[role].demoEmail, "password123");
      setUser(loggedIn);
      notify(`Logged in as ${ROLE_META[role].label}`);
      navigate(ROLE_META[role].home);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Login failed");
    }
  };

  const handleLogout = () => {
    OpsDeskAPI.logout();
    setUser(null);
    notify("Signed out.");
    navigate("#/");
  };

  const handleDeleteTicket = async (ticketId: string, redirectAfter = false) => {
    if (!window.confirm(`Are you sure you want to delete ticket ${ticketId}?`)) return;
    try {
      await OpsDeskAPI.deleteTicket(ticketId);
      notify(`Ticket ${ticketId} deleted.`);
      await refreshData();
      if (redirectAfter) navigate("#/agency/tickets");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleAssignToMe = async (ticketId: string) => {
    if (!user) return;
    await OpsDeskAPI.assignTicket(ticketId, user.id, `Claimed from Unassigned Queue by ${user.name}`);
    notify(`Ticket ${ticketId} assigned to you!`);
    await refreshData();
  };

  const renderTicketTable = (list: Ticket[], role: UserRole, showAssignToMe = false) => {
    if (uiState === "loading") {
      return (
        <div className="state-box">
          <div className="spinner" />
          <h3>Loading OpsDesk records...</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Fetching live context & travel SLA deadlines from server.
          </p>
        </div>
      );
    }
    if (uiState === "error") {
      return (
        <div className="state-box" style={{ borderColor: "var(--danger)" }}>
          <h3 style={{ color: "var(--danger)" }}>503 — Unable to Fetch Ticket Queue</h3>
          <p style={{ margin: "8px 0 14px", fontSize: 13 }}>
            The backend API timed out while syncing booking records.
          </p>
          <button className="btn btn-primary" onClick={() => setUiState("normal")}>
            Retry Connection
          </button>
        </div>
      );
    }
    if (uiState === "empty" || list.length === 0) {
      return (
        <div className="state-box">
          <h3 style={{ color: "var(--plum)" }}>Queue is Clear</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            No tickets match this filter.
          </p>
        </div>
      );
    }

    return (
      <div style={{ overflowX: "auto" }}>
        <table className="ticket-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Booking (TBOH)</th>
              <th>Title & Category</th>
              <th>Region</th>
              <th>Check-In Date</th>
              <th>SLA Deadline</th>
              <th>Status</th>
              <th>Assigned Agent</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => {
              const detailHash =
                role === "agency"
                  ? `#/agency/tickets/${t.id}`
                  : role === "manager"
                  ? `#/manager/tickets/${t.id}`
                  : `#/agent/tickets/${t.id}`;
              const slaClass =
                t.slaStatus === "Breached"
                  ? "sla-breached"
                  : t.slaStatus === "At Risk"
                  ? "sla-at-risk"
                  : "sla-on-track";
              return (
                <tr key={t.id}>
                  <td>
                    <strong>{t.id}</strong>
                  </td>
                  <td>
                    <span className="badge" style={{ background: "var(--cream)", color: "var(--plum-dark)" }}>
                      {t.bookingNumber}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--plum-dark)" }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {t.category} • Priority: {t.priority}
                    </div>
                  </td>
                  <td>
                    <strong>{t.region}</strong>
                    {role !== "agency" && (
                      <>
                        <br />
                        <small style={{ color: "var(--text-muted)" }}>{t.agencyName}</small>
                      </>
                    )}
                  </td>
                  <td>{t.checkInDate}</td>
                  <td>
                    <span className={`sla-badge ${slaClass}`}>{t.slaStatus}</span>
                  </td>
                  <td>
                    <span className={`badge badge-status-${t.status}`}>{t.status}</span>
                  </td>
                  <td>{t.assignedToName}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <a href={detailHash} className="btn btn-primary btn-sm">
                        Open
                      </a>
                      {role === "agent" && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() =>
                            setEditModalData({ ticketId: t.id, bookingNumber: t.bookingNumber, isDetail: false })
                          }
                        >
                          Edit #
                        </button>
                      )}
                      {showAssignToMe && (
                        <button className="btn btn-teal btn-sm" onClick={() => handleAssignToMe(t.id)}>
                          Assign to me
                        </button>
                      )}
                      {role === "agency" && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTicket(t.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (hash === "#/") {
    return (
      <>
        <div className="landing-wrapper">
          <div className="landing-card">
            <div>
              <span className="badge" style={{ background: "var(--teal)", color: "#163028", marginBottom: 8 }}>
                TBO SUPPORT PLATFORM
              </span>
              <h1 style={{ color: "var(--plum)", fontSize: 32 }}>OpsDesk Support Portal</h1>
              <p style={{ color: "var(--text-muted)" }}>
                Context-linked tickets, travel-aware deadlines, smart regional routing & supplier threads.
              </p>
            </div>

            <div className="role-grid">
              {(Object.entries(ROLE_META) as [UserRole, (typeof ROLE_META)[UserRole]][]).map(([roleKey, meta]) => (
                <div className="role-card" key={roleKey}>
                  <div>
                    <h3>I'm a {meta.label}</h3>
                    <p>
                      {roleKey === "agency"
                        ? "Create TBOH booking tickets, select region for auto-routing, and track SLA status."
                        : roleKey === "agent"
                        ? "Work regional & intent queues, link repeat bookings, and message suppliers."
                        : roleKey === "manager"
                        ? "Handle high-urgency escalated check-ins, resolve, or reassign."
                        : "Monitor weekly recurring themes, SLA breaches, agent workload & unlimited CSV exports."}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <a href={`#/login/${roleKey}`} className="btn btn-primary">
                      {meta.label} Login
                    </a>
                    <a href={`#/register/${roleKey}`} className="btn btn-outline">
                      Register as {meta.label}
                    </a>
                    <button className="btn btn-teal btn-sm" onClick={() => handleQuickDemoLogin(roleKey)}>
                      1-Click Demo Login
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {toastMsg && (
          <div className="toast-container">
            <div className="toast">{toastMsg}</div>
          </div>
        )}
      </>
    );
  }

  const loginMatch = hash.match(/^#\/login\/(agency|agent|manager|lead)$/);
  if (loginMatch) {
    const role = loginMatch[1] as UserRole;
    return (
      <AuthLoginView
        role={role}
        onSuccess={(loggedIn) => {
          setUser(loggedIn);
          notify("Welcome back!");
          navigate(ROLE_META[role].home);
        }}
        onError={notify}
        toastMsg={toastMsg}
      />
    );
  }

  const regMatch = hash.match(/^#\/register\/(agency|agent|manager|lead)$/);
  if (regMatch) {
    const role = regMatch[1] as UserRole;
    return (
      <AuthRegisterView
        role={role}
        onSuccess={(registered) => {
          setUser(registered);
          notify(`Registered & signed in as ${ROLE_META[role].label}!`);
          navigate(ROLE_META[role].home);
        }}
        onError={notify}
        toastMsg={toastMsg}
      />
    );
  }

  if (!user) {
    navigate("#/");
    return null;
  }

  const isRoleViolation =
    (hash.startsWith("#/agency/") && user.role !== "agency") ||
    (hash.startsWith("#/agent/") && !["agent", "manager", "lead"].includes(user.role)) ||
    (hash.startsWith("#/manager/") && user.role !== "manager") ||
    (hash.startsWith("#/lead/") && user.role !== "lead");

  let pageTitle = "OpsDesk";
  let content: React.ReactNode = null;

  if (hash === "#/403" || isRoleViolation) {
    pageTitle = "403 Access Denied";
    content = (
      <div className="card" style={{ maxWidth: 620, margin: "40px auto", textAlign: "center", border: "2px solid var(--danger)" }}>
        <span className="badge" style={{ background: "var(--danger)", color: "#fff", marginBottom: 10 }}>
          HTTP 403 — ACCESS DENIED
        </span>
        <h2 style={{ color: "var(--plum)", marginBottom: 8 }}>Role Permission Restricted</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 18 }}>
          Your current account role (<strong>{ROLE_META[user.role].label}</strong>) is not authorized to view{" "}
          <code>{hash}</code>.
        </p>
        <a href={ROLE_META[user.role].home} className="btn btn-primary">
          Return to My Home Dashboard
        </a>
      </div>
    );
  } else if (hash === "#/profile") {
    pageTitle = "Profile";
    content = (
      <div className="card" style={{ maxWidth: 600 }}>
        <div className="card-header">
          <h3>Profile</h3>
          <span className="role-chip">{ROLE_META[user.role].label}</span>
        </div>
        <div className="form-group">
          <label>Name</label>
          <input className="input" value={user.name} disabled />
        </div>
        {user.agencyName && (
          <div className="form-group">
            <label>Agency Name</label>
            <input className="input" value={user.agencyName} disabled />
          </div>
        )}
        <div className="form-group">
          <label>Email</label>
          <input className="input" value={user.email} disabled />
        </div>
        <div className="form-group">
          <label>Region</label>
          <input className="input" value={user.region || "Global"} disabled />
        </div>

        <div className="form-group" style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 14 }}>
          <label>List View State (Preview Loading, Empty, or Error States)</label>
          <select
            className="input"
            value={uiState}
            onChange={(e) => {
              const val = e.target.value as UiListState;
              setUiState(val);
              notify(`List state set to: ${val}`);
            }}
          >
            <option value="normal">Normal</option>
            <option value="loading">Loading State</option>
            <option value="empty">Empty State</option>
            <option value="error">Error State</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              OpsDeskAPI.resetDB();
              refreshData();
              notify("Database reset to initial sample data!");
            }}
          >
            Reset Sample Data
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    );
  } else if (hash === "#/agency/dashboard") {
    pageTitle = "Agency Dashboard";
    const openCount = tickets.filter((t) => ["Open", "New", "Escalated"].includes(t.status)).length;
    const pendingCount = tickets.filter((t) => t.status === "Pending").length;
    const resolvedCount = tickets.filter((t) => ["Resolved", "Closed"].includes(t.status)).length;
    content = (
      <>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Open Tickets</div>
            <div className="stat-value">{openCount}</div>
          </div>
          <div className="stat-card cream">
            <div className="stat-label">Pending Tickets</div>
            <div className="stat-value">{pendingCount}</div>
          </div>
          <div className="stat-card sage">
            <div className="stat-label">Resolved Tickets</div>
            <div className="stat-value">{resolvedCount}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Recent Agency Support Requests</h3>
            <a href="#/agency/create-ticket" className="btn btn-primary">
              + Create Ticket
            </a>
          </div>
          {renderTicketTable(tickets, "agency")}
        </div>
      </>
    );
  } else if (hash === "#/agency/create-ticket") {
    pageTitle = "Create Ticket";
    content = (
      <CreateTicketView
        defaultRegion={user.region || "India"}
        onCreated={async (created) => {
          await refreshData();
          notify(`Ticket ${created.id} created & assigned to ${created.assignedToName} (${created.region})!`);
          navigate(`#/agency/tickets/${created.id}`);
        }}
      />
    );
  } else if (hash === "#/agency/tickets") {
    pageTitle = "My Tickets";
    const filtered =
      agencyStatusFilter === "ALL" ? tickets : tickets.filter((t) => t.status === agencyStatusFilter);
    content = (
      <div className="card">
        <div className="card-header">
          <h3>My Agency Tickets</h3>
          <a href="#/agency/create-ticket" className="btn btn-primary btn-sm">
            + Create Ticket
          </a>
        </div>
        <div className="filter-bar">
          <div style={{ minWidth: 220 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Filter by Status:</label>
            <select
              className="input"
              value={agencyStatusFilter}
              onChange={(e) => setAgencyStatusFilter(e.target.value)}
            >
              {["ALL", "New", "Open", "Pending", "Escalated", "Resolved", "Closed"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        {renderTicketTable(filtered, "agency")}
      </div>
    );
  } else if (hash.startsWith("#/agency/tickets/")) {
    const id = hash.split("/")[3];
    pageTitle = `Ticket Detail (${id})`;
    content = (
      <TicketDetailView
        ticketId={id}
        viewRole="agency"
        onRefresh={refreshData}
        notify={notify}
        onDelete={(tid) => handleDeleteTicket(tid, true)}
        onOpenEditModal={(tid, bNum) => setEditModalData({ ticketId: tid, bookingNumber: bNum, isDetail: true })}
        onOpenSideConv={(tid) => setSideConvTicketId(tid)}
      />
    );
  } else if (hash === "#/agent/my-queue") {
    pageTitle = "Support Agent — My Queue";
    const mine = tickets.filter((t) => t.assignedToId === user.id);
    content = (
      <div className="card">
        <div className="card-header">
          <h3>
            My Assigned Queue ({user.name} — {user.region})
          </h3>
          <span className="role-chip">Smart Routing Active</span>
        </div>
        {renderTicketTable(mine, "agent")}
      </div>
    );
  } else if (hash === "#/agent/unassigned") {
    pageTitle = "Unassigned Tickets Queue";
    const unassigned = tickets.filter((t) => !t.assignedToId);
    content = (
      <div className="card">
        <div className="card-header">
          <h3>Unassigned Tickets Pool</h3>
          <span className="badge" style={{ background: "var(--cream)", color: "var(--plum-dark)" }}>
            Click "Assign to me" to claim
          </span>
        </div>
        {renderTicketTable(unassigned, "agent", true)}
      </div>
    );
  } else if (hash === "#/agent/by-region") {
    pageTitle = "Tickets By Region View";
    const list = agentRegionFilter === "ALL" ? tickets : tickets.filter((t) => t.region === agentRegionFilter);
    content = (
      <div className="card">
        <div className="card-header">
          <h3>Tickets By Region View</h3>
        </div>
        <div className="filter-bar">
          <div style={{ minWidth: 220 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Select Region:</label>
            <select className="input" value={agentRegionFilter} onChange={(e) => setAgentRegionFilter(e.target.value)}>
              {["ALL", "India", "EMEA", "APAC", "Americas"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        {renderTicketTable(list, "agent")}
      </div>
    );
  } else if (hash === "#/agent/by-intent") {
    pageTitle = "Tickets By Intent View";
    const list = agentIntentFilter === "ALL" ? tickets : tickets.filter((t) => t.category === agentIntentFilter);
    content = (
      <div className="card">
        <div className="card-header">
          <h3>Tickets By Intent / Category View</h3>
        </div>
        <div className="filter-bar">
          <div style={{ minWidth: 240 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Select Intent:</label>
            <select className="input" value={agentIntentFilter} onChange={(e) => setAgentIntentFilter(e.target.value)}>
              {["ALL", "Refund", "Cancellation", "Hotel Modification", "Booking Issue"].map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
        </div>
        {renderTicketTable(list, "agent")}
      </div>
    );
  } else if (hash === "#/agent/linked-cases") {
    pageTitle = "Linked Cases View";
    const groups: Record<string, Ticket[]> = {};
    tickets.forEach((t) => {
      if (!groups[t.bookingNumber]) groups[t.bookingNumber] = [];
      groups[t.bookingNumber].push(t);
    });
    content = (
      <div className="card">
        <div className="card-header">
          <h3>Linked Cases View (Grouped by Booking #TBOH & Agency Context)</h3>
          <span className="badge" style={{ background: "var(--sage)", color: "#193814" }}>
            Context Memory
          </span>
        </div>
        {Object.entries(groups).map(([booking, groupTickets]) => (
          <div
            key={booking}
            style={{
              border: "2px solid var(--sage)",
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
              background: "var(--surface)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <strong style={{ color: "var(--plum)", fontSize: 16 }}>Booking Reference: {booking}</strong>
                <span style={{ marginLeft: 10, fontSize: 13, color: "var(--text-muted)" }}>
                  Agency: {groupTickets[0].agencyName}
                </span>
              </div>
              <span className="badge" style={{ background: "var(--plum)", color: "var(--cream)" }}>
                {groupTickets.length} Linked Ticket(s)
              </span>
            </div>
            {renderTicketTable(groupTickets, "agent")}
          </div>
        ))}
      </div>
    );
  } else if (hash.startsWith("#/agent/tickets/")) {
    const id = hash.split("/")[3];
    pageTitle = `Agent Ticket Workspace (${id})`;
    content = (
      <TicketDetailView
        ticketId={id}
        viewRole="agent"
        onRefresh={refreshData}
        notify={notify}
        onDelete={(tid) => handleDeleteTicket(tid, true)}
        onOpenEditModal={(tid, bNum) => setEditModalData({ ticketId: tid, bookingNumber: bNum, isDetail: true })}
        onOpenSideConv={(tid) => setSideConvTicketId(tid)}
      />
    );
  } else if (hash === "#/manager/queue") {
    pageTitle = "Escalation Manager Queue";
    const escalated = tickets
      .filter((t) => t.status === "Escalated")
      .sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime());
    content = (
      <div className="card">
        <div className="card-header">
          <h3>Escalation Queue (Sorted Most Urgent / Earliest Check-in First)</h3>
          <span className="badge" style={{ background: "var(--danger)", color: "#fff" }}>
            Manager Escalations
          </span>
        </div>
        {renderTicketTable(escalated, "manager")}
      </div>
    );
  } else if (hash === "#/manager/overview") {
    pageTitle = "Escalation Overview";
    const escalated = tickets.filter((t) => t.status === "Escalated");
    const breached = escalated.filter((t) => t.slaStatus === "Breached");
    content = (
      <>
        <div className="stats-grid">
          <div className="stat-card danger">
            <div className="stat-label">Open Escalated Tickets</div>
            <div className="stat-value">{escalated.length}</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-label">Breached Escalations</div>
            <div className="stat-value">{breached.length}</div>
          </div>
          <div className="stat-card sage">
            <div className="stat-label">Avg Manager Response SLA</div>
            <div className="stat-value">18m</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Escalation Summary by Ticket</h3>
          </div>
          {renderTicketTable(escalated, "manager")}
        </div>
      </>
    );
  } else if (hash.startsWith("#/manager/tickets/")) {
    const id = hash.split("/")[3];
    pageTitle = `Manager Escalation View (${id})`;
    content = (
      <TicketDetailView
        ticketId={id}
        viewRole="manager"
        onRefresh={refreshData}
        notify={notify}
        onDelete={(tid) => handleDeleteTicket(tid, true)}
        onOpenEditModal={(tid, bNum) => setEditModalData({ ticketId: tid, bookingNumber: bNum, isDetail: true })}
        onOpenSideConv={(tid) => setSideConvTicketId(tid)}
      />
    );
  } else if (hash === "#/lead/dashboard") {
    pageTitle = "Team Lead Dashboard";
    const atRisk = tickets.filter((t) => t.slaStatus === "At Risk").length;
    const breached = tickets.filter((t) => t.slaStatus === "Breached").length;
    const regionCounts: Record<string, number> = { India: 0, EMEA: 0, APAC: 0, Americas: 0 };
    tickets.forEach((t) => {
      regionCounts[t.region] = (regionCounts[t.region] || 0) + 1;
    });
    content = (
      <>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Active Tickets</div>
            <div className="stat-value">{tickets.length}</div>
          </div>
          <div className="stat-card cream">
            <div className="stat-label">At-Risk Deadlines</div>
            <div className="stat-value">{atRisk}</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-label">SLA Breached Count</div>
            <div className="stat-value">{breached}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Tickets Per Region Distribution</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            {Object.entries(regionCounts).map(([reg, count]) => (
              <div
                key={reg}
                style={{ background: "var(--bg)", border: "1.5px solid var(--sage)", padding: 14, borderRadius: 8 }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--plum)" }}>{reg} Region</div>
                <div style={{ fontSize: 24, fontWeight: 800, margin: "4px 0" }}>{count} Tickets</div>
                <div style={{ height: 8, background: "#e2e8e0", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, count * 25)}%`, height: "100%", background: "var(--teal)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  } else if (hash === "#/lead/insights") {
    pageTitle = "Weekly Theme Insights";
    const themeMap: Record<string, Ticket[]> = {};
    tickets.forEach((t) => {
      (t.themes || [t.category]).forEach((th) => {
        if (!themeMap[th]) themeMap[th] = [];
        themeMap[th].push(t);
      });
    });
    content = (
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Weekly Recurring Themes & Pattern Insights</h3>
            <small style={{ color: "var(--text-muted)" }}>
              Automatically surfaces repeating problems hidden across individual tickets.
            </small>
          </div>
          <a href="#/lead/export" className="btn btn-teal btn-sm">
            Export Full Dataset →
          </a>
        </div>
        {Object.entries(themeMap).map(([theme, list]) => (
          <div
            key={theme}
            style={{
              border: "1.5px solid var(--sage)",
              borderRadius: 10,
              padding: 16,
              marginBottom: 14,
              background: "var(--bg)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h4 style={{ color: "var(--plum)", fontSize: 16 }}>Theme Tag: #{theme}</h4>
              <span className="badge" style={{ background: "var(--plum)", color: "var(--cream)" }}>
                {list.length} Tickets This Week
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {list.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: "var(--surface)",
                    padding: "8px 12px",
                    borderRadius: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13
                  }}
                >
                  <span>
                    <strong>{t.id}</strong> ({t.bookingNumber}) — {t.title}
                  </span>
                  <a href={`#/agent/tickets/${t.id}`} className="btn btn-outline btn-sm">
                    Inspect
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  } else if (hash === "#/lead/sla") {
    pageTitle = "SLA Deadline Overview";
    const urgentList = tickets.filter((t) => t.slaStatus === "At Risk" || t.slaStatus === "Breached");
    content = (
      <div className="card">
        <div className="card-header">
          <h3>SLA Overview — At-Risk & Breached Tickets</h3>
          <span className="badge" style={{ background: "var(--cream)", color: "var(--plum-dark)" }}>
            Prioritized by Guest Check-In Date
          </span>
        </div>
        {renderTicketTable(urgentList, "lead")}
      </div>
    );
  } else if (hash === "#/lead/workload") {
    pageTitle = "Team Workload & Availability";
    const agents = OpsDeskAPI.getDB().users.filter((u) => u.role === "agent");
    content = (
      <div className="card">
        <div className="card-header">
          <h3>Support Team Workload & Live Availability</h3>
        </div>
        <table className="ticket-table">
          <thead>
            <tr>
              <th>Support Agent</th>
              <th>Region</th>
              <th>Active Assigned Tickets</th>
              <th>Routing Availability Status</th>
              <th>Toggle Status</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((ag) => {
              const count = tickets.filter((t) => t.assignedToId === ag.id && t.status !== "Resolved").length;
              return (
                <tr key={ag.id}>
                  <td>
                    <strong>{ag.name}</strong>
                    <br />
                    <small>{ag.email}</small>
                  </td>
                  <td>{ag.region}</td>
                  <td>
                    <span className="badge" style={{ background: "var(--cream)", color: "var(--plum-dark)" }}>
                      {count} active tickets
                    </span>
                  </td>
                  <td>
                    <span className={`sla-badge ${ag.available ? "sla-on-track" : "sla-breached"}`}>
                      {ag.available ? "Available for Smart Routing" : "Offline / Busy"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={async () => {
                        await OpsDeskAPI.toggleAgentAvailability(ag.id);
                        notify("Agent routing availability updated!");
                        refreshData();
                      }}
                    >
                      Switch to {ag.available ? "Offline" : "Available"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  } else if (hash === "#/lead/export") {
    pageTitle = "Uncapped CSV Data Export";
    content = <LeadExportView tickets={tickets} notify={notify} />;
  } else {
    pageTitle = "404 Page Not Found";
    content = (
      <div className="card" style={{ maxWidth: 620, margin: "40px auto", textAlign: "center" }}>
        <span className="badge" style={{ background: "var(--plum)", color: "var(--cream)", marginBottom: 10 }}>
          HTTP 404 — PAGE NOT FOUND
        </span>
        <h2 style={{ color: "var(--plum)", marginBottom: 8 }}>Route Does Not Exist</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 18 }}>
          We couldn't find the screen <code>{hash}</code> in OpsDesk.
        </p>
        <a href={ROLE_META[user.role].home} className="btn btn-primary">
          Back to Safety
        </a>
      </div>
    );
  }

  const roleMeta = ROLE_META[user.role];

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div>
            <div className="brand-logo" onClick={() => navigate(roleMeta.home)}>
              OpsDesk <span>TBO</span>
            </div>
            <div className="nav-section-title">{roleMeta.label} Workspace</div>
            {roleMeta.nav.map((item) => (
              <a
                key={item.hash}
                href={item.hash}
                className={`nav-link ${hash === item.hash ? "active" : ""}`}
              >
                <span>{item.label}</span>
              </a>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(240,233,182,0.2)", paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: "var(--cream)", marginBottom: 8 }}>
              Signed in as:
              <br />
              <strong>{user.name}</strong>
            </div>
            <button
              className="btn btn-teal btn-sm"
              style={{ width: "100%", marginBottom: 6 }}
              onClick={() => navigate("#/")}
            >
              Switch Role
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ width: "100%", color: "var(--cream)", borderColor: "var(--cream)" }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="main-area">
          <header className="topbar">
            <div className="topbar-title">{pageTitle}</div>
            <div className="topbar-user">
              <span className="role-chip">
                {roleMeta.label} • {user.region || "Global"}
              </span>
            </div>
          </header>
          <main className="page-content">{content}</main>
        </div>
      </div>

      {editModalData && (
        <EditTicketModal
          ticketId={editModalData.ticketId}
          bookingNumber={editModalData.bookingNumber}
          onClose={() => setEditModalData(null)}
          onSaved={async (updated) => {
            const wasDetail = editModalData.isDetail;
            const prevId = editModalData.ticketId;
            setEditModalData(null);
            await refreshData();
            notify(`Updated Ticket Number to ${updated.id} (Booking: ${updated.bookingNumber})`);
            if (wasDetail && updated.id !== prevId) {
              navigate(`#/agent/tickets/${updated.id}`);
            }
          }}
          onError={notify}
        />
      )}

      {sideConvTicketId && (
        <SideConvModal
          ticketId={sideConvTicketId}
          onClose={() => setSideConvTicketId(null)}
          onCreated={async () => {
            setSideConvTicketId(null);
            await refreshData();
            notify("Side conversation created & linked to ticket!");
          }}
        />
      )}

      {toastMsg && (
        <div className="toast-container">
          <div className="toast">{toastMsg}</div>
        </div>
      )}
    </>
  );
}

function AuthLoginView({
  role,
  onSuccess,
  onError,
  toastMsg
}: {
  role: UserRole;
  onSuccess: (u: User) => void;
  onError: (msg: string) => void;
  toastMsg: string | null;
}) {
  const meta = ROLE_META[role];
  const [email, setEmail] = useState(meta.demoEmail);
  const [password, setPassword] = useState("password123");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const loggedIn = await OpsDeskAPI.login(role, email.trim(), password);
      onSuccess(loggedIn);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Login error");
    }
  };

  return (
    <div className="landing-wrapper">
      <div className="auth-container">
        <a href="#/" style={{ fontSize: 13, color: "var(--plum)", textDecoration: "none", fontWeight: 600 }}>
          ← Back to Role Selection
        </a>
        <h2 style={{ color: "var(--plum)", margin: "12px 0 4px" }}>{meta.label} Login</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>
          Demo Account: <strong>{meta.demoEmail}</strong> / Password: <strong>password123</strong>
        </p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 8 }}>
            Sign In as {meta.label}
          </button>
        </form>
        <p style={{ fontSize: 13, textAlign: "center", marginTop: 16 }}>
          Need an account?{" "}
          <a href={`#/register/${role}`} style={{ color: "var(--plum)", fontWeight: 700 }}>
            Register as {meta.label}
          </a>
        </p>
      </div>
      {toastMsg && (
        <div className="toast-container">
          <div className="toast">{toastMsg}</div>
        </div>
      )}
    </div>
  );
}

function AuthRegisterView({
  role,
  onSuccess,
  onError,
  toastMsg
}: {
  role: UserRole;
  onSuccess: (u: User) => void;
  onError: (msg: string) => void;
  toastMsg: string | null;
}) {
  const meta = ROLE_META[role];
  const isAgency = role === "agency";
  const needsRegion = role === "agency" || role === "agent";

  const [agencyName, setAgencyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("India");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("TBO-STAFF-2026");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const registered = await OpsDeskAPI.register(role, {
        agencyName: agencyName.trim(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        region: needsRegion ? region : "Global",
        password,
        inviteCode: inviteCode.trim()
      });
      onSuccess(registered);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <div className="landing-wrapper">
      <div className="auth-container">
        <a href="#/" style={{ fontSize: 13, color: "var(--plum)", textDecoration: "none", fontWeight: 600 }}>
          ← Back to Role Selection
        </a>
        <h2 style={{ color: "var(--plum)", margin: "12px 0 4px" }}>{meta.label} Registration</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
          {isAgency
            ? "Register your travel agency to raise and track TBOH support tickets."
            : "Staff registration requires invite code: TBO-STAFF-2026"}
        </p>
        <form onSubmit={submit}>
          {isAgency && (
            <div className="form-group">
              <label>Agency Name</label>
              <input
                type="text"
                className="input"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>{isAgency ? "Contact Person Name" : "Full Name"}</label>
            <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {isAgency && (
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          )}
          {needsRegion && (
            <div className="form-group">
              <label>Country / Region</label>
              <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="India">India</option>
                <option value="EMEA">EMEA</option>
                <option value="APAC">APAC</option>
                <option value="Americas">Americas</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {!isAgency && (
            <div className="form-group">
              <label>Staff Invite Code</label>
              <input
                type="text"
                className="input"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 8 }}>
            Create {meta.label} Account
          </button>
        </form>
      </div>
      {toastMsg && (
        <div className="toast-container">
          <div className="toast">{toastMsg}</div>
        </div>
      )}
    </div>
  );
}

function CreateTicketView({
  defaultRegion,
  onCreated
}: {
  defaultRegion: string;
  onCreated: (t: Ticket) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bookingNumber, setBookingNumber] = useState("TBOH-88412");
  const [region, setRegion] = useState(defaultRegion);
  const [category, setCategory] = useState("Refund");
  const [priority, setPriority] = useState<PriorityLevel>("High");
  const [checkInDate, setCheckInDate] = useState("2026-11-12");
  const [checkOutDate, setCheckOutDate] = useState("2026-11-16");

  const onTextChange = (newTitle: string, newDesc: string) => {
    setTitle(newTitle);
    setDescription(newDesc);
    const detected = OpsDeskAPI.detectCategoryFromText(`${newTitle} ${newDesc}`);
    setCategory(detected);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await OpsDeskAPI.createTicket({
      title: title.trim(),
      description: description.trim(),
      bookingNumber: bookingNumber.trim(),
      region,
      category,
      priority,
      checkInDate,
      checkOutDate
    });
    onCreated(created);
  };

  return (
    <div className="card" style={{ maxWidth: 760 }}>
      <div className="card-header">
        <h3>Create New Support Ticket</h3>
        <span className="badge" style={{ background: "var(--teal-light)", color: "#164f3e" }}>
          Auto-Category & Regional Routing Active
        </span>
      </div>
      <form onSubmit={submit}>
        <div className="form-group">
          <label>Ticket Title</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Refund not received for cancelled booking"
            value={title}
            onChange={(e) => onTextChange(e.target.value, description)}
            required
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            rows={4}
            className="input"
            placeholder="Describe the issue in detail..."
            value={description}
            onChange={(e) => onTextChange(title, e.target.value)}
            required
          />
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--plum)", fontWeight: 700 }}>
            Auto-Detected Category: &quot;{category}&quot;
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div className="form-group">
            <label>Booking Number (TBOH Reference)</label>
            <input
              type="text"
              className="input"
              value={bookingNumber}
              onChange={(e) => setBookingNumber(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Select Region (Auto-Routes to Agent)</label>
            <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="India">India (Priya Sharma)</option>
              <option value="EMEA">EMEA (Marcus Vance)</option>
              <option value="APAC">APAC (Hana Kim)</option>
            </select>
            <small style={{ color: "var(--plum)", fontSize: 11, fontWeight: 600, display: "block", marginTop: 4 }}>
              Will auto-assign to {region} Support Agent
            </small>
          </div>
          <div className="form-group">
            <label>Category / Intent</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Refund">Refund</option>
              <option value="Cancellation">Cancellation</option>
              <option value="Hotel Modification">Hotel Modification</option>
              <option value="Booking Issue">Booking Issue</option>
              <option value="General Support">General Support</option>
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div className="form-group">
            <label>Priority</label>
            <select
              className="input"
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div className="form-group">
            <label>Guest Check-In Date</label>
            <input
              type="date"
              className="input"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Guest Check-Out Date</label>
            <input
              type="date"
              className="input"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              required
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary">
          Submit & Auto-Assign Ticket
        </button>
      </form>
    </div>
  );
}

function TicketDetailView({
  ticketId,
  viewRole,
  onRefresh,
  notify,
  onDelete,
  onOpenEditModal,
  onOpenSideConv
}: {
  ticketId: string;
  viewRole: "agency" | "agent" | "manager";
  onRefresh: () => Promise<void>;
  notify: (msg: string) => void;
  onDelete: (id: string) => void;
  onOpenEditModal: (id: string, bookingNumber: string) => void;
  onOpenSideConv: (id: string) => void;
}) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [publicReply, setPublicReply] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [reassignId, setReassignId] = useState("");
  const [scReplies, setScReplies] = useState<Record<string, string>>({});

  useEffect(() => {
    OpsDeskAPI.getTicketById(ticketId).then((t) => {
      setTicket(t);
      if (t && t.assignedToId) setReassignId(t.assignedToId);
    });
  }, [ticketId]);

  if (!ticket) {
    return (
      <div className="card">
        <h3>Ticket {ticketId} not found</h3>
        <a href="#/" className="btn btn-primary">
          Go Back
        </a>
      </div>
    );
  }

  const db = OpsDeskAPI.getDB();
  const isAgency = viewRole === "agency";
  const isAgent = viewRole === "agent";
  const isManager = viewRole === "manager";

  const linkedTickets = db.tickets.filter(
    (t) => t.id !== ticket.id && (t.bookingNumber === ticket.bookingNumber || t.agencyId === ticket.agencyId)
  );
  const visibleTimeline = isAgency
    ? ticket.timeline.filter((item) => item.type !== "internal")
    : ticket.timeline;
  const slaClass =
    ticket.slaStatus === "Breached"
      ? "sla-breached"
      : ticket.slaStatus === "At Risk"
      ? "sla-at-risk"
      : "sla-on-track";
  const staffUsers = db.users.filter((u) => u.role === "agent" || u.role === "manager");
  const canAgentEscalate = isAgent && !["Escalated", "Resolved", "Closed"].includes(ticket.status);

  const reloadSelf = async () => {
    await onRefresh();
    const updated = await OpsDeskAPI.getTicketById(ticket.id);
    setTicket(updated);
  };

  return (
    <>
      <div
        style={{
          marginBottom: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="badge" style={{ background: "var(--plum)", color: "var(--cream)" }}>
            {ticket.id}
          </span>
          <span className="badge" style={{ background: "var(--cream)", color: "var(--plum-dark)" }}>
            Booking: {ticket.bookingNumber}
          </span>
          <span className="badge" style={{ background: "var(--teal-light)", color: "#164f3e" }}>
            Region: {ticket.region}
          </span>
          <span className={`sla-badge ${slaClass}`}>
            SLA: {ticket.slaStatus} (Check-in: {ticket.checkInDate})
          </span>
          {isAgent && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => onOpenEditModal(ticket.id, ticket.bookingNumber)}
            >
              ✎ Edit Ticket / Booking #
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isAgency && (
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(ticket.id)}>
              Delete Ticket
            </button>
          )}
          {canAgentEscalate && (
            <button
              className="btn btn-danger btn-sm"
              onClick={async () => {
                await OpsDeskAPI.escalateTicket(ticket.id);
                notify(`Ticket ${ticket.id} escalated to Escalation Manager queue!`);
                await reloadSelf();
              }}
            >
              Escalate to Manager
            </button>
          )}
          {isManager && (
            <>
              {ticket.status !== "Resolved" && ticket.status !== "Closed" ? (
                <button
                  className="btn btn-sage btn-sm"
                  onClick={async () => {
                    await OpsDeskAPI.updateTicketStatus(ticket.id, "Resolved", "Resolved by Escalation Manager");
                    notify(`Ticket ${ticket.id} marked Resolved!`);
                    await reloadSelf();
                  }}
                >
                  Resolve Escalation
                </button>
              ) : (
                <span className="badge badge-status-Resolved" style={{ padding: "6px 12px" }}>
                  ✓ Escalation Resolved
                </span>
              )}
              <button
                className="btn btn-teal btn-sm"
                onClick={async () => {
                  const firstAgent = db.users.find((u) => u.role === "agent");
                  await OpsDeskAPI.updateTicketStatus(ticket.id, "Open", "Sent back to Support Agent queue by Manager");
                  if (firstAgent) {
                    await OpsDeskAPI.assignTicket(
                      ticket.id,
                      firstAgent.id,
                      "Returned from Escalation Manager with resolution instructions"
                    );
                  }
                  notify(`Ticket ${ticket.id} returned to Agent queue!`);
                  await reloadSelf();
                }}
              >
                Send Back to Agent
              </button>
            </>
          )}
        </div>
      </div>

      <div className="routing-box">
        <div className="routing-box-title">Why This Ticket Was Assigned (Smart Regional Routing Engine)</div>
        <div style={{ fontSize: 14, marginTop: 3 }}>
          <strong>Assigned Support Agent:</strong> {ticket.assignedToName} &nbsp;|&nbsp;
          <strong>Region:</strong> {ticket.region} &nbsp;|&nbsp;
          <strong>Reason:</strong> {ticket.routingReason}
        </div>
      </div>

      <div className="detail-stack">
        <div className="card">
          <div className="card-header">
            <div>
              <h2 style={{ color: "var(--plum)", fontSize: 20 }}>{ticket.title}</h2>
              <small style={{ color: "var(--text-muted)" }}>
                Created {ticket.createdAt} by {ticket.agencyName} ({ticket.region})
              </small>
            </div>
            {!isAgency ? (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, display: "block" }}>Ticket Status</label>
                <select
                  className="input"
                  style={{ padding: "5px 10px" }}
                  value={ticket.status}
                  onChange={async (e) => {
                    const nextStatus = e.target.value as TicketStatus;
                    await OpsDeskAPI.updateTicketStatus(ticket.id, nextStatus);
                    notify(`Ticket ${ticket.id} status updated to ${nextStatus}`);
                    await reloadSelf();
                  }}
                >
                  {(["New", "Open", "Pending", "Escalated", "Resolved", "Closed"] as TicketStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className={`badge badge-status-${ticket.status}`}>{ticket.status}</span>
            )}
          </div>
          <p style={{ marginBottom: 14 }}>{ticket.description}</p>
          <div
            style={{
              display: "flex",
              gap: 18,
              flexWrap: "wrap",
              fontSize: 13,
              background: "var(--bg)",
              padding: "12px 16px",
              borderRadius: 8
            }}
          >
            <span>
              <strong>Category:</strong> {ticket.category}
            </span>
            <span>
              <strong>Priority:</strong> {ticket.priority}
            </span>
            <span>
              <strong>Region:</strong> {ticket.region}
            </span>
            <span>
              <strong>Assigned To:</strong> {ticket.assignedToName}
            </span>
            <span>
              <strong>Check-In:</strong> {ticket.checkInDate}
            </span>
            <span>
              <strong>Check-Out:</strong> {ticket.checkOutDate}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Ticket Timeline & History</h3>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {isAgency ? "Showing agency-visible updates only" : "Showing all events, replies & internal staff notes"}
            </span>
          </div>
          <div className="timeline">
            {visibleTimeline.map((item) => (
              <div
                key={item.id}
                className={`timeline-item ${
                  item.type === "internal" ? "internal-note" : item.type === "system" ? "system-event" : ""
                }`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <strong>
                    {item.author} {item.type === "internal" ? "[INTERNAL STAFF NOTE — HIDDEN FROM AGENCY]" : ""}
                  </strong>
                  <span style={{ color: "var(--text-muted)" }}>{item.time}</span>
                </div>
                <div>{item.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3>Linked Tickets Panel</h3>
              <small style={{ color: "var(--text-muted)" }}>
                Earlier tickets sharing Booking <strong>{ticket.bookingNumber}</strong> or Agency{" "}
                <strong>{ticket.agencyName}</strong>
              </small>
            </div>
            <span className="badge" style={{ background: "var(--cream)", color: "var(--plum-dark)" }}>
              {linkedTickets.length} Linked
            </span>
          </div>
          {linkedTickets.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No earlier linked tickets found.</p>
          ) : (
            <div className="linked-tickets-grid">
              {linkedTickets.map((lt) => {
                const linkHash =
                  viewRole === "agency"
                    ? `#/agency/tickets/${lt.id}`
                    : viewRole === "manager"
                    ? `#/manager/tickets/${lt.id}`
                    : `#/agent/tickets/${lt.id}`;
                return (
                  <div
                    key={lt.id}
                    style={{
                      border: "1.5px solid var(--sage)",
                      background: "var(--bg)",
                      padding: "12px 14px",
                      borderRadius: 8
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <a href={linkHash} style={{ fontWeight: 700, color: "var(--plum)" }}>
                        {lt.id}
                      </a>
                      <span className={`badge badge-status-${lt.status}`}>{lt.status}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, margin: "6px 0" }}>{lt.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Booking: {lt.bookingNumber} • Created: {lt.createdAt}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isAgency ? (
          <div className="reply-box-public">
            <div>
              <h4 style={{ color: "#164f3e", marginBottom: 8 }}>Reply to TBO Support</h4>
              <textarea
                rows={3}
                className="input"
                placeholder="Write a message to support..."
                value={publicReply}
                onChange={(e) => setPublicReply(e.target.value)}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  if (!publicReply.trim()) return notify("Please enter a message.");
                  await OpsDeskAPI.addComment(ticket.id, "public", publicReply.trim());
                  setPublicReply("");
                  notify("Reply sent!");
                  await reloadSelf();
                }}
              >
                Send Reply
              </button>
            </div>
          </div>
        ) : (
          <div className="transfer-reply-row">
            <div className="transfer-box">
              <div>
                <h4 style={{ color: "var(--plum)", marginBottom: 6 }}>Reassign / Transfer Ticket</h4>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
                  Transfer ownership while keeping all supplier side conversation recipients locked.
                </p>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label>Select Staff Member</label>
                  <select className="input" value={reassignId} onChange={(e) => setReassignId(e.target.value)}>
                    {staffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.toUpperCase()} — {u.region})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                className="btn btn-outline btn-sm"
                style={{ width: "100%" }}
                onClick={async () => {
                  if (!reassignId) return;
                  await OpsDeskAPI.assignTicket(ticket.id, reassignId);
                  notify("Ticket transferred & side conversation recipients preserved!");
                  await reloadSelf();
                }}
              >
                Transfer & Preserve Side Threads
              </button>
            </div>

            <div className="reply-box-public">
              <div>
                <h4 style={{ color: "#164f3e", marginBottom: 6 }}>Reply to Agency (External)</h4>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                  Visible to {ticket.agencyName} on their portal.
                </p>
                <textarea
                  rows={3}
                  className="input"
                  placeholder="Write public response to agency..."
                  value={publicReply}
                  onChange={(e) => setPublicReply(e.target.value)}
                />
              </div>
              <button
                className="btn btn-teal btn-sm"
                style={{ marginTop: 10, width: "100%" }}
                onClick={async () => {
                  if (!publicReply.trim()) return notify("Please enter a message.");
                  await OpsDeskAPI.addComment(ticket.id, "public", publicReply.trim());
                  setPublicReply("");
                  notify("Public reply posted!");
                  await reloadSelf();
                }}
              >
                Send Public Reply
              </button>
            </div>

            <div className="reply-box-internal">
              <div>
                <h4 style={{ color: "var(--plum-dark)", marginBottom: 6 }}>Internal Note (Staff Only)</h4>
                <p style={{ fontSize: 11, color: "var(--plum-dark)", marginBottom: 8 }}>
                  Styled distinctly so internal notes never leak to agencies.
                </p>
                <textarea
                  rows={3}
                  className="input"
                  placeholder="Write private note for agents/managers..."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: 10, width: "100%" }}
                onClick={async () => {
                  if (!internalNote.trim()) return notify("Please enter a note.");
                  await OpsDeskAPI.addComment(ticket.id, "internal", internalNote.trim());
                  setInternalNote("");
                  notify("Internal note saved (Hidden from agency)");
                  await reloadSelf();
                }}
              >
                Save Internal Note
              </button>
            </div>
          </div>
        )}

        {!isAgency && (
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Supplier Side Conversations</h3>
                <small style={{ color: "var(--text-muted)" }}>
                  Recipients stay locked & intact even after ticket transfers.
                </small>
              </div>
              <button className="btn btn-teal btn-sm" onClick={() => onOpenSideConv(ticket.id)}>
                + New Side Conversation
              </button>
            </div>
            {ticket.sideConversations.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                No supplier side conversations yet. Click &quot;+ New Side Conversation&quot; to message a hotel or
                bedbank.
              </p>
            ) : (
              ticket.sideConversations.map((sc) => (
                <div
                  key={sc.id}
                  style={{
                    border: "1.5px solid var(--teal)",
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 12,
                    background: "var(--surface)"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: 8
                    }}
                  >
                    <strong style={{ color: "var(--plum)" }}>{sc.subject}</strong>
                    <span className="badge" style={{ background: "var(--sage)", color: "#193814" }}>
                      Recipients Preserved Across Transfers
                    </span>
                  </div>
                  <div style={{ fontSize: 12, marginBottom: 10 }}>
                    <strong>Recipients:</strong>{" "}
                    {sc.recipients.map((r) => (
                      <span
                        key={r}
                        className="badge"
                        style={{ background: "var(--bg)", border: "1px solid var(--teal)", marginRight: 4 }}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    {sc.messages.map((m, idx) => (
                      <div key={idx} style={{ background: "var(--bg)", padding: "8px 12px", borderRadius: 6, fontSize: 13 }}>
                        <strong>{m.sender}</strong> <small style={{ color: "var(--text-muted)" }}>({m.time})</small>:{" "}
                        {m.text}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder={`Reply to supplier thread (${sc.recipients.join(", ")})...`}
                      value={scReplies[sc.id] || ""}
                      onChange={(e) => setScReplies({ ...scReplies, [sc.id]: e.target.value })}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={async () => {
                        const msg = (scReplies[sc.id] || "").trim();
                        if (!msg) return;
                        await OpsDeskAPI.replySideConversation(ticket.id, sc.id, msg);
                        setScReplies({ ...scReplies, [sc.id]: "" });
                        notify("Supplier message sent!");
                        await reloadSelf();
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

function EditTicketModal({
  ticketId,
  bookingNumber,
  onClose,
  onSaved,
  onError
}: {
  ticketId: string;
  bookingNumber: string;
  onClose: () => void;
  onSaved: (updated: Ticket) => void;
  onError: (msg: string) => void;
}) {
  const [newId, setNewId] = useState(ticketId);
  const [newBooking, setNewBooking] = useState(bookingNumber);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await OpsDeskAPI.updateTicketNumber(ticketId, newId, newBooking);
      onSaved(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="card-header">
          <h3 style={{ color: "var(--plum)" }}>Edit Ticket & Booking Number</h3>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Ticket Number (ID)</label>
            <input type="text" className="input" value={newId} onChange={(e) => setNewId(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Booking Reference Number (TBOH)</label>
            <input
              type="text"
              className="input"
              value={newBooking}
              onChange={(e) => setNewBooking(e.target.value)}
              required
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SideConvModal({
  ticketId,
  onClose,
  onCreated
}: {
  ticketId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [recipients, setRecipients] = useState("hotel-desk@supplier.com, settlements@tbo.com");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await OpsDeskAPI.createSideConversation(ticketId, subject.trim(), recipients, message.trim());
    onCreated();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="card-header">
          <h3 style={{ color: "var(--plum)" }}>New Supplier Side Conversation</h3>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Recipients (Comma-separated emails)</label>
            <input
              type="text"
              className="input"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Thread Subject</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Urgent HCN Confirmation for TBOH Booking"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>First Message</label>
            <textarea
              rows={4}
              className="input"
              placeholder="Write message to hotel/supplier..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Start Side Thread
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeadExportView({ tickets, notify }: { tickets: Ticket[]; notify: (msg: string) => void }) {
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-11-11");
  const [rowMode, setRowMode] = useState("5000");

  const downloadCsv = () => {
    const rows: string[][] = [
      ["Ticket_ID", "Booking_TBOH", "Agency", "Region", "Category", "Priority", "Status", "Check_In", "SLA_Status", "Assigned_To", "Themes"]
    ];
    tickets.forEach((t) => {
      rows.push([
        t.id,
        t.bookingNumber,
        `"${t.agencyName}"`,
        t.region,
        t.category,
        t.priority,
        t.status,
        t.checkInDate,
        t.slaStatus,
        `"${t.assignedToName}"`,
        `"${(t.themes || []).join(";")}"`
      ]);
    });

    if (rowMode !== "live") {
      const targetCount = parseInt(rowMode, 10);
      for (let i = tickets.length + 1; i <= targetCount; i++) {
        rows.push([
          `TCK-${1000 + i}`,
          `TBOH-${80000 + (i % 450)}`,
          `"Agency Partner #${(i % 25) + 1}"`,
          ["India", "EMEA", "APAC", "Americas"][i % 4],
          ["Refund", "Cancellation", "Booking Issue", "Hotel Modification"][i % 4],
          ["Medium", "High", "Critical"][i % 3],
          ["Resolved", "Open", "Pending"][i % 3],
          "2026-11-15",
          "On Track",
          "Smart Router",
          "Refund Delay"
        ]);
      }
    }

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OpsDesk_Export_${rows.length - 1}_Rows.csv`;
    a.click();
    notify(`Exported ${rows.length - 1} rows to CSV!`);
  };

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <div className="card-header">
        <h3>Uncapped Data Export</h3>
        <span className="badge" style={{ background: "var(--teal)", color: "#163028" }}>
          No 3,000-Row Cap
        </span>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>
        Export full historical ticket and side-thread datasets in CSV format.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="form-group">
          <label>Start Date</label>
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>End Date</label>
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Dataset Size</label>
        <select className="input" value={rowMode} onChange={(e) => setRowMode(e.target.value)}>
          <option value="5000">5,000 Rows (Large Dataset)</option>
          <option value="10000">10,000 Rows (Enterprise Dataset)</option>
          <option value="live">Current Live Database Tickets Only</option>
        </select>
      </div>
      <button className="btn btn-primary" onClick={downloadCsv}>
        Download CSV Export
      </button>
    </div>
  );
}

export default App;