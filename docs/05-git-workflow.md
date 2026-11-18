# Step 0.5 - Repository setup

Owners: Shivanshu (backend repo/folder), Prince (frontend). One repo with `Backend/` and `Frontend/` is fine for five people.

## Create the repo
```bash
cd dynova
git init
git add .
git commit -m "Phase 0: kickoff documents"
git branch -M main
git remote add origin <your GitHub repo URL>
git push -u origin main
```

## GitHub settings
- Settings -> Branches -> protect `main`: require a pull request and at least 1 review, block direct pushes.
- Add Mansi, Sunny, Niyati, Prince as collaborators.

## Branch names
- Backend: `feat/m1-auth`, `feat/m2-sla-service`, `feat/m3-conversations`
- Frontend: `feat/fe-ticket-detail`, `feat/fe-insights`
- Fixes: `fix/<short-name>`

## Pull request rules
- One feature per PR, reviewed by at least one other person.
- Definition of done: tests for main paths, appears in /docs, standard error format, dependent person told.

## File ownership (only the owner edits)
- Shivanshu: main.py, database.py, security.py, permissions.py, ticket models and schemas
- Mansi: linking, routing, SLA, escalation services
- Sunny: conversation, insights, export services, AI adapter
- Niyati: app shell, auth screens, ticket screens
- Prince: design system, shared components, API client, chat and insights screens

## Environment
- Never commit `.env`. Share `Backend/.env.example`; each person copies it to `.env` and fills in their own PostgreSQL password.
- Create the database once: `createdb -U postgres dynova`
