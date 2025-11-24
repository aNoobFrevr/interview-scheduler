import { NextRequest } from 'next/server';
import { createSlot, errorResponse, guardRole, listPeople, listSlots, mapStatus, successResponse } from '@/lib/datastore';
import { createSlotSchema, slotFiltersSchema } from '@/lib/validation';
import { Role } from '@/lib/types';

export async function GET(req: NextRequest) {
  const filters = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = slotFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return errorResponse({ code: 'invalid_input', message: 'Invalid filter parameters', details: parsed.error.flatten() });
  }

  return successResponse({ slots: listSlots(parsed.data), people: listPeople() });
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role') as Role | null;
  const guard = guardRole(role ?? undefined, ['Interviewer']);
  if (guard) return errorResponse(guard, mapStatus(guard));

  const body = await req.json();
  const parsed = createSlotSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse({ code: 'invalid_input', message: 'Invalid slot payload', details: parsed.error.flatten() });
  }

  const created = createSlot(parsed.data);
  if ('code' in created) {
    return errorResponse(created, mapStatus(created));
  }

  return successResponse(created, { status: 201 });
}
