import type { OpsDeskDB } from "./types";

export const INITIAL_OPSDESK_DATA: OpsDeskDB = {
  inviteCode: "TBO-STAFF-2026",

  users: [
    {
      id: "u-agency-1",
      role: "agency",
      agencyName: "Skyline Global Travels",
      name: "Aarav Mehta",
      email: "agency@skyline.com",
      phone: "+91 98765 43210",
      region: "India",
      password: "password123"
    },
    {
      id: "u-agency-2",
      role: "agency",
      agencyName: "EuroVista Holidays",
      name: "Clara Schmidt",
      email: "clara@eurovista.de",
      phone: "+49 30 123456",
      region: "EMEA",
      password: "password123"
    },
    {
      id: "u-agency-3",
      role: "agency",
      agencyName: "Pacific Rim Tours",
      name: "Kenji Sato",
      email: "kenji@pacificrim.jp",
      phone: "+81 3 5555 0199",
      region: "APAC",
      password: "password123"
    },
    {
      id: "u-agent-1",
      role: "agent",
      name: "Priya Sharma",
      email: "priya@tbo-ops.com",
      region: "India",
      available: true,
      password: "password123"
    },
    {
      id: "u-agent-2",
      role: "agent",
      name: "Marcus Vance",
      email: "marcus@tbo-ops.com",
      region: "EMEA",
      available: true,
      password: "password123"
    },
    {
      id: "u-agent-3",
      role: "agent",
      name: "Hana Kim",
      email: "hana@tbo-ops.com",
      region: "APAC",
      available: false,
      password: "password123"
    },
    {
      id: "u-manager-1",
      role: "manager",
      name: "Vikram Rathore",
      email: "vikram.manager@tbo-ops.com",
      region: "Global",
      password: "password123"
    },
    {
      id: "u-lead-1",
      role: "lead",
      name: "Niyati Nautiyal",
      email: "lead@tbo-ops.com",
      region: "Global",
      password: "password123"
    }
  ],

  tickets: [
    {
      id: "TCK-1001",
      title: "3rd Follow-up: Refund still not credited for cancelled Dubai hotel",
      description: "We requested a full refund on booking TBOH-88412 two weeks ago. This is our third message because the amount has still not arrived in our agency wallet.",
      bookingNumber: "TBOH-88412",
      agencyId: "u-agency-1",
      agencyName: "Skyline Global Travels",
      region: "India",
      priority: "High",
      category: "Refund",
      intent: "Refund",
      status: "Open",
      checkInDate: "2026-11-12",
      checkOutDate: "2026-11-16",
      slaStatus: "At Risk",
      assignedToId: "u-agent-1",
      assignedToName: "Priya Sharma",
      routingReason: "Matched Region (India) + High Priority Refund Skill + Agent Available",
      themes: ["Refund Delay", "Wallet Settlement"],
      createdAt: "2026-11-10 09:15",
      timeline: [
        {
          id: "tl-1",
          type: "system",
          author: "OpsDesk Smart Router",
          text: "Ticket auto-linked to TCK-0940 and TCK-0982 via Booking #TBOH-88412. Assigned to Priya Sharma (Region: India, Available).",
          time: "2026-11-10 09:15"
        },
        {
          id: "tl-2",
          type: "public",
          author: "Aarav Mehta (Skyline Global Travels)",
          text: "Please check our two earlier tickets on TBOH-88412. The guest is asking for immediate confirmation.",
          time: "2026-11-10 09:17"
        },
        {
          id: "tl-3",
          type: "internal",
          author: "Priya Sharma (Support Agent)",
          text: "INTERNAL NOTE: Checked payment gateway logs. Supplier approved refund yesterday; finance batch release pending.",
          time: "2026-11-10 10:05"
        }
      ],
      sideConversations: [
        {
          id: "sc-1",
          subject: "Verify Refund Credit Ref — Booking TBOH-88412",
          recipients: ["billing@atlantis-supplier.ae", "settlements@tbo.com"],
          preservedOnTransfer: true,
          messages: [
            {
              sender: "Priya Sharma",
              text: "Hi Supplier Finance, please share the ARN/refund reference number for TBOH-88412.",
              time: "2026-11-10 09:45"
            },
            {
              sender: "billing@atlantis-supplier.ae",
              text: "Refund ARN #99481200 released from hotel desk. TBO ledger can credit agency.",
              time: "2026-11-10 10:00"
            }
          ]
        }
      ]
    },
    {
      id: "TCK-0982",
      title: "2nd Inquiry: Status of refund for booking TBOH-88412",
      description: "Following up on our earlier cancellation request for TBOH-88412. When will the refund reflect?",
      bookingNumber: "TBOH-88412",
      agencyId: "u-agency-1",
      agencyName: "Skyline Global Travels",
      region: "India",
      priority: "Medium",
      category: "Refund",
      intent: "Refund",
      status: "Pending",
      checkInDate: "2026-11-12",
      checkOutDate: "2026-11-16",
      slaStatus: "On Track",
      assignedToId: "u-agent-1",
      assignedToName: "Priya Sharma",
      routingReason: "Matched Region (India) + Existing Booking Context Owner",
      themes: ["Refund Delay"],
      createdAt: "2026-11-05 14:20",
      timeline: [
        {
          id: "tl-201",
          type: "public",
          author: "Aarav Mehta (Skyline Global Travels)",
          text: "Checking again on TBOH-88412 refund timeline.",
          time: "2026-11-05 14:20"
        }
      ],
      sideConversations: []
    },
    {
      id: "TCK-0940",
      title: "Initial Cancellation & Refund Request — TBOH-88412",
      description: "Guest medical emergency. Please cancel TBOH-88412 and process waiver refund.",
      bookingNumber: "TBOH-88412",
      agencyId: "u-agency-1",
      agencyName: "Skyline Global Travels",
      region: "India",
      priority: "Medium",
      category: "Cancellation",
      intent: "Cancellation",
      status: "Resolved",
      checkInDate: "2026-11-12",
      checkOutDate: "2026-11-16",
      slaStatus: "On Track",
      assignedToId: "u-agent-1",
      assignedToName: "Priya Sharma",
      routingReason: "Matched Region (India) + Agent Availability",
      themes: ["Cancellation Waiver"],
      createdAt: "2026-11-01 11:00",
      timeline: [
        {
          id: "tl-301",
          type: "system",
          author: "OpsDesk",
          text: "Cancellation confirmed with hotel. Refund initiated.",
          time: "2026-11-02 16:00"
        }
      ],
      sideConversations: []
    },
    {
      id: "TCK-1004",
      title: "URGENT: Guest checking in tomorrow — Hotel says voucher not found!",
      description: "Guest arrives tomorrow morning in Paris under booking TBOH-99201. Front desk says TBO voucher is missing from their reservation system.",
      bookingNumber: "TBOH-99201",
      agencyId: "u-agency-2",
      agencyName: "EuroVista Holidays",
      region: "EMEA",
      priority: "Critical",
      category: "Booking Issue",
      intent: "Voucher Not Found",
      status: "Escalated",
      checkInDate: "2026-11-11",
      checkOutDate: "2026-11-15",
      slaStatus: "Breached",
      assignedToId: "u-manager-1",
      assignedToName: "Vikram Rathore (Escalation Manager)",
      routingReason: "Check-in within 24h (Travel-Aware SLA) + Transferred from Hana Kim to Marcus Vance -> Escalated to Manager",
      themes: ["Supplier Voucher Sync", "Urgent Check-in"],
      createdAt: "2026-11-10 07:30",
      timeline: [
        {
          id: "tl-401",
          type: "system",
          author: "OpsDesk Smart Router",
          text: "Deadline set to 2 hours because check-in is within 24 hours (2026-11-11).",
          time: "2026-11-10 07:30"
        },
        {
          id: "tl-402",
          type: "system",
          author: "Marcus Vance",
          text: "Ticket transferred from Hana Kim to Marcus Vance. Side conversation recipients locked & preserved.",
          time: "2026-11-10 08:15"
        },
        {
          id: "tl-403",
          type: "internal",
          author: "Marcus Vance",
          text: "INTERNAL NOTE: Hotel bedbank API timed out. Escalating to Vikram Rathore for instant manual reissue.",
          time: "2026-11-10 09:00"
        },
        {
          id: "tl-404",
          type: "system",
          author: "Marcus Vance",
          text: "Escalated to Escalation Manager (Vikram Rathore) due to imminent guest check-in.",
          time: "2026-11-10 09:02"
        }
      ],
      sideConversations: [
        {
          id: "sc-2",
          subject: "IMMEDIATE VOUCHER SYNC — TBOH-99201 (Pullman Paris)",
          recipients: ["reservations@pullman-paris.fr", "emea-bedbank@supplier.com"],
          preservedOnTransfer: true,
          messages: [
            {
              sender: "Hana Kim",
              text: "Please confirm guest HCN for TBOH-99201 checking in Nov 11.",
              time: "2026-11-10 07:45"
            },
            {
              sender: "Marcus Vance (Post-Transfer)",
              text: "Following up on this same thread (recipients preserved after transfer). Please send HCN urgently.",
              time: "2026-11-10 08:20"
            }
          ]
        }
      ]
    },
    {
      id: "TCK-1008",
      title: "Name correction needed on Tokyo hotel voucher before Friday check-in",
      description: "Passenger passport spelling is TAKAHASHI, voucher shows TAKAHASI on booking TBOH-77310.",
      bookingNumber: "TBOH-77310",
      agencyId: "u-agency-3",
      agencyName: "Pacific Rim Tours",
      region: "APAC",
      priority: "High",
      category: "Hotel Modification",
      intent: "Modification",
      status: "New",
      checkInDate: "2026-11-13",
      checkOutDate: "2026-11-18",
      slaStatus: "At Risk",
      assignedToId: null,
      assignedToName: "Unassigned",
      routingReason: "Pending Queue Assignment — Region APAC Agent (Hana Kim) currently marked Unavailable",
      themes: ["Name Change", "Supplier Voucher Sync"],
      createdAt: "2026-11-10 11:10",
      timeline: [
        {
          id: "tl-501",
          type: "system",
          author: "OpsDesk Smart Router",
          text: "Ticket queued in Unassigned Pool because primary APAC agent is offline. Flagged 'At Risk' due to check-in in 48h.",
          time: "2026-11-10 11:10"
        }
      ],
      sideConversations: []
    },
    {
      id: "TCK-1009",
      title: "Overbooked Resort in Bali — Guest at lobby needing relocation",
      description: "Booking TBOH-66104 at Nusa Dua Resort is overbooked. Need immediate upgrade relocation approval.",
      bookingNumber: "TBOH-66104",
      agencyId: "u-agency-3",
      agencyName: "Pacific Rim Tours",
      region: "APAC",
      priority: "Critical",
      category: "Booking Issue",
      intent: "Relocation",
      status: "Escalated",
      checkInDate: "2026-11-11",
      checkOutDate: "2026-11-14",
      slaStatus: "At Risk",
      assignedToId: "u-manager-1",
      assignedToName: "Vikram Rathore (Escalation Manager)",
      routingReason: "Auto-Escalated: Guest Check-in Today + Critical Overbooking Intent",
      themes: ["Urgent Check-in", "Hotel Overbooking"],
      createdAt: "2026-11-10 11:30",
      timeline: [
        {
          id: "tl-601",
          type: "system",
          author: "OpsDesk Smart Router",
          text: "Critical check-in date detected. Routed to Escalation Queue.",
          time: "2026-11-10 11:30"
        }
      ],
      sideConversations: []
    }
  ]
};