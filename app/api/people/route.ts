import { listPeople, successResponse } from '@/lib/datastore';

export async function GET() {
  return successResponse(listPeople());
}
