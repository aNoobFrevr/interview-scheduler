export type Role = 'Interviewer' | 'Coordinator';

export interface Interviewer {
  id: string;
  name: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
}

export interface Coordinator {
  id: string;
  name: string;
}

export type SlotStatus = 'available' | 'booked';
export type BookingStatus = 'booked' | 'cancelled';

export interface Slot {
  id: string;
  interviewerId: string;
  startTime: string;
  endTime: string;
  location: string;
  status: SlotStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  slotId: string;
  candidateId: string;
  coordinatorId: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SlotFilters {
  interviewerId?: string;
  status?: SlotStatus;
  from?: string;
  to?: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}
