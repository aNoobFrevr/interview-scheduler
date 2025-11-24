import { NextRequest } from 'next/server';
import { applyRateLimit, errorResponse, guardRole, mapStatus, rescheduleBooking, successResponse } from '@/lib/datastore';
import { rescheduleSchema } from '@/lib/validation';
import { Role } from '@/lib/types';

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role') as Role | null;
  const guard = guardRole(role ?? undefined, ['Coordinator']);
  if (guard) return errorResponse(guard, mapStatus(guard));

  const body = await req.json();
  const parsed = rescheduleSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse({ code: 'invalid_input', message: 'Invalid reschedule payload', details: parsed.error.flatten() });
  }

  const rateCheck = applyRateLimit(parsed.data.coordinatorId);
  if (rateCheck) return errorResponse(rateCheck, mapStatus(rateCheck));

  const updated = rescheduleBooking(parsed.data);
  if ('code' in updated) {
    return errorResponse(updated, mapStatus(updated));
  }

  return successResponse(updated);
}
