# Step 0.4 - Business rules (DRAFT for Mansi and Sunny to edit and approve)

Every number below is a starting proposal. Change what is wrong, then tick approval in 00-kickoff-checklist.md.

## Ticket linking (Mansi)
1. **Booking number:** exact match on booking_number -> linked, score 1.0.
2. **Agency:** same agency_name with an open ticket created in the last 30 days -> score 0.6.
3. **Intent:** same intent and same agency within 7 days -> score 0.4.
4. Each link stores link_type, match_score and a text reason. Manual links have score null.

## Routing (Mansi)
- routing_rules map intent (or keyword) to a team, evaluated by priority_order; first match wins.
- No match -> team `general`.

## Assignment (Mansi)
- Candidates: agents of the routed team with status `available` and open_tickets < max_open_tickets.
- Pick the lowest workload; tie-break by skill match, then oldest last assignment.
- No candidate -> ticket stays unassigned and the team manager is notified.

## SLA (Mansi)
| Priority | Resolve within |
|---|---|
| urgent | 2 hours |
| high | 8 hours |
| medium | 24 hours |
| low | 72 hours |
- If travel_date is within 48 hours, the deadline is halved.
- on_track -> at_risk at 80% of time used -> breached when due_at passes. `met` when resolved in time.

## Escalation (Mansi)
- Manual: any agent or manager via the escalate endpoint, reason required.
- Automatic: SLA reaches at_risk with no agent reply, or SLA breached.
- Escalated tickets get status `escalated`, notify the team manager, and write a timeline event.

## Supplier recipients on transfer (Sunny)
- Conversations belong to the ticket, not the agent. Reassigning a ticket never removes supplier recipients.
- The old agent (a user recipient) is replaced by the new agent; supplier recipients stay unchanged.
- Closed conversations keep their recipients as a record.

## AI classifier contract (Sunny)
- Request: `{ "ticket_id": 101, "title": "...", "description": "..." }`
- Response: `{ "theme": "Supplier cancellation", "confidence": 0.87 }`
- Timeout 5 seconds. On timeout or error: store no theme, ticket creation still succeeds, retry later.
- Until a real model exists: a stub returns `{ "theme": "Uncategorised", "confidence": 0.0 }`.

## Insights and export (Sunny)
- Insights: ticket volume per day, counts per theme, SLA met/breached %, open tickets per agent.
- Weekly report: Monday 00:00 UTC, previous 7 days, stored in reports.
- CSV columns: id, title, status, priority, intent, agency_name, booking_number, team, assignee, theme, sla_status, created_at.
