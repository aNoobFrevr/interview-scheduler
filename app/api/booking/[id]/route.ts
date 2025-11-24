import { NextRequest } from 'next/server';
import { cancelBooking, errorResponse, guardRole, mapStatus, successResponse } from '@/lib/datastore';
import { Role } from '@/lib/types';

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const role = _.headers.get('x-user-role') as Role | null;
  const guard = guardRole(role ?? undefined, ['Coordinator']);
  if (guard) return errorResponse(guard, mapStatus(guard));

  const cancelled = cancelBooking(params.id);
  if ('code' in cancelled) {
    return errorResponse(cancelled, mapStatus(cancelled));
  }

  return successResponse(cancelled);
}
