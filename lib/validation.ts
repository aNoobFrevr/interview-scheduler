import { z } from 'zod';

export const slotFiltersSchema = z.object({
  interviewerId: z.string().optional(),
  status: z.enum(['available', 'booked']).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional()
});

export const createSlotSchema = z.object({
  interviewerId: z.string(),
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime({ offset: true }),
  location: z.string().min(1)
});

export const bookSchema = z.object({
  slotId: z.string(),
  candidateId: z.string(),
  coordinatorId: z.string()
});

export const rescheduleSchema = z.object({
  bookingId: z.string(),
  newSlotId: z.string(),
  coordinatorId: z.string()
});

export const cancelSchema = z.object({
  id: z.string()
});
