# Step 0.2 - API contract list (draft v1)

Base path: `/api/v1`. Auth: `Authorization: Bearer <jwt>` on everything except login.
FastAPI's `/docs` page becomes the live version of this list.

## Rules for every endpoint
- **Pagination:** `?page=1&page_size=20` returns `{ "items": [...], "total": 0, "page": 1, "page_size": 20 }`
- **Errors:** `{ "error": { "code": "TICKET_NOT_FOUND", "message": "Ticket 12 not found", "details": null } }`
- **Codes:** 200/201 ok, 400/422 validation, 401 not logged in, 403 wrong role, 404 not found, 409 conflict, 500 server

## Endpoints

| Area | Method + path | Roles | Backend | Frontend |
|---|---|---|---|---|
| Health | GET /health | public | Shivanshu | - |
| Auth | POST /auth/login | public | Shivanshu | Niyati |
| Auth | GET /auth/me | any | Shivanshu | Niyati |
| Tickets | POST /tickets | agent, manager, admin | Shivanshu | Niyati |
| Tickets | GET /tickets (filters: status, priority, assignee, q, sort) | any | Shivanshu | Niyati |
| Tickets | GET /tickets/{ticket_id} | any | Shivanshu | Niyati |
| Tickets | PUT /tickets/{ticket_id} | agent, manager, admin | Shivanshu | Niyati |
| Timeline | GET /tickets/{ticket_id}/timeline | any | Shivanshu | Niyati |
| Linking | GET /tickets/{ticket_id}/related | any | Mansi | Niyati |
| Linking | POST /tickets/{ticket_id}/links | agent, manager, admin | Mansi | Niyati |
| Linking | DELETE /tickets/{ticket_id}/links/{link_id} | manager, admin | Mansi | Niyati |
| Assignment | POST /tickets/{ticket_id}/assign | manager, admin | Mansi | Niyati |
| Agents | GET /agents | any | Mansi | Niyati |
| Agents | PUT /agents/{agent_id}/availability | manager, admin | Mansi | Niyati |
| SLA | GET /tickets/{ticket_id}/sla | any | Mansi | Niyati |
| Escalation | POST /tickets/{ticket_id}/escalate | agent, manager, admin | Mansi | Niyati |
| Suppliers | GET, POST /suppliers; GET, PUT /suppliers/{supplier_id} | agent+ (write), any (read) | Sunny | Prince |
| Conversations | POST /tickets/{ticket_id}/conversations | agent+ | Sunny | Prince |
| Conversations | GET /tickets/{ticket_id}/conversations | any | Sunny | Prince |
| Conversations | GET /conversations/{conversation_id} | any | Sunny | Prince |
| Conversations | POST /conversations/{conversation_id}/close | agent+ | Sunny | Prince |
| Recipients | POST /conversations/{conversation_id}/recipients | agent+ | Sunny | Prince |
| Recipients | DELETE /conversations/{conversation_id}/recipients/{recipient_id} | agent+ | Sunny | Prince |
| Messages | GET, POST /conversations/{conversation_id}/messages | any (read), agent+ (write) | Sunny | Prince |
| Themes | GET, POST /themes; PUT /themes/{theme_id} | manager, admin (write) | Sunny | Prince |
| Themes | PUT /tickets/{ticket_id}/theme | agent+ | Sunny | Prince |
| AI | POST /tickets/{ticket_id}/classify | system, manager, admin | Sunny | Prince |
| Insights | GET /insights | manager, admin | Sunny | Prince |
| Reports | GET /reports; GET /reports/{report_id} | manager, admin | Sunny | Prince |
| Export | GET /export/tickets.csv, GET /export/insights.csv | manager, admin | Sunny | Prince |

"agent+" means agent, manager, admin. Viewer is read-only everywhere.
