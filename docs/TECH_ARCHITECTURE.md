# Interview Scheduling System – Technical Architecture

## Goals and Scope
- Provide a minimal, production-ready baseline for managing interview availability, bookings, rescheduling, and cancellations.
- Serve two personas (Interviewer, HR Coordinator) via a single-page Next.js app.
- Deliver REST APIs that enforce scheduling constraints (R1–R7) and non-functional requirements (N1–N3).

## High-Level Architecture
- **Client:** Next.js 14 (App Router) with TypeScript. Client-side components for slot creation, booking, and calendar views; server actions for simple mutations. Uses SWR or React Query for data fetching with revalidation to satisfy R6.
- **API Layer:** Next.js Route Handlers under `/api` implementing the required endpoints. All handlers validate input with `zod`, enforce authorization via `X-User-Role`, and return typed error responses.
- **Database:** PostgreSQL with Prisma ORM (parameterised queries and migrations). Tables for `Interviewer`, `Slot`, `Candidate`, `Coordinator`, and `Booking` with supporting indices.
- **Caching/Real-time:**
  - HTTP caching disabled for mutation endpoints.
  - `slots` and `calendar` responses revalidated via SWR polling (5–10s) or optional WebSocket channel (Pusher-compatible adapter) to satisfy R6.
- **Rate Limiting:** Redis-based sliding window limiter keyed by `coordinatorId` for booking/rescheduling attempts (N2). Fallback in-memory limiter for local dev.
- **Deployment:** Next.js on Node 20 using Vercel/Container runtime. PostgreSQL managed service. Redis for rate limiting and pub/sub.

## Data Model
- **Interviewer** `(id, name)`
- **Candidate** `(id, name, email)`
- **Coordinator** `(id, name)`
- **Slot** `(id, interviewerId FK, startTime timestamptz, endTime timestamptz, location text, status enum[available, booked], createdAt, updatedAt)`
- **Booking** `(id, slotId FK unique, candidateId FK, coordinatorId FK, status enum[booked, cancelled], createdAt, updatedAt)`

Indexes: `(interviewerId, startTime)` on `Slot`; unique constraint on `slotId` in `Booking` to enforce one booking per slot; `(candidateId, slotId)` for quick lookups; `(interviewerId, date(startTime))` partial index to speed calendar queries.

## API Design
- **POST /api/slots**: Create slot. Validates non-overlap per interviewer (R1) by querying overlapping intervals inside a DB transaction. Enforces 2-day-per-week rule (R2) using `date_trunc('week', startTime)` and counting distinct days.
- **POST /api/book**: Books a slot inside a serializable transaction using `SELECT ... FOR UPDATE` on the target slot to prevent races (R3). Checks slot status, applies rate limit (N2), marks slot booked, inserts booking. Returns 409 on conflict.
- **POST /api/reschedule**: In transaction, rate-limit, lock current booking and new slot; verify availability and interviewer constraints; move booking to new slot and update statuses.
- **DELETE /api/booking/:id**: Marks booking cancelled and frees slot.
- **GET /api/slots**: Filter by interviewer, time window, and status. Supports pagination via `limit/offset`. Returns ISO-8601 with offsets (R4).
- **GET /api/calendar**: Returns bookings for an interviewer with candidate details; supports time window.

### Error Handling
- Standardized error shape `{ code, message, details? }` with HTTP status mapping (400 invalid input, 401/403 role mismatch, 404 not found, 409 conflict, 429 rate limit, 500 unexpected). Logs include request ID and user headers.

## Concurrency & Consistency
- All mutations executed within Prisma `$transaction` using PostgreSQL `SERIALIZABLE` or explicit row locks. Unique constraint on `Booking.slotId` plus `FOR UPDATE` prevents double booking (R3).
- Overlap detection: `WHERE interviewerId = $1 AND tstzrange(startTime, endTime) && tstzrange($2, $3)`.
- Two-day-per-week enforcement: count distinct `DATE(startTime)` grouped by week before insert; reject when limit exceeded.

## Time Zone Strategy
- All timestamps stored as `timestamptz`; client converts to interviewer-local zone for display. Input required to be ISO-8601 with offset; schema validation rejects naive timestamps (R4).

## Security & Auth
- Trust upstream auth; extract `X-User-Id` and `X-User-Role`. Role guard: Interviewers can create/manage their own slots; Coordinators can book/reschedule/cancel.
- Input validation with zod prevents injection; Prisma parameterization satisfies R5.

## Frontend Interaction Flows
- **Interviewer Dashboard:** create slot form, list of slots with status pills, edit/cancel actions. Validation prevents overlaps client-side using cached data; server re-validates.
- **Coordinator Dashboard:** available slots list with filters (interviewer, date range), booking modal, calendar view of confirmed bookings.
- **Realtime Refresh:** SWR revalidation interval plus optional WebSocket event `slot.updated` & `booking.updated` published after mutations; UI listens to update cache.

## Observability & Ops
- Structured logging (pino) with request IDs. Metrics: request latency, booking conflict rate, rate-limit counts. Alerts on 5xx surge or high conflict ratio. Health endpoint `/api/health` for liveness/readiness.

## Performance & Capacity (N1)
- Read-heavy endpoints backed by indexed queries; response caching at CDN disabled due to auth.
- Stateless API nodes scaled horizontally behind load balancer; PostgreSQL with read replicas optional for GETs. Redis handles rate-limit counters and realtime fanout.

## Testing Strategy
- Unit tests for validation and business rules (overlap detection, two-day rule, rate limiter).
- Integration tests using Next.js route handlers with a test database container.
- End-to-end tests (Playwright) for booking flows and realtime refresh behavior.
