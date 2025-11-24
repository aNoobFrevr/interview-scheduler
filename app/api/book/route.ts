import { NextRequest } from 'next/server';
import { applyRateLimit, bookSlot, errorResponse, guardRole, mapStatus, successResponse } from '@/lib/datastore';
import { bookSchema } from '@/lib/validation';
import { Role } from '@/lib/types';

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role') as Role | null;
  const guard = guardRole(role ?? undefined, ['Coordinator']);
  if (guard) return errorResponse(guard, mapStatus(guard));

  const body = await req.json();
  const parsed = bookSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse({ code: 'invalid_input', message: 'Invalid booking payload', details: parsed.error.flatten() });
  }

  const rateCheck = applyRateLimit(parsed.data.coordinatorId);
  if (rateCheck) return errorResponse(rateCheck, mapStatus(rateCheck));

  const booking = bookSlot(parsed.data);
  if ('code' in booking) {
    return errorResponse(booking, mapStatus(booking));
  }

  return successResponse(booking, { status: 201 });
}
