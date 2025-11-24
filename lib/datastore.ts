import { randomUUID } from 'crypto';
import { Booking, Candidate, Coordinator, ErrorPayload, Interviewer, Role, Slot, SlotFilters } from './types';

interface CreateSlotInput {
  interviewerId: string;
  startTime: string;
  endTime: string;
  location: string;
}

interface BookInput {
  slotId: string;
  candidateId: string;
  coordinatorId: string;
}

interface RescheduleInput {
  bookingId: string;
  newSlotId: string;
  coordinatorId: string;
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

const interviewers: Interviewer[] = [
  { id: 'i-1', name: 'Amrita Singh' },
  { id: 'i-2', name: 'Leo Alvarez' },
  { id: 'i-3', name: 'Priya Patel' }
];

const coordinators: Coordinator[] = [
  { id: 'c-1', name: 'Morgan Chen' },
  { id: 'c-2', name: 'Jamie Kim' }
];

const candidates: Candidate[] = [
  { id: 'cand-1', name: 'Alex Rivers', email: 'alex@example.com' },
  { id: 'cand-2', name: 'Sofia Rossi', email: 'sofia@example.com' },
  { id: 'cand-3', name: 'Jordan Blake', email: 'jordan@example.com' }
];

let slots: Slot[] = [];
let bookings: Booking[] = [];
const rateLimit: Record<string, RateLimitState> = {};

function iso(date: Date): string {
  return date.toISOString();
}

function setInitialData() {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  slots = [
    {
      id: 's-1',
      interviewerId: 'i-1',
      startTime: iso(new Date(now.getTime() + dayMs)),
      endTime: iso(new Date(now.getTime() + dayMs + 60 * 60 * 1000)),
      location: 'Zoom',
      status: 'available',
      createdAt: iso(now),
      updatedAt: iso(now)
    },
    {
      id: 's-2',
      interviewerId: 'i-2',
      startTime: iso(new Date(now.getTime() + 2 * dayMs)),
      endTime: iso(new Date(now.getTime() + 2 * dayMs + 60 * 60 * 1000)),
      location: 'Onsite - HQ',
      status: 'available',
      createdAt: iso(now),
      updatedAt: iso(now)
    },
    {
      id: 's-3',
      interviewerId: 'i-1',
      startTime: iso(new Date(now.getTime() + 3 * dayMs + 9 * 60 * 60 * 1000)),
      endTime: iso(new Date(now.getTime() + 3 * dayMs + 10 * 60 * 60 * 1000)),
      location: 'Zoom',
      status: 'booked',
      createdAt: iso(now),
      updatedAt: iso(now)
    }
  ];

  bookings = [
    {
      id: 'b-1',
      slotId: 's-3',
      candidateId: 'cand-1',
      coordinatorId: 'c-1',
      status: 'booked',
      createdAt: iso(now),
      updatedAt: iso(now)
    }
  ];
}

setInitialData();

export function listPeople() {
  return { interviewers, coordinators, candidates };
}

export function listSlots(filters: SlotFilters = {}): Slot[] {
  const { interviewerId, status, from, to } = filters;
  return slots.filter((slot) => {
    const matchesInterviewer = interviewerId ? slot.interviewerId === interviewerId : true;
    const matchesStatus = status ? slot.status === status : true;
    const start = new Date(slot.startTime).getTime();
    const afterFrom = from ? start >= new Date(from).getTime() : true;
    const beforeTo = to ? start <= new Date(to).getTime() : true;
    return matchesInterviewer && matchesStatus && afterFrom && beforeTo;
  });
}

function getWeekKey(date: Date): string {
  const temp = new Date(date);
  temp.setUTCHours(0, 0, 0, 0);
  const day = temp.getUTCDay();
  const diff = temp.getUTCDate() - day + (day === 0 ? -6 : 1);
  temp.setUTCDate(diff);
  return temp.toISOString().slice(0, 10);
}

function detectOverlap(interviewerId: string, start: Date, end: Date, excludeSlotId?: string): boolean {
  return slots.some((slot) => {
    if (slot.interviewerId !== interviewerId) return false;
    if (excludeSlotId && slot.id === excludeSlotId) return false;
    const existingStart = new Date(slot.startTime).getTime();
    const existingEnd = new Date(slot.endTime).getTime();
    return start.getTime() < existingEnd && end.getTime() > existingStart;
  });
}

function enforceTwoDayRule(interviewerId: string, start: Date): boolean {
  const weekKey = getWeekKey(start);
  const daysThisWeek = new Set(
    slots
      .filter((slot) => slot.interviewerId === interviewerId && getWeekKey(new Date(slot.startTime)) === weekKey)
      .map((slot) => new Date(slot.startTime).toISOString().slice(0, 10))
  );
  daysThisWeek.add(start.toISOString().slice(0, 10));
  return daysThisWeek.size <= 2;
}

export function createSlot(input: CreateSlotInput): Slot | ErrorPayload {
  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { code: 'invalid_input', message: 'startTime and endTime must be valid ISO-8601 strings' };
  }
  if (start >= end) {
    return { code: 'invalid_input', message: 'startTime must be before endTime' };
  }
  if (!detectOverlap(input.interviewerId, start, end)) {
    if (!enforceTwoDayRule(input.interviewerId, start)) {
      return { code: 'two_day_limit', message: 'Interviewer can only have availability on two days per week' };
    }
  } else {
    return { code: 'overlap', message: 'Slot overlaps with an existing time window' };
  }

  const now = iso(new Date());
  const slot: Slot = {
    id: randomUUID(),
    interviewerId: input.interviewerId,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    location: input.location,
    status: 'available',
    createdAt: now,
    updatedAt: now
  };
  slots = [...slots, slot];
  return slot;
}

function findSlot(slotId: string): Slot | undefined {
  return slots.find((slot) => slot.id === slotId);
}

function updateSlot(updatedSlot: Slot) {
  slots = slots.map((slot) => (slot.id === updatedSlot.id ? updatedSlot : slot));
}

export function bookSlot(input: BookInput): Booking | ErrorPayload {
  const slot = findSlot(input.slotId);
  if (!slot) {
    return { code: 'not_found', message: 'Slot not found' };
  }
  if (slot.status !== 'available') {
    return { code: 'conflict', message: 'Slot already booked' };
  }

  const now = iso(new Date());
  const booking: Booking = {
    id: randomUUID(),
    slotId: slot.id,
    candidateId: input.candidateId,
    coordinatorId: input.coordinatorId,
    status: 'booked',
    createdAt: now,
    updatedAt: now
  };

  bookings = [...bookings, booking];
  updateSlot({ ...slot, status: 'booked', updatedAt: now });
  return booking;
}

export function rescheduleBooking(input: RescheduleInput): Booking | ErrorPayload {
  const booking = bookings.find((b) => b.id === input.bookingId);
  if (!booking) return { code: 'not_found', message: 'Booking not found' };

  const newSlot = findSlot(input.newSlotId);
  if (!newSlot) return { code: 'not_found', message: 'New slot not found' };
  if (newSlot.status !== 'available') {
    return { code: 'conflict', message: 'Target slot is not available' };
  }

  const currentSlot = findSlot(booking.slotId);
  const now = iso(new Date());
  const updatedBooking: Booking = { ...booking, slotId: newSlot.id, updatedAt: now };

  bookings = bookings.map((b) => (b.id === booking.id ? updatedBooking : b));
  updateSlot({ ...newSlot, status: 'booked', updatedAt: now });
  if (currentSlot) {
    updateSlot({ ...currentSlot, status: 'available', updatedAt: now });
  }

  return updatedBooking;
}

export function cancelBooking(bookingId: string): Booking | ErrorPayload {
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return { code: 'not_found', message: 'Booking not found' };
  if (booking.status === 'cancelled') return booking;

  const now = iso(new Date());
  const updated: Booking = { ...booking, status: 'cancelled', updatedAt: now };
  bookings = bookings.map((b) => (b.id === bookingId ? updated : b));

  const slot = findSlot(booking.slotId);
  if (slot) updateSlot({ ...slot, status: 'available', updatedAt: now });
  return updated;
}

export function listCalendar(interviewerId: string, from?: string, to?: string) {
  const interviewerBookings = bookings
    .filter((booking) => {
      const slot = findSlot(booking.slotId);
      return slot?.interviewerId === interviewerId && booking.status === 'booked';
    })
    .map((booking) => {
      const slot = findSlot(booking.slotId)!;
      const candidate = candidates.find((c) => c.id === booking.candidateId);
      return { booking, slot, candidate };
    })
    .filter(({ slot }) => {
      const start = new Date(slot.startTime).getTime();
      const afterFrom = from ? start >= new Date(from).getTime() : true;
      const beforeTo = to ? start <= new Date(to).getTime() : true;
      return afterFrom && beforeTo;
    });

  return interviewerBookings;
}

export function resetData() {
  setInitialData();
}

export function guardRole(role: Role | undefined, allowed: Role[]): ErrorPayload | undefined {
  if (!role) {
    return { code: 'unauthorized', message: 'X-User-Role header required' };
  }
  if (!allowed.includes(role)) {
    return { code: 'forbidden', message: 'Role not permitted for this action' };
  }
  return undefined;
}

export function applyRateLimit(coordinatorId: string, limit = 5, windowMs = 60_000): ErrorPayload | undefined {
  const entry = rateLimit[coordinatorId] ?? { count: 0, resetAt: Date.now() + windowMs };
  if (Date.now() > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = Date.now() + windowMs;
  }
  entry.count += 1;
  rateLimit[coordinatorId] = entry;
  if (entry.count > limit) {
    return { code: 'rate_limited', message: 'Too many booking actions, please slow down', details: { resetAt: entry.resetAt } };
  }
  return undefined;
}

export function errorResponse(payload: ErrorPayload, status = 400) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
}

export function successResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
}

export function mapStatus(payload: ErrorPayload): number {
  switch (payload.code) {
    case 'unauthorized':
      return 401;
    case 'forbidden':
      return 403;
    case 'not_found':
      return 404;
    case 'conflict':
    case 'overlap':
    case 'two_day_limit':
      return 409;
    case 'rate_limited':
      return 429;
    default:
      return 400;
  }
}

export function listDataSnapshot() {
  return { slots, bookings };
}
