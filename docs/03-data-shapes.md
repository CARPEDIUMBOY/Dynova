# Step 0.3 - Common data shapes (draft v1)

Field names are snake_case. Timestamps are ISO 8601 UTC strings. IDs are integers.

## Allowed values
- **role:** admin, manager, agent, viewer
- **ticket.status:** open, in_progress, waiting_on_supplier, escalated, resolved, closed
- **ticket.priority:** low, medium, high, urgent
- **ticket.intent:** booking_change, cancellation, refund, payment_issue, complaint, general_query
- **agent.status:** available, on_leave, at_capacity
- **sla.status:** on_track, at_risk, breached, met
- **conversation.status:** open, closed

## User
```json
{ "id": 1, "email": "shivanshu@example.com", "full_name": "Shivanshu Pandey", "role": "admin", "is_active": true }
```

## Login response
```json
{ "access_token": "<jwt>", "token_type": "bearer", "expires_in": 1800, "user": { "...User" } }
```

## Agent
```json
{ "id": 4, "user": { "...User" }, "team": "refunds", "skills": ["refund", "payment_issue"],
  "status": "available", "open_tickets": 3, "max_open_tickets": 8 }
```

## Ticket
```json
{
  "id": 101, "title": "Hotel booking cancelled by supplier", "description": "...",
  "status": "open", "priority": "high", "intent": "cancellation",
  "agency_name": "Sky Travels", "booking_number": "BK-20481", "travel_date": "2026-12-02",
  "team": "cancellations", "created_by": { "...User" }, "assignee": { "...Agent" },
  "theme": { "id": 2, "name": "Supplier cancellation", "source": "ai", "confidence": 0.87 },
  "sla": { "due_at": "2026-11-18T14:00:00Z", "status": "on_track" },
  "is_escalated": false,
  "created_at": "2026-11-18T06:00:00Z", "updated_at": "2026-11-18T06:00:00Z"
}
```
Create/update request fields: title, description, priority, intent, agency_name, booking_number, travel_date, status (update only), assignee_id (update only).

## Timeline event
```json
{ "id": 9, "ticket_id": 101, "actor": { "...User" }, "event_type": "status_changed",
  "field": "status", "old_value": "open", "new_value": "in_progress", "created_at": "2026-11-18T07:00:00Z" }
```
event_type values: created, updated, status_changed, assigned, linked, unlinked, escalated, sla_breached, conversation_opened, message_sent.

## Conversation
```json
{ "id": 7, "ticket_id": 101, "subject": "Confirm rooms with hotel", "status": "open",
  "recipients": [ { "id": 1, "type": "user", "user": { "...User" } },
                  { "id": 2, "type": "supplier", "supplier": { "id": 3, "name": "Grand Hotel", "email": "res@grand.com" } } ],
  "created_by": { "...User" }, "created_at": "2026-11-18T08:00:00Z" }
```

## Message
```json
{ "id": 55, "conversation_id": 7, "sender": { "...User" }, "body": "Please confirm 2 rooms.",
  "attachments": [ { "name": "voucher.pdf", "url": "..." } ], "created_at": "2026-11-18T08:05:00Z" }
```
