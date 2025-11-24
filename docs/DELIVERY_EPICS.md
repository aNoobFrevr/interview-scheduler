# Interview Scheduling System – Delivery Epics

## Epic 1: Project Setup & Foundations
- Initialize Next.js 14 with TypeScript, App Router, ESLint, and testing harness (Jest/Playwright).
- Configure environment handling (PostgreSQL, Redis URLs) and base layout shell.
- Add shared UI primitives (buttons, inputs, toasts) and global error boundary.
- Outcome: Running app skeleton with CI lint/test workflows.

## Epic 2: Data Layer & Migrations
- Define Prisma schema for Interviewer, Candidate, Coordinator, Slot, Booking, enums, and indices.
- Implement migrations and seed scripts for sample users and availability data.
- Add repository helpers for overlap detection and week-day counting.
- Outcome: Database ready with repeatable migrations and seed data.

## Epic 3: Slot Management API
- Build `/api/slots` POST handler with validation, overlap checks, and two-day-per-week enforcement.
- Add `/api/slots` GET handler with filters, pagination, and ISO timestamp handling.
- Implement slot status transitions (available ↔ booked) with audit timestamps.
- Outcome: Interviewers can create/manage availability via API respecting R1–R2.

## Epic 4: Booking & Rescheduling API
- Implement `/api/book`, `/api/reschedule`, and `/api/booking/:id` (DELETE) with role guards.
- Add rate limiting (5/min per coordinator) using Redis sliding window plus dev fallback.
- Enforce transactional locking to prevent double booking; return meaningful conflicts (409/429).
- Outcome: Coordinators can book/reschedule/cancel safely (R3, N2).

## Epic 5: Web App – Interviewer Experience
- Build interviewer dashboard: slot list with status filters, create/edit/delete forms with client-side validation.
- Integrate API calls via React Query/SWR with optimistic updates and revalidation.
- Show rule feedback for overlaps and weekly day cap; surface API errors clearly.
- Outcome: Interviewers can self-manage availability with immediate feedback.

## Epic 6: Web App – Coordinator Experience
- Build coordinator view: searchable slots table, booking modal, candidate assignment form.
- Implement calendar view showing upcoming bookings with candidate/interviewer info.
- Add cancellation/reschedule actions with confirmation flows and error handling.
- Outcome: HR coordinators can schedule and adjust interviews effectively.

## Epic 7: Realtime Updates & Notifications
- Add WebSocket/Pusher integration to broadcast `slot.updated` and `booking.updated` events after mutations.
- Wire UI caches to subscribe and refetch on events; add fallback polling when sockets unavailable.
- Optionally emit email/Slack notifications via webhooks for booking changes.
- Outcome: UI auto-refreshes on bookings/cancellations satisfying R6.

## Epic 8: Observability, Ops, and Hardening
- Add structured logging, request IDs, and metrics collection (latency, conflicts, rate-limit counts).
- Implement health/readiness endpoints and basic rate-limit/ban protections on mutations.
- Load/perf testing to validate 20k concurrent user target; document scaling playbook.
- Outcome: Production-ready posture meeting N1 with clear runbooks.
