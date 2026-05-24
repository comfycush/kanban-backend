# Kanban Backend

Multi-tenant Kanban API built with [NestJS](https://nestjs.com). Organizations, boards, columns, cards, activity logs, S3 attachments, in-app notifications, and a BullMQ email queue.

## Features

- **Auth** — register, login, JWT bearer tokens
- **Organizations** — create orgs, invite members, role-based access (`ADMIN`, `MEMBER`)
- **Boards & columns** — CRUD, column reorder
- **Cards** — CRUD, move between columns, attachments (S3, max 20 MB)
- **Activity logs** — per org or per card
- **Notifications** — in-app list, mark read
- **Email queue** — BullMQ worker (stub; wire SMTP/SES in `EmailProcessor`)

## Tech stack

- NestJS 11, TypeScript, Prisma 7 (PostgreSQL)
- JWT auth (Passport)
- Redis + BullMQ (email jobs)
- AWS S3 (or S3-compatible storage, e.g. MinIO)
- Swagger UI at `/api`

## Prerequisites

- Node.js 20+
- Yarn
- PostgreSQL
- Redis (for BullMQ)
- S3-compatible object storage (for card attachments)

## Getting started

```bash
yarn install
```

Create a `.env` file in the project root (see [Environment variables](#environment-variables)).

Apply the database schema:

```bash
npx prisma migrate dev
# or, for local prototyping without migrations:
# npx prisma db push
```

Start the API:

```bash
yarn start:dev
```

The server listens on `http://localhost:3000` by default (`PORT` overrides).

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | JWT signing secret |
| `JWT_EXPIRES_IN` | no | Token lifetime (default `7d`) |
| `REDIS_URL` | no | Redis for BullMQ (default `redis://127.0.0.1:6379`) |
| `S3_BUCKET` | yes | S3 bucket name |
| `S3_ACCESS_KEY` | yes | S3 access key |
| `S3_SECRET_KEY` | yes | S3 secret key |
| `S3_PUBLIC_BASE_URL` | yes | Base URL for public file links (`{S3_PUBLIC_BASE_URL}/{key}`) |
| `S3_REGION` | no | AWS region (default `us-east-1`) |
| `S3_ENDPOINT` | no | Custom endpoint for MinIO / S3-compatible storage |
| `PORT` | no | HTTP port (default `3000`) |

Example:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kanban
JWT_SECRET=change-me-in-production
REDIS_URL=redis://127.0.0.1:6379
S3_BUCKET=kanban-uploads
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_ENDPOINT=http://localhost:9000
S3_PUBLIC_BASE_URL=http://localhost:9000/kanban-uploads
```

## API

### Documentation

- **Swagger UI** — [http://localhost:3000/api](http://localhost:3000/api)
- **Postman** — import [`postman/kanban-api.postman_collection.json`](postman/kanban-api.postman_collection.json)

Register or log in to obtain an `accessToken`, then send `Authorization: Bearer <token>` on protected routes.

### Response envelope

Every HTTP response uses the same shape:

```json
{
  "data": { },
  "meta": {
    "timestamp": "2026-05-21T12:00:00.000Z",
    "success": true,
    "message": "OK",
    "status": 200,
    "pagination": null
  }
}
```

List endpoints include `meta.pagination` with `page`, `limit`, `total`, and `totalPages`. Errors use the same envelope with `data: null` and `success: false`.

### Authorization

Org-scoped routes use `RolesGuard`. The server resolves the organization from path params (`orgId`, `boardId`, `columnId`, `cardId`, etc.) and checks the caller's membership role.

- **ADMIN** — create/delete boards, invite/remove members, update roles, delete org
- **MEMBER** — boards, columns, cards, activity, attachments

Use `GET /memberships/me` to list org memberships for the current user.

### Route overview

| Area | Prefix / examples |
|------|-------------------|
| Health | `GET /health` |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Memberships | `GET /memberships/me`, `GET /memberships/:orgId` |
| Organizations | `POST /orgs`, `GET /orgs`, `GET /orgs/:orgId`, members, invite, … |
| Boards | `POST/GET /orgs/:orgId/boards`, `GET/PATCH/DELETE /boards/:boardId` |
| Columns | `POST/GET /boards/:boardId/columns`, reorder, update, delete |
| Cards | `POST/GET /columns/:columnId/cards`, `GET/PATCH/DELETE /cards/:cardId`, move, attachments |
| Activity | `GET /orgs/:orgId/activity`, `GET /cards/:cardId/activity` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |

## Scripts

| Command | Description |
|---------|-------------|
| `yarn start:dev` | Dev server with watch |
| `yarn start:prod` | Run compiled build |
| `yarn build` | Compile TypeScript |
| `yarn lint` | ESLint |
| `yarn test` | Unit tests |
| `yarn test:e2e` | E2E tests |
| `yarn test:cov` | Coverage |

## Project layout

```
src/
  auth/           JWT auth, register/login
  orgs/           Organizations and members
  boards/         Boards
  columns/        Columns
  cards/          Cards and attachments
  activity-logs/  Audit trail
  notifications/  In-app notifications
  email/          BullMQ email queue
  storage/        S3 uploads
  common/         Guards, interceptors, shared utilities
prisma/schema/    Split Prisma models
postman/          Postman collection
```

## License

UNLICENSED — private project.
