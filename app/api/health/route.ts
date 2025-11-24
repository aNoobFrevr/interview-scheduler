import { successResponse } from '@/lib/datastore';

export async function GET() {
  return successResponse({ status: 'ok', timestamp: new Date().toISOString() });
}
