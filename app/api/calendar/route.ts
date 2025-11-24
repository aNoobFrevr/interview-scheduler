import { NextRequest } from 'next/server';
import { errorResponse, listCalendar, mapStatus, successResponse } from '@/lib/datastore';
import { slotFiltersSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  if (!params.interviewerId) {
    return errorResponse({ code: 'invalid_input', message: 'interviewerId is required' });
  }
  const parsedFilters = slotFiltersSchema.pick({ from: true, to: true }).safeParse(params);
  if (!parsedFilters.success) {
    return errorResponse(
      { code: 'invalid_input', message: 'Invalid date range', details: parsedFilters.error.flatten() },
      mapStatus({ code: 'invalid_input', message: '' })
    );
  }

  const calendar = listCalendar(params.interviewerId, parsedFilters.data.from, parsedFilters.data.to);
  return successResponse({ calendar });
}
